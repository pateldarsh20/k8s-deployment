const DailySummary = require('../models/DailySummary');
const mq = require('../../shared/utils/messageQueue');

/**
 * Analytics Event Consumer
 * Processes events from the message queue and updates analytics
 */

/**
 * Set up message queue consumers for analytics events
 */
const setupConsumers = async () => {
  // Consume habit logged events
  await mq.consume('analytics', async (message) => {
    console.log('Processing analytics event:', message.type);

    switch (message.type) {
      case 'habit_logged':
        await handleHabitLogged(message);
        break;
      case 'habit_created':
        await handleHabitCreated(message);
        break;
      case 'habit_deleted':
        await handleHabitDeleted(message);
        break;
      default:
        console.log('Unknown analytics event type:', message.type);
    }
  });
};

/**
 * Handle habit logged event - update daily summary
 */
async function handleHabitLogged(message) {
  const { userId, habitId, date, completed } = message;

  const recordDate = new Date(date);
  recordDate.setHours(0, 0, 0, 0);

  console.log(`  → Updating summary: userId=${userId}, date=${recordDate.toISOString()}, completed=${completed}`);

  // Atomic upsert: find or create, then increment
  const summary = await DailySummary.findOneAndUpdate(
    { userId, date: recordDate },
    {
      $inc: {
        habitsDue: 1,
        habitsCompleted: completed ? 1 : 0
      },
      $setOnInsert: {
        dayOfWeek: recordDate.getDay()
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  // Recalculate completion rate
  if (summary.habitsDue > 0) {
    summary.completionRate = (summary.habitsCompleted / summary.habitsDue) * 100;
    await summary.save();
    console.log(`  ✓ Saved: due=${summary.habitsDue}, completed=${summary.habitsCompleted}, rate=${summary.completionRate.toFixed(1)}%`);
  }
}

/**
 * Handle habit created event
 */
async function handleHabitCreated(message) {
  console.log(`Habit created for user ${message.userId}, type: ${message.habitType}`);
  // Could trigger recalculating habits due for future days
}

/**
 * Handle habit deleted event
 */
async function handleHabitDeleted(message) {
  console.log(`Habit deleted for user ${message.userId}`);
  // Could clean up related analytics data if needed
}

module.exports = {
  setupConsumers
};
