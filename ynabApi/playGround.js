import fs from 'fs';
import axios from 'axios';

const YNAB_API_URL = 'https://api.youneedabudget.com/v1';

export const getCategories = async () => {
    const YNAB_ACCESS_TOKEN = process.env.YNAB_ACCESS_TOKEN;
    const BUDGET_ID = process.env.BUDGET_ID;
    console.log('Getting categories...', YNAB_ACCESS_TOKEN);
    
    try {
        const response = await axios.get(`${YNAB_API_URL}/budgets/${BUDGET_ID}/categories`, {
            headers: {
                Authorization: `Bearer ${YNAB_ACCESS_TOKEN}`,
            },
        });
        
        // Log the categories to the console for debugging
        console.log('Categories:', JSON.stringify(response.data, null, 2));

        // Write the categories to a file called Categories.json
        fs.writeFile('Categories.json', JSON.stringify(response.data, null, 2), (err) => {
            if (err) {
                console.error('Error writing to Categories.json:', err);
            } else {
                console.log('Categories saved to Categories.json');
            }
        });
    } catch (error) {
        console.error('Error fetching categories:', error.response?.data || error.message);
    }
};

export const uploadExpense = async (payee, categoryId, amount, memo) => {
    const account_id = process.env.ACCOUNT_ID;
    const YNAB_ACCESS_TOKEN = process.env.YNAB_ACCESS_TOKEN;
    const transaction = {
        transaction: {
            account_id,
            date: new Date().toISOString().split('T')[0], // Today's date
            amount: amount * 1000, // Convert to milliunits
            payee_name: payee,
            category_id: categoryId,
            memo: memo,
            cleared: 'cleared',
            approved: true,
        },
    };
};


export async function getCreditCardAccountId() {
    const accessToken = process.env.YNAB_ACCESS_TOKEN;
    const budgetId = process.env.BUDGET_ID;
  try {
    const response = await axios.get(`https://api.youneedabudget.com/v1/budgets/${budgetId}/accounts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('Categories:', JSON.stringify(response.data, null, 2));

    const accounts = response.data.data.accounts;
    const creditCardAccount = accounts.find(account => account.type === 'credit');
    
    if (creditCardAccount) {
    //   console.log('Credit Card Account ID:', creditCardAccount.id);
    } else {
    //   console.log('No credit card account found.');
    }
  } catch (error) {
    console.error('Error fetching accounts:', error);
    // console.error('Error fetching accounts:', error);
  }
}

// getCreditCardAccountId();
