const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Enable Supabase Client
const supabase = require('./utils/supabase'); 

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- Auth Middleware ---
async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization Header' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    try {
        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            console.error('Auth Error:', error.message);
            // Only return 401 for actual auth failures, not network/server issues
            if (error.status === 401 || error.status === 403 || error.message.includes('Invalid') || error.message.includes('expired')) {
                return res.status(401).json({ error: 'Invalid or Expired Token' });
            }
            // For other errors (e.g. Supabase down), return 500
            return res.status(500).json({ error: 'Authentication Service Error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (err) {
        console.error('Auth Exception:', err);
        res.status(500).json({ error: 'Authentication Failed' });
    }
}

// --- Helper to call n8n ---
async function forwardToN8N(webhookUrl, payload, res) {
    if (!webhookUrl) {
        return res.status(500).json({ error: 'N8N Webhook URL not configured' });
    }

    try {
        console.log(`Forwarding to n8n: ${webhookUrl}`);
        // Send data to n8n
        const response = await axios.post(webhookUrl, payload);
        
        // Return n8n's response back to frontend
        res.json(response.data);
    } catch (error) {
        console.error('N8N Error:', error.message);
        if (error.response) {
             console.error('N8N Response:', error.response.data);
             res.status(error.response.status).json(error.response.data);
        } else {
             res.status(502).json({ error: 'Failed to communicate with automation engine' });
        }
    }
}

// --- Endpoints ---

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Expense Tracker Proxy is running',
    mode: 'n8n-integrated',
    timestamp: new Date().toISOString()
  });
});

// 2. Get Recent Transactions -> Call n8n Webhook
app.get('/api/transactions', authenticateUser, async (req, res) => {
    const userId = req.user.id; 
    const webhookUrl = process.env.N8N_WEBHOOK_GET_TRANSACTIONS;
    
    // Extract dates from Query Params 
    // (e.g. ?start=2023-10-01&end=2023-10-31)
    const { start, end } = req.query;

    await forwardToN8N(webhookUrl, { 
        action: 'get_recent_transactions',
        userId: userId,
        startDate: start,
        endDate: end
    }, res);
});

// 2b. Add New Transaction -> Call n8n Webhook
app.post('/api/transactions', authenticateUser, async (req, res) => {
    const userId = req.user.id; // From Auth Middleware
    const webhookUrl = process.env.N8N_WEBHOOK_ADD_TRANSACTION;

    // Validate Input
    const { amount, date, category_name, note, type } = req.body;
    if (!amount || !date || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    await forwardToN8N(webhookUrl, {
        action: 'add_transaction',
        userId: userId,
        payload: {
            amount, date, category_name, note, type
        }
    }, res);
});

// 2c. Delete Transaction -> Call n8n Webhook
app.delete('/api/transactions/:id', authenticateUser, async (req, res) => {
    const userId = req.user.id;
    const transactionId = req.params.id;
    const webhookUrl = process.env.N8N_WEBHOOK_DELETE_TRANSACTION;

    await forwardToN8N(webhookUrl, {
        action: 'delete_transaction',
        userId: userId,
        transactionId: transactionId
    }, res);
});

// 2d. Update Transaction -> Call n8n Webhook
app.put('/api/transactions/:id', authenticateUser, async (req, res) => {
    const userId = req.user.id;
    const transactionId = req.params.id;
    const webhookUrl = process.env.N8N_WEBHOOK_UPDATE_TRANSACTION;

    const { amount, date, category_name, note, type } = req.body;

    await forwardToN8N(webhookUrl, {
        action: 'update_transaction',
        userId: userId,
        transactionId: transactionId,
        payload: {
            amount, date, category_name, note, type
        }
    }, res);
});

// 3. Get Stats (Dashboard or Profile) -> Call n8n Webhook
app.get('/api/stats', authenticateUser, async (req, res) => {
    const userId = req.user.id; 
    const webhookUrl = process.env.N8N_WEBHOOK_GET_STATS;
    const { startDate, mode } = req.query;

    // Determine Action based on Mode
    let action = 'get_dashboard_stats'; // Default
    if (mode === 'profile') {
        action = 'get_profile_stats';
    }

    await forwardToN8N(webhookUrl, { 
        action: action,
        userId: userId,
        startDate: startDate 
    }, res);
});

// 4. Get User Categories -> Call n8n Webhook
app.get('/api/categories', authenticateUser, async (req, res) => {
    const userId = req.user.id;
    const webhookUrl = process.env.N8N_WEBHOOK_GET_CATEGORIES;

    await forwardToN8N(webhookUrl, {
        action: 'get_categories',
        userId: userId
    }, res);
});

// 5. Get Category Breakdown (Stats) -> Call n8n Webhook
app.get('/api/stats/categories', authenticateUser, async (req, res) => {
    const userId = req.user.id;
    const webhookUrl = process.env.N8N_WEBHOOK_GET_CATEGORY_STATS;
    const { startDate, endDate } = req.query;

    await forwardToN8N(webhookUrl, {
        action: 'get_category_stats',
        userId: userId,
        startDate: startDate,
        endDate: endDate
    }, res);
});



// Start Server if running locally (Standalone)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running locally on http://localhost:${PORT}`);
    });
}

// Main export for Vercel
module.exports = app;
