# 🤖 Telegram AI Expense Tracker

A smart Telegram bot that tracks your expenses with AI-powered categorization using GPT-4. Simply text your expenses and get intelligent insights!

## ✨ Features

- **AI Categorization**: GPT-4 automatically categorizes your expenses
- **Natural Language**: Text expenses naturally ("Coffee $5.50", "Uber $15")
- **Smart Commands**: Edit, delete, and manage expenses with simple commands
- **Custom Categories**: Add your own expense categories with AI-suggested emojis
- **Monthly Summaries**: Get detailed spending reports and insights
- **Multi-Month Analysis**: Compare spending across multiple months
- **Unique IDs**: Each expense gets a unique ID for easy management

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 16+ installed
- Google Sheets (100% free forever!)
- Telegram Bot Token (from @BotFather)
- OpenAI API Key
- Google Cloud Project (free)

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd telegram-expense-bot

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### 3. Google Sheets Setup

**📊 See detailed guide: [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)**

Quick setup:
1. Create a Google Sheet and copy the Sheet ID from URL
2. Create Google Cloud project and enable Sheets API  
3. Create service account and download JSON credentials
4. Share your sheet with the service account email

### 4. Environment Setup

Edit `.env` file with your credentials:

```env
# Get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Get from OpenAI dashboard
OPENAI_API_KEY=your_openai_api_key_here

# Google Sheets setup
GOOGLE_SHEET_ID=your_sheet_id_from_url
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# Server configuration
PORT=3000
NODE_ENV=development
```

### 5. Create Telegram Bot

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Choose a name: "My Expense Tracker"
4. Choose a username: "myexpensetracker_bot"
5. Copy the bot token to your `.env` file

### 6. Get OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create new secret key
3. Copy to your `.env` file

### 7. Run the Bot

```bash
# Development mode
npm run dev

# Production mode  
npm start
```

## 💬 How to Use

### Adding Expenses

```
"Coffee $5.50"           → ✅ Added: Coffee - $5.50 (Food & Dining 🍔) [ID: 0001]
"Uber to airport $25"    → ✅ Added: Uber To Airport - $25.00 (Transportation 🚗) [ID: 0002]
"Groceries 89.45"        → ✅ Added: Groceries - $89.45 (Groceries 🛒) [ID: 0003]
```

### Managing Expenses

```
"change 0001 to shopping"  → ✅ Updated: Coffee category changed to Shopping 🛍️
"delete 0002"              → ✅ Deleted: Uber To Airport - $25.00
```

### Categories

```
"show categories"          → 🏷️ Shows all available categories
"add category Investments" → ✅ Added new category: Investments 📈
```

### Reports & Summaries

```
"summary"                    → 📊 December 2024 Summary with totals and percentages
"summary for last 3 months" → 📈 Multi-month comparison
"show all expenses"          → 📝 List all expenses for current month
```

## 🏗️ Project Structure

```
telegram-expense-bot/
├── src/
│   ├── index.js          # Main entry point
│   ├── bot.js           # Telegram bot setup
│   ├── messageHandler.js # Command processing
│   ├── messageParser.js  # Text parsing logic
│   ├── aiCategorizer.js  # GPT-4 integration
│   └── database.js      # Database operations
├── .env.example         # Environment template
├── .env                 # Your configuration
├── package.json         # Dependencies
└── README.md           # This file
```

## 🎯 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Welcome message and setup | `/start` |
| `help` | Show all commands | `help` |
| **Adding Expenses** | | |
| `[item] $[amount]` | Add expense | `Coffee $5.50` |
| `$[amount] [item]` | Add expense | `$15 Uber` |
| **Managing** | | |
| `change [ID] to [category]` | Change category | `change 0001 to food` |
| `delete [ID]` | Delete expense | `delete 0001` |
| **Categories** | | |
| `show categories` | List categories | `show categories` |
| `add category [name]` | Add category | `add category Crypto` |
| **Reports** | | |
| `summary` | Current month | `summary` |
| `summary for last X months` | Multi-month | `summary for last 3 months` |
| `show all expenses` | List all expenses | `show all expenses` |

## 🛠️ Deployment

### Railway (Recommended)

1. Fork this repository
2. Connect to Railway
3. Add environment variables
4. Deploy automatically

### Render

1. Connect repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

### Manual VPS

1. Clone repository on server
2. Install dependencies: `npm install`
3. Set up process manager: `pm2 start src/index.js --name expense-bot`
4. Set up reverse proxy with nginx

## 💰 Cost Breakdown

**Monthly costs for 3 messages/day:**

- **Telegram**: Free ✅
- **GPT-4**: ~$0.68/month
- **Database**: Free (Supabase tier)
- **Hosting**: Free (Railway/Render tier)

**Total**: ~$0.68/month ($8/year)

## 🔧 Configuration

### Custom Categories

Add your own default categories in `src/database.js`:

```javascript
const defaultCategories = [
  { name: 'Crypto', emoji: '₿' },
  { name: 'Investments', emoji: '📈' },
  // ... add more
];
```

### AI Behavior

Modify AI prompts in `src/aiCategorizer.js`:

```javascript
const prompt = `
You are an AI assistant that categorizes expenses...
// Customize behavior here
`;
```

## 🐛 Troubleshooting

### Bot Not Responding

1. Check bot token is correct
2. Verify bot is running: `npm run dev`
3. Check logs for errors
4. Test with `/start` command

### Database Errors

1. Verify DATABASE_URL is correct
2. Check database is accessible
3. Ensure tables are created (restart bot)

### AI Categorization Issues

1. Verify OpenAI API key
2. Check API credits/billing
3. Test with simple expenses first

### Common Issues

| Issue | Solution |
|-------|----------|
| "404 Not Found" | Check bot token |
| "Database connection failed" | Verify DATABASE_URL |
| "OpenAI API error" | Check API key and credits |
| "Categories not loading" | Restart bot to create tables |

## 🧪 Testing

Test your bot setup:

```bash
# Start bot
npm run dev

# In Telegram, message your bot:
/start
Coffee $5.50
summary
help
```

## 📝 Development

### Adding New Commands

1. Add pattern to `messageParser.js`
2. Create handler in `messageHandler.js`
3. Update help text and README

### Database Changes

1. Modify schema in `database.js`
2. Add migration logic if needed
3. Test with fresh database

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🚨 Security Notes

- Keep your `.env` file secret
- Never commit API keys to git
- Use HTTPS in production
- Regularly update dependencies

---

**Happy expense tracking! 💸**

For support, create an issue on GitHub or contact the maintainers.