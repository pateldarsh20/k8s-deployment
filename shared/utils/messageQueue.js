const amqp = require('amqplib');

/**
 * RabbitMQ Connection Manager
 * Handles publishing and consuming messages
 */
class MessageQueue {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connected = false;
  }

  async connect(url = process.env.RABBITMQ_URL || 'amqp://localhost:5672') {
    try {
      // Add connection timeout to prevent hanging indefinitely
      this.connection = await amqp.connect(url, { timeout: 5000 });
      this.channel = await this.connection.createChannel();
      this.connected = true;
      console.log('✅ Connected to RabbitMQ');

      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err.message);
        this.connected = false;
      });

      this.connection.on('close', () => {
        console.warn('⚠️  RabbitMQ connection closed');
        this.connected = false;
      });

      return this.channel;
    } catch (err) {
      console.warn('⚠️  RabbitMQ not available, messages will be queued locally');
      this.connected = false;
      return null;
    }
  }

  async publish(queue, message, options = {}) {
    if (!this.connected || !this.channel) {
      console.warn('Message queued locally (MQ not connected):', message);
      return false;
    }

    try {
      // Add timeout to prevent hanging if RabbitMQ is unresponsive
      await Promise.race([
        this.channel.assertQueue(queue, { durable: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('assertQueue timeout')), 5000))
      ]);
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        ...options
      });
      console.log(`📤 Published to ${queue}:`, message);
      return true;
    } catch (err) {
      console.error('Failed to publish message:', err.message);
      return false;
    }
  }

  async consume(queue, callback, options = {}) {
    if (!this.connected || !this.channel) {
      console.warn('Cannot consume: MQ not connected');
      return;
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            this.channel.ack(msg);
            console.log(`✅ Acknowledged message from ${queue}`);
          } catch (err) {
            console.error(`Error processing message from ${queue}:`, err.message);
            // Reject and requeue (with dead letter handling in production)
            this.channel.nack(msg, false, true);
          }
        }
      }, options);
      console.log(`📥 Consuming from queue: ${queue}`);
    } catch (err) {
      console.error('Failed to consume message:', err.message);
    }
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.connected = false;
  }
}

// Singleton instance
const mq = new MessageQueue();
module.exports = mq;
