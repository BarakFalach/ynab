import axios from "axios";
// const axios = require('axios');

const YNAB_API_URL = 'https://api.youneedabudget.com/v1';

export async function addExpense(date, payee, categoryId, amount, memo = '') {
    const { YNAB_ACCESS_TOKEN, BUDGET_ID } = process.env;
    const account_id = process.env.ACCOUNT_ID;
    const transaction = {
        transaction: {
            account_id,
            date,
            amount: amount * 1000, // Convert to milliunits
            payee_name: payee,
            category_id: categoryId,
            memo: memo,
            approved: false,
        },
    };

    try {
        const response = await axios.post(
            `${YNAB_API_URL}/budgets/${BUDGET_ID}/transactions`,
            transaction,
            {
                headers: {
                    Authorization: `Bearer ${YNAB_ACCESS_TOKEN}`,
                },
            }
        );
        console.log('Transaction added:', response.data);
    } catch (error) {
        console.error('Error adding transaction:', error.response?.data || error.message);
    }
}

// Example usage
// addExpense('Coffee Shop', '8ffd7d0d-f4e2-468c-be36-e6a365891441', 15.99, 'Morning coffee');

async function getAccountInfo() {
    console.log('Getting account info...', YNAB_ACCESS_TOKEN);
    try {
        const response = await axios.get(`${YNAB_API_URL}/budgets/${BUDGET_ID}/accounts`, {
            headers: {
                Authorization: `Bearer ${YNAB_ACCESS_TOKEN}`,
            },
        });
        // make print pretty 
        console.log('Account info:', JSON.stringify(response.data, null, 2));

        
    } catch (error) {
        console.error('Error fetching account info:', error.response?.data || error.message);
    }
}

async function getCategories() {
    try {
        const response = await axios.get(`${YNAB_API_URL}/budgets/${BUDGET_ID}/categories`, {
            headers: {
                Authorization: `Bearer ${YNAB_ACCESS_TOKEN}`,
            },
        });
        console.log('Categories:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error fetching categories:', error.response?.data || error.message);
    }
}

// getAccountInfo();

// getCategories();