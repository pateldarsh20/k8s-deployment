import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(response.data.data);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2>
          Notifications 
          {unreadCount > 0 && (
            <span style={{ 
              background: '#4CAF50', 
              color: 'white', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '12px', 
              fontSize: '0.875rem',
              marginLeft: '0.5rem'
            }}>
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#757575' }}>No notifications</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(notification => (
            <div 
              key={notification._id} 
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
            >
              <div className="notification-content" onClick={() => markAsRead(notification._id)}>
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {new Date(notification.scheduledAt).toLocaleString()}
                </div>
              </div>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => deleteNotification(notification._id)}
                style={{ alignSelf: 'center' }}
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
