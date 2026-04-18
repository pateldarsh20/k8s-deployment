import React, { useState, useEffect } from 'react';
import { habitsAPI, trackingAPI, analyticsAPI } from '../services/api';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [habits, setHabits] = useState([]);
  const [todayRecords, setTodayRecords] = useState({});
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});

  useEffect(() => { loadData(); }, []);

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
    setToggling(prev => ({ ...prev, [habitId]: true }));
    const isCompleted = todayRecords[habitId]?.completed;
    try {
      await trackingAPI.log({ habitId, completed: !isCompleted });
      await loadData();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    } finally {
      setToggling(prev => ({ ...prev, [habitId]: false }));
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /><span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading your habits...</span></div>;
  }

  const completedCount = Object.values(todayRecords).filter(r => r.completed).length;
  const completionPct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Today's Dashboard</h2>
          <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        {completionPct === 100 && habits.length > 0 && (
          <div className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            🎉 All done today!
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📋</span>
          <div className="stat-value">{habits.length}</div>
          <div className="stat-label">Today's Habits</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-value">{insights?.overallCompletionRate || 0}%</div>
          <div className="stat-label">Weekly Rate</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${insights?.overallCompletionRate || 0}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div className="stat-value">{insights?.currentConsistencyStreak || 0}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>

      {/* Today's progress bar */}
      {habits.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>Today's Progress</h3>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>
              {completionPct}%
            </span>
          </div>
          <div className="progress-bar" style={{ height: '8px' }}>
            <div className="progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {completedCount} of {habits.length} habits completed
          </p>
        </div>
      )}

      {/* Habit Checklist */}
      <div className="card">
        <h3 className="card-title">Today's Habits</h3>
        {habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌱</div>
            <div className="empty-state-title">No habits yet</div>
            <p className="empty-state-text">Create your first habit to start tracking</p>
            <Link to="/habits" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
              + Add Habit
            </Link>
          </div>
        ) : (
          <div className="habit-list">
            {habits.map(habit => {
              const done = !!todayRecords[habit._id]?.completed;
              return (
                <div
                  key={habit._id}
                  className={`habit-item ${done ? 'completed' : ''}`}
                  style={{ '--habit-color': habit.color }}
                  onClick={() => toggleHabit(habit._id)}
                >
                  <div className="habit-info">
                    <div className="habit-color" style={{ background: habit.color, color: habit.color }} />
                    <div>
                      <div className="habit-name" style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>
                        {habit.name}
                      </div>
                      <div className="habit-type">{habit.type}</div>
                    </div>
                  </div>
                  <label className="checkbox" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleHabit(habit._id)}
                      disabled={toggling[habit._id]}
                    />
                    <div className="checkbox-ui">
                      <svg width="12" height="10" viewBox="0 0 12 10">
                        <polyline className="checkbox-check" points="1.5,5 4.5,8 10.5,1" />
                      </svg>
                    </div>
                    <span className="checkbox-label">{done ? 'Done' : 'Mark done'}</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insights */}
      {insights?.insights?.length > 0 && (
        <div className="card">
          <h3 className="card-title">✦ Insights</h3>
          <div className="insights-list">
            {insights.insights.map((insight, i) => (
              <div key={i} className="insight-item" style={{ animationDelay: `${i * 0.06}s` }}>
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
