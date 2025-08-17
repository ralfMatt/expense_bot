const { google } = require('googleapis');
require('dotenv').config();

// Google Sheets configuration
let sheets;
let auth;

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const EXPENSES_SHEET = 'Expenses';
const CATEGORIES_SHEET = 'Categories';
const USERS_SHEET = 'Users';

// Initialize Google Sheets API
async function initDatabase() {
  try {
    // Create auth client from service account
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    
    auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    
    sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // Initialize sheets structure
    await initializeSheets();
    
    console.log('Google Sheets database initialized successfully');
  } catch (error) {
    console.error('Google Sheets initialization error:', error);
    throw error;
  }
}

// Initialize sheet structure and default data
async function initializeSheets() {
  try {
    // Get existing sheets
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
    
    // Create sheets if they don't exist
    const sheetsToCreate = [];
    
    if (!existingSheets.includes(USERS_SHEET)) {
      sheetsToCreate.push({ properties: { title: USERS_SHEET } });
    }
    
    if (!existingSheets.includes(CATEGORIES_SHEET)) {
      sheetsToCreate.push({ properties: { title: CATEGORIES_SHEET } });
    }
    
    if (!existingSheets.includes(EXPENSES_SHEET)) {
      sheetsToCreate.push({ properties: { title: EXPENSES_SHEET } });
    }
    
    if (sheetsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: sheetsToCreate.map(sheet => ({
            addSheet: sheet
          }))
        }
      });
    }
    
    // Initialize headers and default data
    await initializeUsersSheet();
    await initializeCategoriesSheet();
    await initializeExpensesSheet();
    
  } catch (error) {
    console.error('Error initializing sheets:', error);
    throw error;
  }
}

// Initialize Users sheet
async function initializeUsersSheet() {
  try {
    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!A1:E1`,
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${USERS_SHEET}!A1:E1`,
        valueInputOption: 'RAW',
        resource: {
          values: [['ID', 'Telegram ID', 'Username', 'First Name', 'Created At']]
        }
      });
    }
  } catch (error) {
    console.error('Error initializing users sheet:', error);
  }
}

// Initialize Categories sheet
async function initializeCategoriesSheet() {
  try {
    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CATEGORIES_SHEET}!A1:E1`,
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CATEGORIES_SHEET}!A1:E1`,
        valueInputOption: 'RAW',
        resource: {
          values: [['ID', 'Name', 'Emoji', 'Is Default', 'User ID']]
        }
      });
      
      // Add default categories
      const defaultCategories = [
        [1, 'Food & Dining', '🍔', 'TRUE', ''],
        [2, 'Transportation', '🚗', 'TRUE', ''],
        [3, 'Shopping', '🛍️', 'TRUE', ''],
        [4, 'Entertainment', '🎬', 'TRUE', ''],
        [5, 'Health & Medical', '🏥', 'TRUE', ''],
        [6, 'Utilities', '💡', 'TRUE', ''],
        [7, 'Groceries', '🛒', 'TRUE', ''],
        [8, 'Travel', '✈️', 'TRUE', '']
      ];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CATEGORIES_SHEET}!A:E`,
        valueInputOption: 'RAW',
        resource: {
          values: defaultCategories
        }
      });
    }
  } catch (error) {
    console.error('Error initializing categories sheet:', error);
  }
}

// Initialize Expenses sheet
async function initializeExpensesSheet() {
  try {
    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${EXPENSES_SHEET}!A1:H1`,
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${EXPENSES_SHEET}!A1:H1`,
        valueInputOption: 'RAW',
        resource: {
          values: [['ID', 'Unique Key', 'Name', 'Amount', 'Category ID', 'User ID', 'Date', 'Created At']]
        }
      });
    }
  } catch (error) {
    console.error('Error initializing expenses sheet:', error);
  }
}

// User operations
async function createUser(telegramId, username, firstName) {
  try {
    // Check if user already exists
    const existingUser = await getUser(telegramId);
    if (existingUser) {
      // Update existing user
      const userRow = existingUser.rowIndex;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${USERS_SHEET}!A${userRow}:E${userRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[existingUser.id, telegramId, username || '', firstName || '', existingUser.created_at]]
        }
      });
      return existingUser;
    }
    
    // Get next ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!A:A`,
    });
    
    const nextId = response.data.values ? response.data.values.length : 1;
    const createdAt = new Date().toISOString();
    
    // Add new user
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!A:E`,
      valueInputOption: 'RAW',
      resource: {
        values: [[nextId, telegramId, username || '', firstName || '', createdAt]]
      }
    });
    
    return {
      id: nextId,
      telegram_id: telegramId,
      username: username,
      first_name: firstName,
      created_at: createdAt
    };
    
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUser(telegramId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USERS_SHEET}!A:E`,
    });
    
    if (!response.data.values) return null;
    
    for (let i = 1; i < response.data.values.length; i++) {
      const row = response.data.values[i];
      if (row[1] && parseInt(row[1]) === telegramId) {
        return {
          id: parseInt(row[0]),
          telegram_id: parseInt(row[1]),
          username: row[2] || null,
          first_name: row[3] || null,
          created_at: row[4] || null,
          rowIndex: i + 1
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Category operations
async function getCategories(userId = null) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CATEGORIES_SHEET}!A:E`,
    });
    
    if (!response.data.values) return [];
    
    const categories = [];
    
    for (let i = 1; i < response.data.values.length; i++) {
      const row = response.data.values[i];
      const categoryUserId = row[4] || null;
      const isDefault = row[3] === 'TRUE';
      
      // Include default categories or user's custom categories
      if (isDefault || (categoryUserId && parseInt(categoryUserId) === userId)) {
        categories.push({
          id: parseInt(row[0]),
          name: row[1],
          emoji: row[2],
          is_default: isDefault,
          user_id: categoryUserId ? parseInt(categoryUserId) : null
        });
      }
    }
    
    // Sort by default first, then by name
    return categories.sort((a, b) => {
      if (a.is_default !== b.is_default) {
        return b.is_default - a.is_default;
      }
      return a.name.localeCompare(b.name);
    });
    
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

async function addCategory(name, emoji, userId) {
  try {
    // Get next ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CATEGORIES_SHEET}!A:A`,
    });
    
    const nextId = response.data.values ? response.data.values.length : 1;
    
    // Add new category
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CATEGORIES_SHEET}!A:E`,
      valueInputOption: 'RAW',
      resource: {
        values: [[nextId, name, emoji, 'FALSE', userId]]
      }
    });
    
    return {
      id: nextId,
      name: name,
      emoji: emoji,
      is_default: false,
      user_id: userId
    };
    
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

// Expense operations
async function generateUniqueKey() {
  try {
    let key;
    let exists = true;
    
    while (exists) {
      key = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      
      // Check if key exists
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${EXPENSES_SHEET}!B:B`,
      });
      
      exists = false;
      if (response.data.values) {
        for (let i = 1; i < response.data.values.length; i++) {
          if (response.data.values[i][0] === key) {
            exists = true;
            break;
          }
        }
      }
    }
    
    return key;
  } catch (error) {
    console.error('Error generating unique key:', error);
    throw error;
  }
}

async function addExpense(name, amount, categoryId, userId, date = null) {
  try {
    const uniqueKey = await generateUniqueKey();
    const expenseDate = date || new Date().toISOString().split('T')[0];
    const createdAt = new Date().toISOString();
    
    // Get category name from categoryId
    const categoriesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CATEGORIES_SHEET}!A:C`,
    });
    
    // Store the category ID number, not the name
    const categoryName = categoryId;
    
    // Get next ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${EXPENSES_SHEET}!A:A`,
    });
    
    const nextId = response.data.values ? response.data.values.length : 1;
    
    // Add new expense
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${EXPENSES_SHEET}!A:H`,
      valueInputOption: 'RAW',
      resource: {
        values: [[nextId, uniqueKey, name, amount, categoryName, userId, expenseDate, createdAt]]
      }
    });
    
    return {
      id: nextId,
      unique_key: uniqueKey,
      name: name,
      amount: parseFloat(amount),
      category_id: categoryId,
      user_id: userId,
      date: expenseDate,
      created_at: createdAt
    };
    
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
}

async function updateExpense(uniqueKey, userId, updates) {
  try {
    // Find the expense
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${EXPENSES_SHEET}!A:H`,
    });
    
    if (!response.data.values) return null;
    
    for (let i = 1; i < response.data.values.length; i++) {
      const row = response.data.values[i];
      if (row[1] === uniqueKey && parseInt(row[5]) === userId) {
        // Update the row
        const updatedRow = [...row];
        
        if (updates.name) updatedRow[2] = updates.name;
        if (updates.amount) updatedRow[3] = updates.amount;
        if (updates.categoryId) updatedRow[4] = updates.categoryId;
        if (updates.date) updatedRow[6] = updates.date;
        
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${EXPENSES_SHEET}!A${i + 1}:H${i + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: [updatedRow]
          }
        });
        
        return {
          id: parseInt(updatedRow[0]),
          unique_key: updatedRow[1],
          name: updatedRow[2],
          amount: parseFloat(updatedRow[3]),
          category_id: parseInt(updatedRow[4]),
          user_id: parseInt(updatedRow[5]),
          date: updatedRow[6],
          created_at: updatedRow[7]
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

async function deleteExpense(uniqueKey, userId) {
  try {
    // Find the expense
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${EXPENSES_SHEET}!A:H`,
    });
    
    if (!response.data.values) return null;
    
    for (let i = 1; i < response.data.values.length; i++) {
      const row = response.data.values[i];
      if (row[1] === uniqueKey && parseInt(row[5]) === userId) {
        const expense = {
          id: parseInt(row[0]),
          unique_key: row[1],
          name: row[2],
          amount: parseFloat(row[3]),
          category_id: parseInt(row[4]),
          user_id: parseInt(row[5]),
          date: row[6],
          created_at: row[7]
        };
        
        // Delete the row
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: await getSheetId(EXPENSES_SHEET),
                  dimension: 'ROWS',
                  startIndex: i,
                  endIndex: i + 1
                }
              }
            }]
          }
        });
        
        return expense;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

async function getExpenses(userId, startDate = null, endDate = null) {
  try {
    // Get expenses
    const expensesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${EXPENSES_SHEET}!A:H`,
    });
    
    // Get categories for lookup
    const categoriesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${CATEGORIES_SHEET}!A:E`,
    });
    
    if (!expensesResponse.data.values) return [];
    
    const expenses = [];
    const categories = {};
    
    // Build categories lookup
    if (categoriesResponse.data.values) {
      for (let i = 1; i < categoriesResponse.data.values.length; i++) {
        const row = categoriesResponse.data.values[i];
        categories[parseInt(row[0])] = {
          name: row[1],
          emoji: row[2]
        };
      }
    }
    
    // Filter and format expenses
    for (let i = 1; i < expensesResponse.data.values.length; i++) {
      const row = expensesResponse.data.values[i];
      if (parseInt(row[5]) === userId) {
        const expenseDate = row[6];
        
        // Date filtering
        if (startDate && expenseDate < startDate) continue;
        if (endDate && expenseDate > endDate) continue;
        
        const categoryId = parseInt(row[4]);
        const category = categories[categoryId] || { name: 'Uncategorized', emoji: '📝' };
        
        expenses.push({
          id: parseInt(row[0]),
          unique_key: row[1],
          name: row[2],
          amount: parseFloat(row[3]),
          category_id: categoryId,
          user_id: parseInt(row[5]),
          date: expenseDate,
          created_at: row[7],
          category_name: category.name,
          category_emoji: category.emoji
        });
      }
    }
    
    // Sort by date desc, created_at desc
    return expenses.sort((a, b) => {
      if (a.date !== b.date) {
        return new Date(b.date) - new Date(a.date);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
}

async function getExpenseSummary(userId, startDate, endDate) {
  try {
    const expenses = await getExpenses(userId, startDate, endDate);
    
    const summary = {};
    
    expenses.forEach(expense => {
      const categoryName = expense.category_name || 'Uncategorized';
      const categoryEmoji = expense.category_emoji || '📝';
      
      if (!summary[categoryName]) {
        summary[categoryName] = {
          category_name: categoryName,
          category_emoji: categoryEmoji,
          total_amount: 0,
          expense_count: 0
        };
      }
      
      summary[categoryName].total_amount += expense.amount;
      summary[categoryName].expense_count += 1;
    });
    
    // Convert to array and sort by total amount desc
    return Object.values(summary).sort((a, b) => b.total_amount - a.total_amount);
    
  } catch (error) {
    console.error('Error getting expense summary:', error);
    throw error;
  }
}

// Helper function to get sheet ID
async function getSheetId(sheetName) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
  } catch (error) {
    console.error('Error getting sheet ID:', error);
    return null;
  }
}

module.exports = {
  initDatabase,
  createUser,
  getUser,
  getCategories,
  addCategory,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getExpenseSummary
};
