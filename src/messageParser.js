/**
 * Message parser for extracting expense information and commands
 */

// Regular expressions for parsing
const EXPENSE_PATTERNS = [
  // "Coffee $5.50" or "Coffee 5.50"
  /^(.+?)\s+\$?(\d+(?:\.\d{1,2})?)$/,
  
  // "Coffee 5$" - dollar sign after amount
  /^(.+?)\s+(\d+(?:\.\d{1,2})?)\$$/,
  
  // "$5.50 Coffee" or "5.50 Coffee"
  /^\$?(\d+(?:\.\d{1,2})?)\s+(.+)$/,
  
  // "Coffee for $5.50" or "Coffee for 5.50"
  /^(.+?)\s+for\s+\$?(\d+(?:\.\d{1,2})?)$/,
  
  // "Spent $5.50 on Coffee" or "Spent 5.50 on Coffee"
  /^spent\s+\$?(\d+(?:\.\d{1,2})?)\s+on\s+(.+)$/i
];

const COMMAND_PATTERNS = {
  // Edit expense: "change 0001 to shopping"
  EDIT_CATEGORY: /^change\s+(\d{4})\s+to\s+(.+)$/i,
  
  // Delete expense: "delete 0001"
  DELETE: /^delete\s+(\d{4})$/i,
  
  // Add category: "add category Investments"
  ADD_CATEGORY: /^add\s+category\s+(.+)$/i,
  
  // Show categories: "show categories" or "show all categories" or "show category"
  SHOW_CATEGORIES: /^show\s+(all\s+)?categor(y|ies)$/i,
  
  // Summary commands
  SUMMARY_CURRENT: /^summary(\s+please)?$/i,
  SUMMARY_MONTHS: /^summary\s+for\s+last\s+(\d+)\s+months?$/i,
  
  // Show all expenses: "show all expenses" or "show all of my expenses"
  SHOW_ALL: /^show\s+all(\s+of\s+my)?\s+expenses?$/i,
  
  // Help command
  HELP: /^(help|\/help)$/i,
  
  // Start command  
  START: /^(\/start|start)$/i
};

/**
 * Parse message to extract expense information
 */
function parseExpense(text) {
  const cleanText = text.trim();
  
  for (const pattern of EXPENSE_PATTERNS) {
    const match = cleanText.match(pattern);
    
    if (match) {
      let name, amount;
      
      // Handle different pattern matches
      if (pattern === EXPENSE_PATTERNS[0] || pattern === EXPENSE_PATTERNS[1] || pattern === EXPENSE_PATTERNS[3]) {
        // Name comes first: "Coffee $5.50", "Coffee 5$", or "Coffee for $5.50"
        name = match[1].trim();
        amount = parseFloat(match[2]);
      } else if (pattern === EXPENSE_PATTERNS[2]) {
        // Amount comes first: "$5.50 Coffee"
        amount = parseFloat(match[1]);
        name = match[2].trim();
      } else if (pattern === EXPENSE_PATTERNS[4]) {
        // "Spent $5.50 on Coffee"
        amount = parseFloat(match[1]);
        name = match[2].trim();
      }
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        continue;
      }
      
      // Clean up name
      name = name.replace(/^(on\s+)?/, '').trim();
      
      if (name.length === 0) {
        continue;
      }
      
      return {
        name: capitalizeWords(name),
        amount: parseFloat(amount.toFixed(2))
      };
    }
  }
  
  return null;
}

/**
 * Parse command from message
 */
function parseCommand(text) {
  const cleanText = text.trim();
  
  // Check each command pattern
  for (const [commandType, pattern] of Object.entries(COMMAND_PATTERNS)) {
    const match = cleanText.match(pattern);
    
    if (match) {
      switch (commandType) {
        case 'EDIT_CATEGORY':
          return {
            type: 'EDIT_CATEGORY',
            expenseId: match[1],
            newCategory: capitalizeWords(match[2].trim())
          };
          
        case 'DELETE':
          return {
            type: 'DELETE',
            expenseId: match[1]
          };
          
        case 'ADD_CATEGORY':
          return {
            type: 'ADD_CATEGORY',
            categoryName: capitalizeWords(match[1].trim())
          };
          
        case 'SHOW_CATEGORIES':
          return { type: 'SHOW_CATEGORIES' };
          
        case 'SUMMARY_CURRENT':
          return { type: 'SUMMARY_CURRENT' };
          
        case 'SUMMARY_MONTHS':
          return {
            type: 'SUMMARY_MONTHS',
            months: parseInt(match[1])
          };
          
        case 'SHOW_ALL':
          return { type: 'SHOW_ALL' };
          
        case 'HELP':
          return { type: 'HELP' };
          
        case 'START':
          return { type: 'START' };
      }
    }
  }
  
  return null;
}

/**
 * Main message parsing function
 */
function parseMessage(text) {
  if (!text || typeof text !== 'string') {
    return { type: 'UNKNOWN' };
  }
  
  // First try to parse as command
  const command = parseCommand(text);
  if (command) {
    return command;
  }
  
  // Then try to parse as expense
  const expense = parseExpense(text);
  if (expense) {
    return {
      type: 'EXPENSE',
      ...expense
    };
  }
  
  // If neither, return unknown
  return { type: 'UNKNOWN' };
}

/**
 * Helper function to capitalize words
 */
function capitalizeWords(str) {
  return str.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate expense data
 */
function validateExpense(expense) {
  const errors = [];
  
  if (!expense.name || expense.name.trim().length === 0) {
    errors.push('Expense name is required');
  }
  
  if (!expense.amount || isNaN(expense.amount) || expense.amount <= 0) {
    errors.push('Valid expense amount is required');
  }
  
  if (expense.name && expense.name.length > 255) {
    errors.push('Expense name is too long (max 255 characters)');
  }
  
  if (expense.amount && expense.amount > 999999.99) {
    errors.push('Expense amount is too large');
  }
  
  return errors;
}

/**
 * Format amount for display
 */
function formatAmount(amount) {
  return parseFloat(amount).toFixed(2);
}

module.exports = {
  parseMessage,
  parseExpense,
  parseCommand,
  validateExpense,
  formatAmount,
  capitalizeWords
};