import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try { await notificationsAPI.markAsRead(id); loadNotifications(); } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try { await notificationsAPI.markAllAsRead(); loadNotifications(); } catch (err) { console.error(err); }
  };

  const deleteNotification = async (id) => {
    try { await notificationsAPI.delete(id); loadNotifications(); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /><span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading notifications...</span></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 className="page-title">Notifications</h2>
          {unreadCount > 0 && (
            <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllAsRead}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">All caught up!</div>
            <p className="empty-state-text">No notifications right now. Keep up your great work.</p>
          </div>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((n, i) => (
            <div
              key={n._id}
              className={`notification-item ${!n.isRead ? 'unread' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => !n.isRead && markAsRead(n._id)}
            >
              {!n.isRead && <div className="notification-dot" />}
              {n.isRead && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--bg-hover)', marginTop: 6, flexShrink: 0
                }} />
              )}
              <div className="notification-content">
                <div className="notification-title">{n.title}</div>
                <div className="notification-message">{n.message}</div>
                <div className="notification-time">
                  {new Date(n.scheduledAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                style={{ alignSelf: 'center', padding: '4px 10px', fontSize: '1rem', lineHeight: 1 }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
