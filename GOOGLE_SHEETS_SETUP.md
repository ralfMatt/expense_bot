# 📊 Google Sheets Setup Guide

Complete guide to set up Google Sheets as your free database for the Telegram expense tracker.

## 🚀 Quick Setup (10 minutes)

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"+ Blank"** to create new sheet
3. **Rename** it to "Expense Tracker"
4. **Copy the Sheet ID** from URL:
   ```
   https://docs.google.com/spreadsheets/d/1ABC123XYZ789/edit
                                      ^^^^^^^^^ 
                                   This is your Sheet ID
   ```
5. **Share the sheet**:
   - Click "Share" button
   - Set to **"Anyone with the link can edit"**
   - Or add the service account email later

### Step 2: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **"New Project"**
3. Name: `telegram-expense-bot`
4. Click **"Create"**

### Step 3: Enable Google Sheets API

1. In Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for **"Google Sheets API"**
3. Click on it and press **"Enable"**

### Step 4: Create Service Account

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ Create Credentials" > "Service Account"**
3. **Service account name**: `expense-bot`
4. Click **"Create and Continue"**
5. **Role**: `Editor` (or just skip this step)
6. Click **"Done"**

### Step 5: Generate Service Account Key

1. Click on the **service account** you just created
2. Go to **"Keys"** tab
3. Click **"Add Key" > "Create New Key"**
4. Choose **"JSON"** format
5. Click **"Create"** - downloads a JSON file

### Step 6: Configure Environment

1. **Copy the JSON file content** (it looks like this):
   ```json
   {
     "type": "service_account",
     "project_id": "telegram-expense-bot-123456",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "expense-bot@telegram-expense-bot-123456.iam.gserviceaccount.com",
     "client_id": "123456789...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     ...
   }
   ```

2. **Update your .env file**:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   OPENAI_API_KEY=your_openai_key_here
   GOOGLE_SHEET_ID=1ABC123XYZ789
   GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
   ```

3. **Important**: Put the entire JSON on one line for `GOOGLE_SERVICE_ACCOUNT`

### Step 7: Share Sheet with Service Account

1. **Copy the service account email** from the JSON:
   ```
   expense-bot@telegram-expense-bot-123456.iam.gserviceaccount.com
   ```

2. **Share your Google Sheet**:
   - Open your expense tracker sheet
   - Click **"Share"**
   - Add the service account email
   - Set permission to **"Editor"**
   - Click **"Send"**

## 🧪 Test the Setup

Run your bot:
```bash
npm run dev
```

Text your bot:
```
/start
Coffee $5.50
```

Check your Google Sheet - you should see:
- **Users** tab with your Telegram info
- **Categories** tab with default categories 
- **Expenses** tab with your coffee expense

## 📊 Google Sheet Structure

Your sheet will automatically create these tabs:

### Users Tab
| ID | Telegram ID | Username | First Name | Created At |
|----|-------------|----------|------------|------------|
| 1  | 123456789   | john_doe | John       | 2024-12-15 |

### Categories Tab  
| ID | Name            | Emoji | Is Default | User ID |
|----|-----------------|-------|------------|---------|
| 1  | Food & Dining   | 🍔    | TRUE       |         |
| 2  | Transportation  | 🚗    | TRUE       |         |
| 3  | Shopping        | 🛍️    | TRUE       |         |

### Expenses Tab
| ID | Unique Key | Name   | Amount | Category ID | User ID | Date       | Created At |
|----|------------|--------|--------|-------------|---------|------------|------------|
| 1  | 0001       | Coffee | 5.50   | 1           | 1       | 2024-12-15 | 2024-12-15 |

## 🎯 Benefits of Google Sheets

✅ **100% Free Forever** - No database costs ever  
✅ **Easy to View** - Familiar spreadsheet interface  
✅ **Automatic Backup** - Synced to Google Drive  
✅ **Export Data** - Download as Excel/CSV anytime  
✅ **Share Access** - Add family members if needed  
✅ **Real-time Updates** - See expenses appear instantly  
✅ **Manual Editing** - Fix mistakes directly in sheet  

## 🔧 Troubleshooting

### "Sheet not found" error
- Check `GOOGLE_SHEET_ID` is correct
- Make sure sheet is shared with service account email

### "Permission denied" error  
- Service account needs Editor access to the sheet
- Check the service account email is added to sheet sharing

### "Authentication failed" error
- Check `GOOGLE_SERVICE_ACCOUNT` JSON is valid
- Make sure it's on one line in .env file
- Verify Google Sheets API is enabled

### "Invalid credentials" error
- Re-download the service account key JSON
- Make sure you copied the entire JSON correctly

## 💡 Pro Tips

1. **Bookmark your sheet** for easy access to view expenses
2. **Create charts** in Google Sheets for visual spending analysis  
3. **Use filters** to analyze spending by date ranges
4. **Add conditional formatting** to highlight large expenses
5. **Export monthly** for tax records or budgeting apps

## 🔒 Security Notes

- **Keep service account JSON private** - never share or commit to git
- **Use environment variables** for all credentials  
- **Regularly review** sheet access permissions
- **Enable 2FA** on your Google account

---

Your expense tracker now uses Google Sheets as a free, forever database! 🎉