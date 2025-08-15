const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Database connection
let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '..', 'expenses.db');
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      
      // Create tables
      createTables().then(resolve).catch(reject);
    });
  });
}

async function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          emoji TEXT DEFAULT '📝',
          is_default INTEGER DEFAULT 0,
          user_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(name, user_id)
        )
      `);

      // Create expenses table
      db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          unique_key TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          category_id INTEGER,
          user_id INTEGER NOT NULL,
          date DATE DEFAULT (date('now')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Insert default categories
      const defaultCategories = [
        { name: 'Food & Dining', emoji: '🍔' },
        { name: 'Transportation', emoji: '🚗' },
        { name: 'Shopping', emoji: '🛍️' },
        { name: 'Entertainment', emoji: '🎬' },
        { name: 'Health & Medical', emoji: '🏥' },
        { name: 'Utilities', emoji: '💡' },
        { name: 'Groceries', emoji: '🛒' },
        { name: 'Travel', emoji: '✈️' }
      ];

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO categories (name, emoji, is_default, user_id)
        VALUES (?, ?, 1, NULL)
      `);

      defaultCategories.forEach(category => {
        stmt.run(category.name, category.emoji);
      });

      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  });
}

// User operations
async function createUser(telegramId, username, firstName) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (telegram_id, username, first_name)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(telegramId, username, firstName, function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    
    stmt.finalize();
  });
}

async function getUser(telegramId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Category operations
async function getCategories(userId = null) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM categories 
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY is_default DESC, name ASC
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function addCategory(name, emoji, userId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO categories (name, emoji, is_default, user_id)
      VALUES (?, ?, 0, ?)
    `);
    
    stmt.run(name, emoji, userId, function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      db.get('SELECT * FROM categories WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    
    stmt.finalize();
  });
}

// Expense operations
async function generateUniqueKey() {
  return new Promise((resolve, reject) => {
    function tryKey() {
      const key = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      
      db.get('SELECT id FROM expenses WHERE unique_key = ?', [key], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          tryKey(); // Key exists, try again
        } else {
          resolve(key);
        }
      });
    }
    
    tryKey();
  });
}

async function addExpense(name, amount, categoryId, userId, date = null) {
  const uniqueKey = await generateUniqueKey();
  const expenseDate = date || new Date().toISOString().split('T')[0];
  
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO expenses (unique_key, name, amount, category_id, user_id, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(uniqueKey, name, amount, categoryId, userId, expenseDate, function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      db.get('SELECT * FROM expenses WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    
    stmt.finalize();
  });
}

async function updateExpense(uniqueKey, userId, updates) {
  return new Promise((resolve, reject) => {
    const setClause = [];
    const values = [];
    
    if (updates.name) {
      setClause.push('name = ?');
      values.push(updates.name);
    }
    
    if (updates.amount) {
      setClause.push('amount = ?');
      values.push(updates.amount);
    }
    
    if (updates.categoryId) {
      setClause.push('category_id = ?');
      values.push(updates.categoryId);
    }
    
    if (updates.date) {
      setClause.push('date = ?');
      values.push(updates.date);
    }
    
    values.push(uniqueKey, userId);
    
    const query = `
      UPDATE expenses 
      SET ${setClause.join(', ')}
      WHERE unique_key = ? AND user_id = ?
    `;
    
    db.run(query, values, function(err) {
      if (err) {
        reject(err);
        return;
      }
      
      db.get('SELECT * FROM expenses WHERE unique_key = ? AND user_id = ?', [uniqueKey, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  });
}

async function deleteExpense(uniqueKey, userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM expenses WHERE unique_key = ? AND user_id = ?', [uniqueKey, userId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        resolve(null);
        return;
      }
      
      db.run('DELETE FROM expenses WHERE unique_key = ? AND user_id = ?', [uniqueKey, userId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  });
}

async function getExpenses(userId, startDate = null, endDate = null) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT e.*, c.name as category_name, c.emoji as category_emoji
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ?
    `;
    
    const values = [userId];
    
    if (startDate) {
      query += ' AND e.date >= ?';
      values.push(startDate);
    }
    
    if (endDate) {
      query += ' AND e.date <= ?';
      values.push(endDate);
    }
    
    query += ' ORDER BY e.date DESC, e.created_at DESC';
    
    db.all(query, values, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function getExpenseSummary(userId, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        c.name as category_name,
        c.emoji as category_emoji,
        SUM(e.amount) as total_amount,
        COUNT(e.id) as expense_count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ? AND e.date >= ? AND e.date <= ?
      GROUP BY c.id, c.name, c.emoji
      ORDER BY total_amount DESC
    `;
    
    db.all(query, [userId, startDate, endDate], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
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