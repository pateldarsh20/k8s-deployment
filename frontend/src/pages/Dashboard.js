import React, { useState, useEffect } from 'react';
import { habitsAPI, trackingAPI, analyticsAPI } from '../services/api';

function Dashboard() {
  const [habits, setHabits] = useState([]);
  const [todayRecords, setTodayRecords] = useState({});
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [habitsRes, recordsRes, insightsRes] = await Promise.all([
        habitsAPI.getToday(),
        trackingAPI.getToday(),
        analyticsAPI.getInsights({ days: 7 })
      ]);

      setHabits(habitsRes.data.data);
      setTodayRecords(recordsRes.data.data);
      setInsights(insightsRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId) => {
    const isCompleted = todayRecords[habitId]?.completed;
    
    try {
      await trackingAPI.log({
        habitId,
        completed: !isCompleted
      });
      loadData(); // Reload data
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{habits.length}</div>
          <div className="stat-label">Today's Habits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {Object.values(todayRecords).filter(r => r.completed).length}
          </div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {insights?.overallCompletionRate || 0}%
          </div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {insights?.currentConsistencyStreak || 0}
          </div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Today's Habits</h3>
        {habits.length === 0 ? (
          <p>No habits scheduled for today. <a href="/habits">Create one</a></p>
        ) : (
          <div className="habit-list">
            {habits.map(habit => (
              <div key={habit._id} className="habit-item">
                <div className="habit-info">
                  <div className="habit-color" style={{ background: habit.color }}></div>
                  <div>
                    <div className="habit-name">{habit.name}</div>
                    <div className="habit-type">{habit.type}</div>
                  </div>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!todayRecords[habit._id]?.completed}
                    onChange={() => toggleHabit(habit._id)}
                  />
                  Done
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {insights?.insights?.length > 0 && (
        <div className="card">
          <h3 className="card-title">Insights</h3>
          <ul>
            {insights.insights.map((insight, index) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
