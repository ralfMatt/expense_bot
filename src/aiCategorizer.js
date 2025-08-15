const OpenAI = require('openai');
require('dotenv').config();

const { getCategories } = require('./database-sheets');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Categorize expense using GPT-4
 */
async function categorizeExpense(expenseName, userId) {
  try {
    // Get available categories for the user
    const categories = await getCategories(userId);
    const categoryList = categories.map(cat => `${cat.name} ${cat.emoji}`).join(', ');
    
    const prompt = `
You are an AI assistant that categorizes expenses. Given an expense name and a list of available categories, choose the most appropriate category.

Expense: "${expenseName}"

Available categories: ${categoryList}

Rules:
1. Choose the MOST appropriate category from the list above
2. Respond with ONLY the category name (without emoji)
3. Be consistent with similar expenses
4. If unsure, choose the closest match

Category:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that categorizes expenses accurately and consistently."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.1, // Low temperature for consistent results
    });

    const suggestedCategory = completion.choices[0].message.content.trim();
    
    // Find the matching category from database
    const matchedCategory = categories.find(cat => 
      cat.name.toLowerCase() === suggestedCategory.toLowerCase()
    );
    
    if (matchedCategory) {
      return matchedCategory;
    } else {
      // Fallback to default category if no match found
      console.warn(`GPT suggested unknown category: ${suggestedCategory}. Using default.`);
      return categories.find(cat => cat.is_default) || categories[0];
    }
    
  } catch (error) {
    console.error('Error categorizing expense with AI:', error);
    
    // Fallback to rule-based categorization
    return await fallbackCategorize(expenseName, userId);
  }
}

/**
 * Fallback rule-based categorization when AI fails
 */
async function fallbackCategorize(expenseName, userId) {
  try {
    const categories = await getCategories(userId);
    const name = expenseName.toLowerCase();
    
    // Rule-based categorization patterns
    const patterns = {
      'Food & Dining': [
        'coffee', 'restaurant', 'food', 'pizza', 'burger', 'lunch', 'dinner', 
        'breakfast', 'starbucks', 'mcdonalds', 'kfc', 'subway', 'meal', 'snack',
        'cafe', 'bar', 'pub', 'drink', 'beer', 'wine'
      ],
      'Transportation': [
        'uber', 'lyft', 'taxi', 'bus', 'metro', 'gas', 'fuel', 'parking',
        'train', 'flight', 'car', 'toll', 'highway', 'transport'
      ],
      'Shopping': [
        'amazon', 'ebay', 'shop', 'store', 'mall', 'clothes', 'clothing',
        'shoes', 'electronics', 'gadget', 'phone', 'laptop', 'computer'
      ],
      'Groceries': [
        'grocery', 'supermarket', 'walmart', 'target', 'costco', 'milk',
        'bread', 'vegetables', 'fruits', 'meat', 'chicken', 'fish'
      ],
      'Utilities': [
        'electricity', 'water', 'gas bill', 'internet', 'phone bill',
        'cable', 'wifi', 'utility', 'electric', 'heating'
      ],
      'Entertainment': [
        'movie', 'cinema', 'netflix', 'spotify', 'game', 'concert',
        'theater', 'show', 'ticket', 'entertainment', 'streaming'
      ],
      'Health & Medical': [
        'doctor', 'hospital', 'pharmacy', 'medicine', 'medical', 'health',
        'dentist', 'clinic', 'prescription', 'checkup'
      ],
      'Travel': [
        'hotel', 'flight', 'airline', 'vacation', 'trip', 'travel',
        'airbnb', 'booking', 'luggage', 'visa', 'passport'
      ]
    };
    
    // Find matching category
    for (const [categoryName, keywords] of Object.entries(patterns)) {
      const category = categories.find(cat => cat.name === categoryName);
      if (category) {
        for (const keyword of keywords) {
          if (name.includes(keyword)) {
            return category;
          }
        }
      }
    }
    
    // Default to first category or create a generic one
    return categories.find(cat => cat.is_default) || categories[0];
    
  } catch (error) {
    console.error('Error in fallback categorization:', error);
    throw error;
  }
}

/**
 * Get category suggestions for user when adding custom category
 */
async function suggestCategoryEmoji(categoryName) {
  try {
    const prompt = `
Suggest an appropriate emoji for the expense category: "${categoryName}"

Rules:
1. Respond with ONLY the emoji character
2. Choose the most relevant and commonly used emoji
3. Avoid complex or uncommon emojis

Emoji:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const emoji = completion.choices[0].message.content.trim();
    
    // Validate that response is actually an emoji (rough check)
    if (emoji.length <= 4) {
      return emoji;
    } else {
      return '📝'; // Default emoji
    }
    
  } catch (error) {
    console.error('Error suggesting emoji:', error);
    return '📝'; // Default emoji
  }
}

/**
 * Validate AI response for category matching
 */
function findBestCategoryMatch(suggestedName, availableCategories) {
  // Exact match
  let match = availableCategories.find(cat => 
    cat.name.toLowerCase() === suggestedName.toLowerCase()
  );
  
  if (match) return match;
  
  // Partial match
  match = availableCategories.find(cat =>
    cat.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
    suggestedName.toLowerCase().includes(cat.name.toLowerCase())
  );
  
  if (match) return match;
  
  // No match found
  return null;
}

module.exports = {
  categorizeExpense,
  fallbackCategorize,
  suggestCategoryEmoji,
  findBestCategoryMatch
};