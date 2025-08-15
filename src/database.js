const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database initialization
async function initDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        emoji VARCHAR(10) DEFAULT '📝',
        is_default BOOLEAN DEFAULT FALSE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, user_id)
      )
    `);

    // Create expenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        unique_key VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    for (const category of defaultCategories) {
      await pool.query(`
        INSERT INTO categories (name, emoji, is_default, user_id)
        VALUES ($1, $2, TRUE, NULL)
        ON CONFLICT (name, user_id) DO NOTHING
      `, [category.name, category.emoji]);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// User operations
async function createUser(telegramId, username, firstName) {
  try {
    const result = await pool.query(`
      INSERT INTO users (telegram_id, username, first_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name
      RETURNING *
    `, [telegramId, username, firstName]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUser(telegramId) {
  try {
    const result = await pool.query(`
      SELECT * FROM users WHERE telegram_id = $1
    `, [telegramId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Category operations
async function getCategories(userId = null) {
  try {
    const result = await pool.query(`
      SELECT * FROM categories 
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY is_default DESC, name ASC
    `, [userId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

async function addCategory(name, emoji, userId) {
  try {
    const result = await pool.query(`
      INSERT INTO categories (name, emoji, is_default, user_id)
      VALUES ($1, $2, FALSE, $3)
      RETURNING *
    `, [name, emoji, userId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

// Expense operations
async function generateUniqueKey() {
  let key;
  let exists = true;
  
  while (exists) {
    // Generate 4-digit key (0001-9999)
    key = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    const result = await pool.query(`
      SELECT id FROM expenses WHERE unique_key = $1
    `, [key]);
    
    exists = result.rows.length > 0;
  }
  
  return key;
}

async function addExpense(name, amount, categoryId, userId, date = null) {
  try {
    const uniqueKey = await generateUniqueKey();
    const expenseDate = date || new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      INSERT INTO expenses (unique_key, name, amount, category_id, user_id, date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [uniqueKey, name, amount, categoryId, userId, expenseDate]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
}

async function updateExpense(uniqueKey, userId, updates) {
  try {
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.name) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    
    if (updates.amount) {
      setClause.push(`amount = $${paramCount++}`);
      values.push(updates.amount);
    }
    
    if (updates.categoryId) {
      setClause.push(`category_id = $${paramCount++}`);
      values.push(updates.categoryId);
    }
    
    if (updates.date) {
      setClause.push(`date = $${paramCount++}`);
      values.push(updates.date);
    }
    
    values.push(uniqueKey, userId);
    
    const result = await pool.query(`
      UPDATE expenses 
      SET ${setClause.join(', ')}
      WHERE unique_key = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `, values);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

async function deleteExpense(uniqueKey, userId) {
  try {
    const result = await pool.query(`
      DELETE FROM expenses 
      WHERE unique_key = $1 AND user_id = $2
      RETURNING *
    `, [uniqueKey, userId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

async function getExpenses(userId, startDate = null, endDate = null) {
  try {
    let query = `
      SELECT e.*, c.name as category_name, c.emoji as category_emoji
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 2;
    
    if (startDate) {
      query += ` AND e.date >= $${paramCount++}`;
      values.push(startDate);
    }
    
    if (endDate) {
      query += ` AND e.date <= $${paramCount++}`;
      values.push(endDate);
    }
    
    query += ` ORDER BY e.date DESC, e.created_at DESC`;
    
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
}

async function getExpenseSummary(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      SELECT 
        c.name as category_name,
        c.emoji as category_emoji,
        SUM(e.amount) as total_amount,
        COUNT(e.id) as expense_count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND e.date >= $2 AND e.date <= $3
      GROUP BY c.id, c.name, c.emoji
      ORDER BY total_amount DESC
    `, [userId, startDate, endDate]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting expense summary:', error);
    throw error;
  }
}

module.exports = {
  pool,
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