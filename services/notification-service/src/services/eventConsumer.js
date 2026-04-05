const Notification = require('../models/Notification');
const mq = require('../../shared/utils/messageQueue');

/**
 * Notification Event Consumer
 * Processes events and schedules notifications
 */

const scheduledJobs = new Map();

/**
 * Set up message queue consumers
 */
const setupConsumers = async () => {
  // Consume notification events
  await mq.consume('notifications', async (message) => {
    console.log('Processing notification event:', message.type);

    switch (message.type) {
      case 'schedule_reminder':
        await handleScheduleReminder(message);
        break;
      case 'update_reminder':
        await handleUpdateReminder(message);
        break;
      case 'welcome':
        await handleWelcomeNotification(message);
        break;
      case 'streak_milestone':
        await handleStreakMilestone(message);
        break;
      default:
        console.log('Unknown notification event type:', message.type);
    }
  });
};

/**
 * Handle habit reminder scheduling
 */
async function handleScheduleReminder(message) {
  const { habitId, userId, reminders } = message;

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    // Schedule daily reminder
    const scheduledTime = getNextOccurrence(reminder.time);
    
    const notification = await Notification.create({
      userId,
      habitId,
      type: 'reminder',
      title: 'Habit Reminder',
      message: reminder.message || `Time to complete your habit!`,
      scheduledAt: scheduledTime,
      channel: 'in_app',
      metadata: {
        habitId,
        reminderTime: reminder.time,
        recurring: true
      }
    });

    console.log(`Scheduled reminder for habit ${habitId} at ${scheduledTime}`);
  }
}

/**
 * Handle reminder update
 */
async function handleUpdateReminder(message) {
  const { habitId, userId, reminders } = message;

  // Cancel existing reminders for this habit
  await Notification.updateMany(
    { habitId, type: 'reminder', status: 'pending' },
    { status: 'cancelled' }
  );

  // Schedule new reminders
  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const scheduledTime = getNextOccurrence(reminder.time);
    
    await Notification.create({
      userId,
      habitId,
      type: 'reminder',
      title: 'Habit Reminder',
      message: reminder.message || `Time to complete your habit!`,
      scheduledAt: scheduledTime,
      channel: 'in_app',
      metadata: {
        habitId,
        reminderTime: reminder.time,
        recurring: true
      }
    });
  }

  console.log(`Updated reminders for habit ${habitId}`);
}

/**
 * Handle welcome notification
 */
async function handleWelcomeNotification(message) {
  const { userId, name, email } = message;

  await Notification.create({
    userId,
    type: 'welcome',
    title: 'Welcome to Habit Tracker! 🎉',
    message: `Hi ${name}! Start tracking your habits and build consistent routines.`,
    scheduledAt: new Date(),
    channel: 'in_app',
    metadata: { email }
  });

  console.log(`Welcome notification sent to ${name}`);
}

/**
 * Handle streak milestone notification
 */
async function handleStreakMilestone(message) {
  const { userId, habitId, streak } = message;

  const messages = {
    7: '🔥 7-day streak! You\'re building a great habit!',
    30: '🏆 30-day streak! Incredible dedication!',
    100: '💯 100-day streak! You\'re a habit master!',
    365: '🌟 365-day streak! A full year of consistency!'
  };

  await Notification.create({
    userId,
    habitId,
    type: 'streak_milestone',
    title: 'Streak Milestone!',
    message: messages[streak] || `🎉 ${streak}-day streak! Keep it up!`,
    scheduledAt: new Date(),
    channel: 'in_app',
    metadata: { streak }
  });

  console.log(`Streak milestone notification for ${streak} days`);
}

/**
 * Get next occurrence of a time (HH:MM)
 */
function getNextOccurrence(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}

/**
 * Process pending notifications (cron job)
 */
const processPendingNotifications = async () => {
  const now = new Date();

  const pending = await Notification.find({
    status: 'pending',
    scheduledAt: { $lte: now }
  }).limit(50);

  for (const notification of pending) {
    await sendNotification(notification);
  }

  if (pending.length > 0) {
    console.log(`Processed ${pending.length} pending notifications`);
  }
};

/**
 * Send notification with retry logic
 */
async function sendNotification(notification, retryCount = 0) {
  const maxRetries = notification.maxRetries || 3;

  try {
    // Simulate sending notification
    // In production, integrate with:
    // - Firebase Cloud Messaging (push)
    // - SendGrid/AWS SES (email)
    // - Twilio (SMS)
    
    await simulateSend(notification);

    // Mark as sent
    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();

    console.log(`Notification sent: ${notification._id}`);

    // If recurring, schedule next occurrence
    if (notification.metadata?.recurring) {
      await scheduleNextOccurrence(notification);
    }
  } catch (err) {
    notification.retryCount = retryCount + 1;
    notification.lastRetryAt = new Date();
    notification.error = err.message;

    if (retryCount >= maxRetries) {
      notification.status = 'failed';
      await notification.save();
      console.error(`Notification failed permanently: ${notification._id}`);
    } else {
      // Retry after delay
      const delay = 60000 * (retryCount + 1); // Exponential backoff
      console.log(`Retrying notification ${notification._id} in ${delay}ms`);
      setTimeout(() => sendNotification(notification, retryCount + 1), delay);
    }
  }
}

/**
 * Simulate sending notification (replace with real provider)
 */
function simulateSend(notification) {
  return new Promise((resolve, reject) => {
    // Simulate 95% success rate
    if (Math.random() > 0.05) {
      console.log(`📤 Sending: [${notification.channel}] ${notification.title} - ${notification.message}`);
      resolve();
    } else {
      reject(new Error('Simulated delivery failure'));
    }
  });
}

/**
 * Schedule next occurrence for recurring notifications
 */
async function scheduleNextOccurrence(notification) {
  const nextTime = getNextOccurrence(notification.metadata.reminderTime);
  
  const newNotification = await Notification.create({
    userId: notification.userId,
    habitId: notification.habitId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    scheduledAt: nextTime,
    channel: notification.channel,
    metadata: notification.metadata
  });

  console.log(`Scheduled next occurrence at ${nextTime}`);
}

module.exports = {
  setupConsumers,
  processPendingNotifications
};
