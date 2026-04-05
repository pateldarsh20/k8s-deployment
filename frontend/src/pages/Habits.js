import React, { useState, useEffect } from 'react';
import { habitsAPI } from '../services/api';

function Habits() {
  const [habits, setHabits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'binary',
    color: '#4CAF50',
    schedule: { type: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }
  });

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const response = await habitsAPI.getAll();
      setHabits(response.data.data);
    } catch (err) {
      console.error('Failed to load habits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await habitsAPI.create(formData);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        type: 'binary',
        color: '#4CAF50',
        schedule: { type: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }
      });
      loadHabits();
    } catch (err) {
      console.error('Failed to create habit:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await habitsAPI.delete(id);
      loadHabits();
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const handlePause = async (id) => {
    try {
      await habitsAPI.pause(id);
      loadHabits();
    } catch (err) {
      console.error('Failed to pause habit:', err);
    }
  };

  const handleResume = async (id) => {
    try {
      await habitsAPI.resume(id);
      loadHabits();
    } catch (err) {
      console.error('Failed to resume habit:', err);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2>My Habits</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Habit'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-title">Create New Habit</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Morning Meditation"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="2"
                placeholder="Optional description"
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                className="form-control"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="binary">Yes/No (Binary)</option>
                <option value="count">Count (e.g., glasses of water)</option>
                <option value="time">Time-based (e.g., minutes exercised)</option>
                <option value="negative">Avoid (e.g., no social media)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Schedule</label>
              <select
                className="form-control"
                value={formData.schedule.type}
                onChange={(e) => setFormData({
                  ...formData,
                  schedule: { ...formData.schedule, type: e.target.value }
                })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (specific days)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                className="form-control"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{ width: '60px', padding: '0.25rem' }}
              />
            </div>

            <button type="submit" className="btn btn-primary">Create Habit</button>
          </form>
        </div>
      )}

      <div className="habit-list">
        {habits.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center', color: '#757575' }}>
              No habits yet. Create your first one!
            </p>
          </div>
        ) : (
          habits.map(habit => (
            <div key={habit._id} className="habit-item">
              <div className="habit-info">
                <div className="habit-color" style={{ background: habit.color }}></div>
                <div>
                  <div className="habit-name">{habit.name}</div>
                  <div className="habit-type">
                    {habit.type} • {habit.schedule.type}
                    {habit.status === 'paused' && ' • Paused'}
                  </div>
                </div>
              </div>
              <div className="habit-actions">
                {habit.status === 'active' ? (
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePause(habit._id)}>
                    Pause
                  </button>
                ) : habit.status === 'paused' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => handleResume(habit._id)}>
                    Resume
                  </button>
                ) : null}
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(habit._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Habits;
