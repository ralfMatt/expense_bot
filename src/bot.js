const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

const { initDatabase, createUser, getUser } = require('./database-sheets');
const { handleMessage } = require('./messageHandler');

class ExpenseBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    this.app = express();
    this.app.use(express.json());
    
    this.setupBot();
    this.setupWebhook();
  }

  setupBot() {
    // Handle all messages
    this.bot.on('message', async (msg) => {
      try {
        // Ensure user exists in database
        await this.ensureUser(msg.from);
        
        // Handle the message
        await handleMessage(this.bot, msg);
      } catch (error) {
        console.error('Error handling message:', error);
        await this.bot.sendMessage(msg.chat.id, 
          '❌ Sorry, something went wrong. Please try again.');
      }
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', async (query) => {
      try {
        await this.bot.answerCallbackQuery(query.id);
        // Handle button callbacks if needed
      } catch (error) {
        console.error('Error handling callback query:', error);
      }
    });

    console.log('Telegram bot setup complete');
  }

  async ensureUser(from) {
    try {
      let user = await getUser(from.id);
      
      if (!user) {
        user = await createUser(
          from.id,
          from.username || null,
          from.first_name || null
        );
        console.log(`New user created: ${user.telegram_id} (${user.first_name})`);
      }
      
      return user;
    } catch (error) {
      console.error('Error ensuring user:', error);
      throw error;
    }
  }

  setupWebhook() {
    // Webhook endpoint for production
    this.app.post('/webhook', (req, res) => {
      this.bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({ 
        message: 'Telegram Expense Bot API',
        status: 'Running',
        version: '1.0.0'
      });
    });
  }

  async start() {
    try {
      // Initialize database
      await initDatabase();
      
      const port = process.env.PORT || 3000;
      
      if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
        // Production: Use webhook
        await this.bot.setWebHook(`${process.env.WEBHOOK_URL}/webhook`);
        console.log('Webhook set successfully');
        
        this.app.listen(port, () => {
          console.log(`Server running on port ${port}`);
        });
      } else {
        // Development: Use polling
        await this.bot.deleteWebHook();
        this.bot.startPolling();
        console.log('Bot started with polling');
        
        this.app.listen(port, () => {
          console.log(`Development server running on port ${port}`);
        });
      }
      
    } catch (error) {
      console.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      if (process.env.NODE_ENV === 'production') {
        await this.bot.deleteWebHook();
      } else {
        this.bot.stopPolling();
      }
      console.log('Bot stopped');
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  }
}

module.exports = ExpenseBot;