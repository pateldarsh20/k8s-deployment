import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';

function Analytics() {
  const [trends, setTrends] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [bestDays, setBestDays] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [trendsRes, heatmapRes, bestDaysRes] = await Promise.all([
        analyticsAPI.getTrends({ days: 30 }),
        analyticsAPI.getHeatmap({ months: 3 }),
        analyticsAPI.getBestDays()
      ]);
      setTrends(trendsRes.data.data);
      setHeatmap(heatmapRes.data.data);
      setBestDays(bestDaysRes.data.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /><span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Crunching numbers...</span></div>;
  }

  const trendConfig = {
    improving: { icon: '📈', label: 'Improving',   badge: 'badge-green',  desc: "You're on the right track! Keep it up." },
    declining:  { icon: '📉', label: 'Declining',   badge: 'badge-red',    desc: "Let's get back on track together." },
    stable:     { icon: '➡️', label: 'Stable',      badge: 'badge-amber',  desc: 'Consistency is key — push for growth.' },
  };
  const trend = trendConfig[trends?.trendDirection] || trendConfig.stable;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Analytics</h2>
          <p className="page-subtitle">Last 30 days performance</p>
        </div>
      </div>

      {/* Trend */}
      {trends && (
        <div className="card">
          <h3 className="card-title">Trend Overview</h3>
          <div className="trend-indicator">
            <div className={`trend-icon ${trends.trendDirection}`}>
              {trend.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>
                  {trend.label}
                </span>
                <span className={`badge ${trend.badge}`}>{trends.trendDirection}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{trend.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap */}
      {heatmap && (
        <div className="card">
          <h3 className="card-title">Activity Heatmap</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Last 3 months · Hover cells for details
          </p>
          <div className="heatmap-wrapper">
            <div className="heatmap">
              {heatmap.entries.slice(-84).map((entry, i) => (
                <div
                  key={i}
                  className={`heatmap-cell${entry.intensity ? ` intensity-${entry.intensity}` : ''}`}
                  title={`${entry.date}: ${entry.completed}/${entry.total} habits`}
                />
              ))}
            </div>
          </div>
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="heatmap-legend-cells">
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`heatmap-legend-cell heatmap-cell${i ? ` intensity-${i}` : ''}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      )}

      {/* Best Days */}
      {bestDays && (
        <div className="card">
          <h3 className="card-title">Best Performing Days</h3>
          {bestDays.bestDay && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '0.85rem 1rem',
              background: 'rgba(0,200,150,0.06)',
              border: '1px solid rgba(0,200,150,0.2)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              <div>
                <span style={{ fontWeight: 600 }}>{bestDays.bestDay.day}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {' '}is your best day with{' '}
                </span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  {bestDays.bestDay.avgCompletionRate}%
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}> avg completion</span>
              </div>
            </div>
          )}
          <div className="day-grid">
            {bestDays.allDays.map(day => (
              <div key={day.day} className={`day-card ${day.day === bestDays.bestDay?.day ? 'best' : ''}`}>
                <div className="day-card-name">{day.day.slice(0, 3)}</div>
                <div className="day-card-value">{day.avgCompletionRate}%</div>
                <div className="progress-bar" style={{ marginTop: '6px' }}>
                  <div className="progress-fill" style={{ width: `${day.avgCompletionRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
