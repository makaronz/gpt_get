require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

const app = express();
const port = process.env.PORT || 3001;
const THREADS_FILE_PATH = path.join(__dirname, 'threads.json');
let threadStore = []; // In-memory store for thread IDs and basic info

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

// --- Helper functions for thread storage ---
async function loadThreads() {
    try {
        // Check if file exists
        await fsPromises.access(THREADS_FILE_PATH);
        const data = await fsPromises.readFile(THREADS_FILE_PATH, 'utf8');
        // Prevent parsing empty file
        if (data.trim() === '') {
             threadStore = [];
        } else {
             threadStore = JSON.parse(data);
        }
        console.log('Threads loaded from file:', threadStore.length > 0 ? `${threadStore.length} threads` : 'empty');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('threads.json not found. Starting with empty store and creating file.');
            threadStore = [];
            await saveThreads(); // Create the file with an empty array
        } else if (error instanceof SyntaxError) {
             console.error('Error parsing threads.json:', error);
             // Handle corrupted file, e.g., start with empty or backup
             threadStore = [];
        } else {
            console.error('Error loading threads:', error);
            threadStore = []; // Start with empty store on other errors
        }
    }
}

async function saveThreads() {
    try {
        await fsPromises.writeFile(THREADS_FILE_PATH, JSON.stringify(threadStore, null, 2));
        // console.log('Threads saved to file.'); // Optional: log on save
    } catch (error) {
        console.error('Error saving threads:', error);
    }
}
// --- End Helper functions ---


// --- Routes ---

// Endpoint to create a new conversation (thread)
app.post('/api/conversations', async (req, res) => {
    console.log('Creating new conversation...');
    try {
        const { title } = req.body; // Optional title from request
        const metadata = title ? { title: title } : {};

        const thread = await openai.beta.threads.create({
            metadata: metadata
        });
        console.log('New thread created:', thread.id);

        const newThreadInfo = {
            id: thread.id,
            // Use metadata title or generate one
            title: thread.metadata?.title || `Thread ${thread.id.substring(7)}...`, // Shorten default title
            created_at: thread.created_at || Math.floor(Date.now() / 1000) // Use API timestamp if available
        };

        // Add to the beginning of the array for newest first
        threadStore.unshift(newThreadInfo);
        await saveThreads();

        res.status(201).json(newThreadInfo);
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            error: 'Failed to create conversation',
            details: error.message
        });
    }
});

// Endpoint to get list of conversations
app.get('/api/conversations', async (req, res) => {
    console.log('Fetching conversations from store...');
    try {
        // Return the threads stored in memory (loaded from file)
        // We could potentially fetch metadata for each thread here, but it's slow.
        // For now, return the stored basic info.
        res.json({ data: threadStore });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            error: 'Failed to fetch conversations',
            details: error.message
        });
    }
});

// Endpoint to get messages for a specific conversation (thread)
app.get('/api/conversations/:id', async (req, res) => {
    const threadId = req.params.id;
    console.log('Fetching messages for thread:', threadId);
    try {
        // Check if thread exists in our store (optional, but good practice)
        // const threadExists = threadStore.some(t => t.id === threadId);
        // if (!threadExists) {
        //     return res.status(404).json({
        //         error: 'Conversation (thread) not found in local store',
        //         details: `Thread with ID ${threadId} not found locally.`
        //     });
        // }

        const messages = await openai.beta.threads.messages.list(threadId, {
            order: 'asc' // Sort from oldest to newest
        });
        console.log(`Messages response for ${threadId}:`, messages.data.length > 0 ? `${messages.data.length} messages` : 'empty');

        const formattedMessages = messages.data.map(msg => {
            let contentValue = 'No content found';
            if (msg.content && msg.content.length > 0 && msg.content[0].type === 'text' && msg.content[0].text) {
                contentValue = msg.content[0].text.value;
            } else {
                 console.warn(`Message ${msg.id} in thread ${threadId} has unexpected content structure:`, msg.content);
            }
            return {
                id: msg.id,
                role: msg.role,
                content: [{ text: { value: contentValue } }]
            };
        });

        res.json({ data: formattedMessages });
    } catch (error) {
        console.error(`Error fetching conversation details for ${threadId}:`, error);
        if (error.status === 404) {
             res.status(404).json({
                error: 'Conversation (thread) not found on OpenAI',
                details: `Thread with ID ${threadId} not found.`
            });
        } else {
            res.status(500).json({
                error: 'Failed to fetch conversation details',
                details: error.message
            });
        }
    }
});

// --- End Routes ---


// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

// Start server function
async function startServer() {
    await loadThreads(); // Load threads before starting the server
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${port}`);
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('Public directory:', path.join(__dirname, 'public'));
    });
}

startServer(); // Call the async function to start the server