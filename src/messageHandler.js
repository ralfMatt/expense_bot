const { parseMessage, validateExpense, formatAmount } = require('./messageParser');
const { categorizeExpense, suggestCategoryEmoji, findBestCategoryMatch } = require('./aiCategorizer');
const { 
  getUser, 
  getCategories, 
  addCategory, 
  addExpense, 
  updateExpense, 
  deleteExpense,
  getExpenses,
  getExpenseSummary 
} = require('./database-sheets');
const { format, startOfMonth, endOfMonth, subMonths } = require('date-fns');

/**
 * Main message handler
 */
async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (!text) return;
  
  try {
    // Parse the message
    const parsed = parseMessage(text);
    
    // Handle different message types
    switch (parsed.type) {
      case 'START':
        await handleStart(bot, chatId, userId);
        break;
        
      case 'HELP':
        await handleHelp(bot, chatId);
        break;
        
      case 'EXPENSE':
        await handleExpense(bot, chatId, userId, parsed);
        break;
        
      case 'EDIT_CATEGORY':
        await handleEditCategory(bot, chatId, userId, parsed);
        break;
        
      case 'DELETE':
        await handleDelete(bot, chatId, userId, parsed);
        break;
        
      case 'ADD_CATEGORY':
        await handleAddCategory(bot, chatId, userId, parsed);
        break;
        
      case 'SHOW_CATEGORIES':
        await handleShowCategories(bot, chatId, userId);
        break;
        
      case 'SUMMARY_CURRENT':
        await handleSummary(bot, chatId, userId, 'current');
        break;
        
      case 'SUMMARY_MONTHS':
        await handleSummary(bot, chatId, userId, 'months', parsed.months);
        break;
        
      case 'SHOW_ALL':
        await handleShowAll(bot, chatId, userId);
        break;
        
      case 'UNKNOWN':
      default:
        await handleUnknown(bot, chatId);
        break;
    }
    
  } catch (error) {
    console.error('Error in message handler:', error);
    await bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
  }
}

/**
 * Handle /start command
 */
async function handleStart(bot, chatId, userId) {
  const user = await getUser(userId);
  const categories = await getCategories(user.id);
  
  const categoryList = categories
    .map(cat => `• ${cat.name} ${cat.emoji}`)
    .join('\n');
  
  const welcomeMessage = `👋 Welcome to SmartSpend Tracker${user.first_name ? `, ${user.first_name}` : ''}!

🏷️ Available Categories:
${categoryList}

💡 Just text me expenses like:
• "Coffee $5.50"
• "Uber $15"
• "Groceries 89.45"

📝 Commands:
• \`add category [name]\` - Add new category
• \`show categories\` - View all categories
• \`change [ID] to [category]\` - Edit expense category
• \`delete [ID]\` - Delete expense
• \`summary\` - Monthly summary
• \`summary for last X months\` - Multi-month summary
• \`show all expenses\` - List all expenses
• \`help\` - Show all commands

Ready to track your expenses! 🚀`;

  await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

/**
 * Handle help command
 */
async function handleHelp(bot, chatId) {
  const helpMessage = `🤖 SmartSpend Tracker Help

💰 **Adding Expenses:**
• "Coffee $5.50" or "Coffee 5.50"
• "$15 Uber" or "15 Uber"
• "Spent $25 on groceries"

✏️ **Managing Expenses:**
• \`change 0001 to shopping\` - Change category
• \`delete 0001\` - Delete expense

🏷️ **Categories:**
• \`add category Investments\` - Add new category
• \`show categories\` - View all categories

📊 **Reports:**
• \`summary\` - This month's summary
• \`summary for last 3 months\` - Multi-month summary
• \`show all expenses\` - List all expenses for this month

Each expense gets a unique ID (like 0001) that you can use to edit or delete it.

Happy tracking! 💸`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

/**
 * Handle expense addition
 */
async function handleExpense(bot, chatId, userId, parsed) {
  const user = await getUser(userId);
  
  // Validate expense
  const errors = validateExpense(parsed);
  if (errors.length > 0) {
    await bot.sendMessage(chatId, `❌ ${errors.join(', ')}`);
    return;
  }
  
  try {
    // Categorize the expense using AI
    const category = await categorizeExpense(parsed.name, user.id);
    
    // Add expense to database
    const expense = await addExpense(
      parsed.name,
      parsed.amount,
      category.id,
      user.id
    );
    
    // Send confirmation
    const confirmMessage = `✅ Added: ${expense.name} - $${formatAmount(expense.amount)} (${category.name} ${category.emoji}) [ID: ${expense.unique_key}]`;
    
    await bot.sendMessage(chatId, confirmMessage);
    
  } catch (error) {
    console.error('Error adding expense:', error);
    await bot.sendMessage(chatId, '❌ Failed to add expense. Please try again.');
  }
}

/**
 * Handle category editing
 */
async function handleEditCategory(bot, chatId, userId, parsed) {
  const user = await getUser(userId);
  
  try {
    // Find the category by name
    const categories = await getCategories(user.id);
    const targetCategory = findBestCategoryMatch(parsed.newCategory, categories);
    
    if (!targetCategory) {
      await bot.sendMessage(chatId, `❌ Category "${parsed.newCategory}" not found. Use "show categories" to see available categories.`);
      return;
    }
    
    // Update the expense
    const updatedExpense = await updateExpense(parsed.expenseId, user.id, {
      categoryId: targetCategory.id
    });
    
    if (!updatedExpense) {
      await bot.sendMessage(chatId, `❌ Expense ${parsed.expenseId} not found.`);
      return;
    }
    
    await bot.sendMessage(chatId, `✅ Updated: ${updatedExpense.name} category changed to ${targetCategory.name} ${targetCategory.emoji}`);
    
  } catch (error) {
    console.error('Error editing category:', error);
    await bot.sendMessage(chatId, '❌ Failed to update expense. Please try again.');
  }
}

/**
 * Handle expense deletion
 */
async function handleDelete(bot, chatId, userId, parsed) {
  const user = await getUser(userId);
  
  try {
    const deletedExpense = await deleteExpense(parsed.expenseId, user.id);
    
    if (!deletedExpense) {
      await bot.sendMessage(chatId, `❌ Expense ${parsed.expenseId} not found.`);
      return;
    }
    
    await bot.sendMessage(chatId, `✅ Deleted: ${deletedExpense.name} - $${formatAmount(deletedExpense.amount)}`);
    
  } catch (error) {
    console.error('Error deleting expense:', error);
    await bot.sendMessage(chatId, '❌ Failed to delete expense. Please try again.');
  }
}

/**
 * Handle adding new category
 */
async function handleAddCategory(bot, chatId, userId, parsed) {
  const user = await getUser(userId);
  
  try {
    // Check if category already exists
    const existingCategories = await getCategories(user.id);
    const existing = existingCategories.find(cat => 
      cat.name.toLowerCase() === parsed.categoryName.toLowerCase()
    );
    
    if (existing) {
      await bot.sendMessage(chatId, `❌ Category "${parsed.categoryName}" already exists.`);
      return;
    }
    
    // Suggest emoji using AI
    const emoji = await suggestCategoryEmoji(parsed.categoryName);
    
    // Add category
    const newCategory = await addCategory(parsed.categoryName, emoji, user.id);
    
    await bot.sendMessage(chatId, `✅ Added new category: ${newCategory.name} ${newCategory.emoji}`);
    
  } catch (error) {
    console.error('Error adding category:', error);
    await bot.sendMessage(chatId, '❌ Failed to add category. Please try again.');
  }
}

/**
 * Handle showing all categories
 */
async function handleShowCategories(bot, chatId, userId) {
  const user = await getUser(userId);
  
  try {
    const categories = await getCategories(user.id);
    
    const defaultCategories = categories.filter(cat => cat.is_default);
    const customCategories = categories.filter(cat => !cat.is_default);
    
    let message = '🏷️ **Your Categories:**\n\n';
    
    if (defaultCategories.length > 0) {
      message += '**Default Categories:**\n';
      defaultCategories.forEach(cat => {
        message += `• ${cat.name} ${cat.emoji}\n`;
      });
    }
    
    if (customCategories.length > 0) {
      message += '\n**Custom Categories:**\n';
      customCategories.forEach(cat => {
        message += `• ${cat.name} ${cat.emoji}\n`;
      });
    }
    
    message += '\n💡 Add new categories with: `add category [name]`';
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error showing categories:', error);
    await bot.sendMessage(chatId, '❌ Failed to load categories. Please try again.');
  }
}

/**
 * Handle summary requests
 */
async function handleSummary(bot, chatId, userId, type, months = 1) {
  const user = await getUser(userId);
  
  try {
    let startDate, endDate, title;
    const now = new Date();
    
    if (type === 'current') {
      startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      title = `📊 ${format(now, 'MMMM yyyy')} Summary`;
    } else {
      const monthsAgo = subMonths(now, months - 1);
      startDate = format(startOfMonth(monthsAgo), 'yyyy-MM-dd');
      endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      title = `📈 Last ${months} Month${months > 1 ? 's' : ''} Summary`;
    }
    
    const summary = await getExpenseSummary(user.id, startDate, endDate);
    
    if (summary.length === 0) {
      await bot.sendMessage(chatId, '📊 No expenses found for this period.');
      return;
    }
    
    const totalAmount = summary.reduce((sum, cat) => sum + parseFloat(cat.total_amount), 0);
    
    let message = `${title}\n\n`;
    message += `**Total: $${formatAmount(totalAmount)}**\n\n`;
    
    summary.forEach((cat, index) => {
      const percentage = ((parseFloat(cat.total_amount) / totalAmount) * 100).toFixed(0);
      message += `${cat.category_emoji || '📝'} ${cat.category_name || 'Uncategorized'}: $${formatAmount(cat.total_amount)} (${percentage}%)\n`;
    });
    
    // Show biggest category
    if (summary.length > 0) {
      const biggestCategory = summary[0];
      message += `\n🎯 **Biggest Category:** ${biggestCategory.category_name} ($${formatAmount(biggestCategory.total_amount)})`;
    }
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error generating summary:', error);
    await bot.sendMessage(chatId, '❌ Failed to generate summary. Please try again.');
  }
}

/**
 * Handle showing all expenses
 */
async function handleShowAll(bot, chatId, userId) {
  const user = await getUser(userId);
  
  try {
    const now = new Date();
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
    
    const expenses = await getExpenses(user.id, startDate, endDate);
    
    if (expenses.length === 0) {
      await bot.sendMessage(chatId, '📝 No expenses found for this month.');
      return;
    }
    
    let message = `📝 **${format(now, 'MMMM yyyy')} Expenses:**\n\n`;
    
    expenses.forEach(expense => {
      const expenseDate = format(new Date(expense.date), 'MMM dd');
      message += `[${expense.unique_key}] ${expense.name} - $${formatAmount(expense.amount)} (${expense.category_name || 'Uncategorized'}) - ${expenseDate}\n`;
    });
    
    const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    message += `\n**Total: $${formatAmount(total)}**`;
    
    // Split message if too long
    if (message.length > 4000) {
      const chunks = message.match(/[\s\S]{1,4000}/g) || [];
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
      }
    } else {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
    
  } catch (error) {
    console.error('Error showing all expenses:', error);
    await bot.sendMessage(chatId, '❌ Failed to load expenses. Please try again.');
  }
}

/**
 * Handle unknown messages
 */
async function handleUnknown(bot, chatId) {
  const message = `❓ I didn't understand that message.

Try:
• "Coffee $5.50" to add an expense
• "summary" for monthly summary  
• "help" for all commands`;

  await bot.sendMessage(chatId, message);
}

module.exports = {
  handleMessage
};