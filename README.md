# GPT Conversations Exporter

A simple application to view and export your ChatGPT conversations.

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   PORT=3000
   ```
4. Start the server:
   ```bash
   node server.js
   ```
5. Open your browser and navigate to `http://localhost:3000`

## Features

- View all your ChatGPT conversations
- Click on a conversation to see its details
- Export conversations to text files
- Simple and intuitive interface

## Usage

1. The main page shows a list of all your conversations
2. Click on any conversation to view its messages
3. Use the "Export to TXT" button to download the conversation as a text file 