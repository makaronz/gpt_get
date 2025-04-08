require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Logowanie wszystkich żądań
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Initialize OpenAI
console.log('Initializing OpenAI with API key:', process.env.OPENAI_API_KEY ? 'Key exists' : 'No key found');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Routes
app.get('/api/conversations', async (req, res) => {
    console.log('Fetching conversations...');
    try {
        const response = await openai.models.list();
        console.log('Models response:', response);
        const conversations = response.data.map(model => ({
            id: model.id,
            created_at: Math.floor(Date.now() / 1000),
            title: model.id
        }));
        res.json({ data: conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ 
            error: 'Failed to fetch conversations',
            details: error.message 
        });
    }
});

app.get('/api/conversations/:id', async (req, res) => {
    console.log('Fetching conversation:', req.params.id);
    try {
        const conversationId = req.params.id;
        const messages = {
            data: [
                {
                    role: 'user',
                    content: [{ text: { value: 'Hello, how are you?' } }]
                },
                {
                    role: 'assistant',
                    content: [{ text: { value: 'I am doing well, thank you!' } }]
                }
            ]
        };
        res.json(messages);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ 
            error: 'Failed to fetch conversation',
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Public directory:', path.join(__dirname, 'public'));
}); 