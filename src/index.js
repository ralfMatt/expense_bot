const ExpenseBot = require('./bot');

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Gracefully shutting down...');
  if (global.bot) {
    await global.bot.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Gracefully shutting down...');
  if (global.bot) {
    await global.bot.stop();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the bot
async function main() {
  try {
    console.log('Starting Telegram Expense Bot...');
    
    // Validate required environment variables
    const requiredVars = ['TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY', 'GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars.join(', '));
      console.error('Please check your .env file');
      process.exit(1);
    }
    
    // Create and start bot instance
    const bot = new ExpenseBot();
    global.bot = bot;
    
    await bot.start();
    
    console.log('✅ Telegram Expense Bot is running!');
    console.log(`📱 Bot Token: ${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
    console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'Connected' : 'Not configured'}`);
    console.log(`📊 Google Sheets: ${process.env.GOOGLE_SHEET_ID ? 'Connected' : 'Not configured'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📋 Next Steps:');
      console.log('1. Share your Google Sheet with the service account');
      console.log('2. Start chatting with your bot!');
      console.log('3. Your expenses will appear in the Google Sheet');
    }
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Run the bot
main();