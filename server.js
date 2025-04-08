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
    console.log('Fetching conversations (using mock data)...');
    // UWAGA: API OpenAI Threads nie pozwala na globalne listowanie wątków.
    // Aplikacja musiałaby przechowywać listę ID wątków.
    // Na potrzeby MVP zwracamy statyczną listę.
    // W przyszłości należy zaimplementować mechanizm tworzenia/przechowywania wątków.
    try {
        // Przykładowe dane wątków
        const mockThreads = [
            { id: "thread_abc123", created_at: Math.floor(Date.now() / 1000) - 3600, title: "Example Thread 1" },
            { id: "thread_def456", created_at: Math.floor(Date.now() / 1000) - 7200, title: "Example Thread 2" }
        ];
        // Można by spróbować pobrać listę asystentów i ich wątków, jeśli taka logika istnieje
        // const threads = await openai.beta.threads.list(); // Ta metoda nie istnieje
        // console.log('Threads response:', threads);
        res.json({ data: mockThreads });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            error: 'Failed to fetch conversations',
            details: error.message
        });
    }
});

app.get('/api/conversations/:id', async (req, res) => {
    const threadId = req.params.id;
    console.log('Fetching messages for thread:', threadId);
    try {
        // Pobieranie wiadomości dla danego wątku (thread)
        const messages = await openai.beta.threads.messages.list(threadId, {
            order: 'asc' // Sortuj od najstarszej do najnowszej
        });
        console.log('Messages response:', messages);

        // Mapowanie danych do formatu oczekiwanego przez frontend
        // Zakładamy, że content jest typu 'text'
        const formattedMessages = messages.data.map(msg => {
            // Sprawdzamy, czy content istnieje i ma oczekiwaną strukturę
            let contentValue = 'No content found'; // Domyślna wartość
            if (msg.content && msg.content.length > 0 && msg.content[0].type === 'text' && msg.content[0].text) {
                contentValue = msg.content[0].text.value;
            } else {
                 console.warn(`Message ${msg.id} has unexpected content structure:`, msg.content);
            }
            return {
                id: msg.id,
                role: msg.role,
                // Frontend oczekuje content jako tablicy obiektów z polem text.value
                content: [{ text: { value: contentValue } }]
            };
        });

        res.json({ data: formattedMessages });
    } catch (error) {
        console.error('Error fetching conversation details:', error);
        // Lepsza obsługa błędów specyficznych dla API (np. 404 Not Found dla wątku)
        if (error.status === 404) {
             res.status(404).json({
                error: 'Conversation (thread) not found',
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