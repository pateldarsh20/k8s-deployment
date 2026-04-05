import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';

function Analytics() {
  const [trends, setTrends] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [bestDays, setBestDays] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Analytics</h2>

      {/* Trend Direction */}
      {trends && (
        <div className="card">
          <h3 className="card-title">
            Trend: {trends.trendDirection === 'improving' ? '📈 Improving' : 
                   trends.trendDirection === 'declining' ? '📉 Declining' : '➡️ Stable'}
          </h3>
        </div>
      )}

      {/* Heatmap */}
      {heatmap && (
        <div className="card">
          <h3 className="card-title">Activity Heatmap (Last 3 Months)</h3>
          <div className="heatmap">
            {heatmap.entries.slice(-84).map((entry, index) => (
              <div
                key={index}
                className={`heatmap-cell intensity-${entry.intensity}`}
                title={`${entry.date}: ${entry.completed}/${entry.total}`}
              ></div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#757575' }}>
            <span>Less</span>
            <div className="heatmap-cell intensity-0" style={{ width: '12px', height: '12px' }}></div>
            <div className="heatmap-cell intensity-1" style={{ width: '12px', height: '12px' }}></div>
            <div className="heatmap-cell intensity-2" style={{ width: '12px', height: '12px' }}></div>
            <div className="heatmap-cell intensity-3" style={{ width: '12px', height: '12px' }}></div>
            <div className="heatmap-cell intensity-4" style={{ width: '12px', height: '12px' }}></div>
            <span>More</span>
          </div>
        </div>
      )}

      {/* Best Days */}
      {bestDays && (
        <div className="card">
          <h3 className="card-title">Best Performing Days</h3>
          {bestDays.bestDay && (
            <p style={{ marginBottom: '1rem' }}>
              🏆 Your best day is <strong>{bestDays.bestDay.day}</strong> with 
              {bestDays.bestDay.avgCompletionRate}% average completion rate
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
            {bestDays.allDays.map(day => (
              <div key={day.day} style={{ 
                padding: '0.75rem', 
                background: day.day === bestDays.bestDay?.day ? '#e8f5e9' : '#f5f5f5',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 600 }}>{day.day}</div>
                <div style={{ fontSize: '1.25rem', color: '#4CAF50' }}>{day.avgCompletionRate}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
