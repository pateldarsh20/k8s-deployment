const mongoose = require('mongoose');
const DailySummary = require('../models/DailySummary');
const { AppError, asyncHandler } = require('../../shared/utils/errorHandler');
const mq = require('../../shared/utils/messageQueue');

/**
 * Analytics Controller
 * Generates insights: completion rates, trends, heatmaps, best days
 */

/**
 * GET /api/analytics/completion-rate
 * Get completion rate for a date range
 */
const getCompletionRate = asyncHandler(async (req, res) => {
  const { startDate, endDate, habitId } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate ? new Date(endDate) : new Date();

  const filter = {
    userId: req.user.userId,
    date: { $gte: start, $lte: end }
  };

  if (habitId) {
    filter.habitId = new mongoose.Types.ObjectId(habitId);
  }

  const summaries = await DailySummary.find(filter).sort({ date: 1 });

  const totalDue = summaries.reduce((sum, s) => sum + s.habitsDue, 0);
  const totalCompleted = summaries.reduce((sum, s) => sum + s.habitsCompleted, 0);
  const avgCompletionRate = totalDue > 0 ? (totalCompleted / totalDue * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: {
      period: { start, end },
      totalDays: summaries.length,
      habitsDue: totalDue,
      habitsCompleted: totalCompleted,
      completionRate: parseFloat(avgCompletionRate),
      dailyBreakdown: summaries.map(s => ({
        date: s.date,
        due: s.habitsDue,
        completed: s.habitsCompleted,
        rate: s.completionRate
      }))
    }
  });
});

/**
 * GET /api/analytics/trends
 * Get trend data over time
 */
const getTrends = asyncHandler(async (req, res) => {
  const { days = 30, habitId } = req.query;
  const userId = new mongoose.Types.ObjectId(req.user.userId);

  const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const matchFilter = { userId, date: { $gte: startDate } };

  const trends = await DailySummary.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        },
        date: { $first: '$date' },
        totalDue: { $sum: '$habitsDue' },
        totalCompleted: { $sum: '$habitsCompleted' },
        avgCompletionRate: { $avg: '$completionRate' }
      }
    },
    { $sort: { date: 1 } }
  ]);

  // Calculate trend direction
  let trendDirection = 'stable';
  if (trends.length >= 2) {
    const recent = trends.slice(-7); // Last 7 days
    const older = trends.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recent.reduce((s, t) => s + t.avgCompletionRate, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((s, t) => s + t.avgCompletionRate, 0) / older.length : 0;
    
    const diff = recentAvg - olderAvg;
    if (diff > 5) trendDirection = 'improving';
    else if (diff < -5) trendDirection = 'declining';
  }

  res.json({
    success: true,
    data: {
      trendDirection,
      period: { days: parseInt(days) },
      dataPoints: trends
    }
  });
});

/**
 * GET /api/analytics/heatmap
 * Get heatmap data for calendar view
 */
const getHeatmap = asyncHandler(async (req, res) => {
  const { months = 3 } = req.query;
  const userId = req.user.userId;

  const startDate = new Date(Date.now() - parseInt(months) * 30 * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const summaries = await DailySummary.find({
    userId,
    date: { $gte: startDate }
  }).sort({ date: 1 });

  // Transform to heatmap format
  const heatmapData = summaries.map(s => ({
    date: s.date.toISOString().split('T')[0],
    count: s.habitsCompleted,
    total: s.habitsDue,
    rate: s.completionRate,
    intensity: getHeatmapIntensity(s.completionRate)
  }));

  res.json({
    success: true,
    data: {
      startDate,
      endDate: new Date(),
      entries: heatmapData
    }
  });
});

/**
 * GET /api/analytics/best-days
 * Get best performing days of the week
 */
const getBestDays = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.userId);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const dayStats = await DailySummary.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$dayOfWeek',
        totalDays: { $sum: 1 },
        avgCompletionRate: { $avg: '$completionRate' },
        totalCompleted: { $sum: '$habitsCompleted' },
        totalDue: { $sum: '$habitsDue' }
      }
    },
    { $sort: { avgCompletionRate: -1 } }
  ]);

  // Format results
  const formatted = dayStats.map(d => ({
    day: dayNames[d._id],
    dayOfWeek: d._id,
    totalDays: d.totalDays,
    avgCompletionRate: d.avgCompletionRate.toFixed(1),
    totalCompleted: d.totalCompleted,
    totalDue: d.totalDue
  }));

  // Find best and worst days
  const bestDay = formatted.length > 0 ? formatted[0] : null;
  const worstDay = formatted.length > 0 ? formatted[formatted.length - 1] : null;

  res.json({
    success: true,
    data: {
      bestDay,
      worstDay,
      allDays: formatted
    }
  });
});

/**
 * GET /api/analytics/insights
 * Get comprehensive insights summary
 */
const getInsights = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const summaries = await DailySummary.find({
    userId,
    date: { $gte: startDate }
  }).sort({ date: 1 });

  if (summaries.length === 0) {
    return res.json({
      success: true,
      data: {
        message: 'No data available yet. Start logging your habits!',
        totalDays: 0
      }
    });
  }

  // Calculate overall stats
  const totalDue = summaries.reduce((s, d) => s + d.habitsDue, 0);
  const totalCompleted = summaries.reduce((s, d) => s + d.habitsCompleted, 0);
  const overallRate = totalDue > 0 ? (totalCompleted / totalDue * 100).toFixed(1) : 0;

  // Best day
  const dayRates = {};
  summaries.forEach(s => {
    const day = s.dayOfWeek;
    if (!dayRates[day]) dayRates[day] = { total: 0, count: 0 };
    dayRates[day].total += s.completionRate;
    dayRates[day].count += 1;
  });

  let bestDay = 0;
  let bestDayRate = 0;
  Object.entries(dayRates).forEach(([day, data]) => {
    const avg = data.total / data.count;
    if (avg > bestDayRate) {
      bestDay = parseInt(day);
      bestDayRate = avg;
    }
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Consistency streak (consecutive days with > 50% completion)
  let currentStreak = 0;
  for (let i = summaries.length - 1; i >= 0; i--) {
    if (summaries[i].completionRate >= 50) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Generate personalized insights
  const insights = generateInsights(summaries, overallRate, bestDay, dayNames);

  res.json({
    success: true,
    data: {
      period: { days, startDate, endDate: new Date() },
      totalDays: summaries.length,
      overallCompletionRate: parseFloat(overallRate),
      currentConsistencyStreak: currentStreak,
      bestDay: {
        name: dayNames[bestDay],
        avgRate: bestDayRate.toFixed(1)
      },
      insights
    }
  });
});

/**
 * GET /api/analytics/weekly-report
 * Generate weekly summary report
 */
const getWeeklyReport = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Get last 7 days
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const summaries = await DailySummary.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const totalDue = summaries.reduce((s, d) => s + d.habitsDue, 0);
  const totalCompleted = summaries.reduce((s, d) => s + d.habitsCompleted, 0);
  const weekRate = totalDue > 0 ? (totalCompleted / totalDue * 100).toFixed(1) : 0;

  // Week over week comparison
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - 6);

  const prevSummaries = await DailySummary.find({
    userId,
    date: { $gte: prevStartDate, $lte: prevEndDate }
  });

  const prevTotalDue = prevSummaries.reduce((s, d) => s + d.habitsDue, 0);
  const prevTotalCompleted = prevSummaries.reduce((s, d) => s + d.habitsCompleted, 0);
  const prevWeekRate = prevTotalDue > 0 ? (prevTotalCompleted / prevTotalDue * 100).toFixed(1) : 0;

  const weekOverWeekChange = parseFloat(weekRate) - parseFloat(prevWeekRate);

  res.json({
    success: true,
    data: {
      week: {
        start: startDate,
        end: endDate,
        totalDue,
        totalCompleted,
        completionRate: parseFloat(weekRate)
      },
      previousWeek: {
        completionRate: parseFloat(prevWeekRate)
      },
      weekOverWeek: {
        change: parseFloat(weekOverWeekChange),
        direction: weekOverWeekChange > 0 ? 'improved' : weekOverWeekChange < 0 ? 'declined' : 'same'
      },
      dailyBreakdown: summaries.map(s => ({
        date: s.date,
        due: s.habitsDue,
        completed: s.habitsCompleted,
        rate: s.completionRate
      }))
    }
  });
});

/**
 * Helper: Generate personalized insights
 */
function generateInsights(summaries, overallRate, bestDay, dayNames) {
  const insights = [];
  const rate = parseFloat(overallRate);

  if (summaries.length < 3) {
    insights.push('Keep logging your habits! More data will unlock personalized insights.');
    return insights;
  }

  if (rate >= 80) {
    insights.push(`Amazing! You're completing ${rate}% of your habits. Keep it up!`);
  } else if (rate >= 50) {
    insights.push(`Good progress at ${rate}% completion. Try to push for 80%!`);
  } else {
    insights.push(`Your completion rate is ${rate}%. Consider starting with fewer habits to build consistency.`);
  }

  insights.push(`${dayNames[bestDay]} is your most productive day. Schedule important habits on this day.`);

  // Check weekend vs weekday performance
  let weekendRate = 0, weekdayRate = 0;
  let weekendCount = 0, weekdayCount = 0;

  summaries.forEach(s => {
    if (s.dayOfWeek === 0 || s.dayOfWeek === 6) {
      weekendRate += s.completionRate;
      weekendCount++;
    } else {
      weekdayRate += s.completionRate;
      weekdayCount++;
    }
  });

  if (weekendCount > 0 && weekdayCount > 0) {
    weekendRate /= weekendCount;
    weekdayRate /= weekdayCount;

    if (weekdayRate > weekendRate + 10) {
      insights.push('You perform better on weekdays. Try setting weekend-specific goals.');
    } else if (weekendRate > weekdayRate + 10) {
      insights.push('You\'re more consistent on weekends! Try to maintain this energy during the week.');
    }
  }

  return insights;
}

/**
 * Helper: Get heatmap intensity (0-4)
 */
function getHeatmapIntensity(completionRate) {
  if (completionRate >= 80) return 4;
  if (completionRate >= 60) return 3;
  if (completionRate >= 40) return 2;
  if (completionRate >= 20) return 1;
  return 0;
}

module.exports = {
  getCompletionRate,
  getTrends,
  getHeatmap,
  getBestDays,
  getInsights,
  getWeeklyReport
};
