import React, { useState, useEffect, useRef } from 'react';
import { habitsAPI } from '../services/api';

const HABIT_TYPES = [
  { value: 'binary',   label: 'Yes / No', desc: 'Did you do it?', icon: '✓' },
  { value: 'count',    label: 'Count',    desc: 'How many times?', icon: '#' },
  { value: 'time',     label: 'Duration', desc: 'How long?', icon: '⏱' },
  { value: 'negative', label: 'Avoid',    desc: 'Break the habit', icon: '✗' },
];

const PRESET_COLORS = ['#00C896', '#7C5CFC', '#FF4757', '#FFB444', '#00B4D8', '#F72585', '#4CC9F0', '#FB8500'];

function Habits() {
  const [habits, setHabits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const colorInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '', description: '', type: 'binary', color: '#00C896',
    schedule: { type: 'daily', daysOfWeek: [0,1,2,3,4,5,6] }
  });

  useEffect(() => { loadHabits(); }, []);

  const loadHabits = async () => {
    try {
      const res = await habitsAPI.getAll();
      setHabits(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await habitsAPI.create(formData);
      setShowForm(false);
      setFormData({ name: '', description: '', type: 'binary', color: '#00C896', schedule: { type: 'daily', daysOfWeek: [0,1,2,3,4,5,6] } });
      loadHabits();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit? This cannot be undone.')) return;
    try { await habitsAPI.delete(id); loadHabits(); } catch (err) { console.error(err); }
  };

  const handlePause  = async (id) => { try { await habitsAPI.pause(id);  loadHabits(); } catch (err) { console.error(err); } };
  const handleResume = async (id) => { try { await habitsAPI.resume(id); loadHabits(); } catch (err) { console.error(err); } };

  if (loading) {
    return <div className="loading"><div className="spinner" /><span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading habits...</span></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">My Habits</h2>
          <p className="page-subtitle">{habits.length} habit{habits.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ New Habit'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{ borderColor: 'rgba(0,200,150,0.2)', animation: 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <h3 className="card-title">Create New Habit</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Habit Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Morning Meditation"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <textarea
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="2"
                placeholder="What does success look like?"
              />
            </div>

            {/* Habit Type */}
            <div className="form-group">
              <label>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {HABIT_TYPES.map(t => (
                  <div
                    key={t.value}
                    onClick={() => setFormData({ ...formData, type: t.value })}
                    style={{
                      padding: '0.75rem',
                      border: `1px solid ${formData.type === t.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: formData.type === t.value ? 'rgba(0,200,150,0.08)' : 'var(--bg-elevated)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{t.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: formData.type === t.value ? 'var(--primary)' : 'var(--text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-row">
              {/* Schedule */}
              <div className="form-group">
                <label>Schedule</label>
                <select
                  className="form-control"
                  value={formData.schedule.type}
                  onChange={(e) => setFormData({ ...formData, schedule: { ...formData.schedule, type: e.target.value } })}
                >
                  <option value="daily">Every Day</option>
                  <option value="weekly">Specific Days</option>
                </select>
              </div>

              {/* Color */}
              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {PRESET_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setFormData({ ...formData, color: c })}
                      style={{
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: c,
                        cursor: 'pointer',
                        border: formData.color === c ? '2px solid white' : '2px solid transparent',
                        boxShadow: formData.color === c ? `0 0 12px ${c}` : 'none',
                        transition: 'all 0.2s',
                        transform: formData.color === c ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                      cursor: 'pointer',
                      border: '2px solid var(--border)',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onClick={() => colorInputRef.current?.click()}
                  >
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating...</>
              ) : '+ Create Habit'}
            </button>
          </form>
        </div>
      )}

      {/* Habit List */}
      <div className="habit-list">
        {habits.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🌱</div>
              <div className="empty-state-title">No habits yet</div>
              <p className="empty-state-text">Create your first habit to get started on your journey</p>
            </div>
          </div>
        ) : (
          habits.map((habit, i) => (
            <div
              key={habit._id}
              className="habit-item"
              style={{ '--habit-color': habit.color, animationDelay: `${i * 0.06}s` }}
            >
              <div className="habit-info">
                <div className="habit-color" style={{ background: habit.color, color: habit.color }} />
                <div>
                  <div className="habit-name">{habit.name}</div>
                  <div className="habit-type" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{habit.type}</span>
                    <span>·</span>
                    <span>{habit.schedule.type}</span>
                    {habit.status === 'paused' && (
                      <span className="badge badge-amber" style={{ padding: '1px 8px', fontSize: '0.65rem' }}>Paused</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="habit-actions">
                {habit.status === 'active' ? (
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePause(habit._id)}>⏸ Pause</button>
                ) : habit.status === 'paused' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => handleResume(habit._id)}>▶ Resume</button>
                ) : null}
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(habit._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Habits;
