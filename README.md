# Customer Feedback Analyzer

A full-stack web application that analyzes customer feedback from CSV files using AI-powered insights.

## Features

- **CSV Upload & Cleaning**: Automatically cleans and transforms customer feedback data
- **AI-Powered Analysis**: Uses OpenAI's open source gpt-oss-20b model to analyze feedback and answer questions
- **Chat Interface**: Conversational UI similar to ChatGPT
- **Data Visualizations**: Optional charts and graphs when requested
- **Modern Design**: Clean, startup-style interface with soft blues and warm greens

## Tech Stack

- **Frontend**: React + TailwindCSS
- **Backend**: Node.js + Express
- **Data Processing**: JavaScript with Papaparse
- **AI Integration**: OpenAI gpt-oss-20b (open source)
- **Visualizations**: Recharts

## Setup

### 1. Setup gpt-oss-20b Model
First, you need to run the gpt-oss-20b model locally. See [SETUP_GPT_OSS.md](./SETUP_GPT_OSS.md) for detailed instructions.

**Quick start with Ollama (recommended):**
```bash
# Install Ollama from https://ollama.com/
ollama pull gpt-oss:20b
ollama run gpt-oss:20b
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

The application will be available at http://localhost:3000

## Data Format

The application expects CSV files with customer feedback that will be cleaned to include:
- Response Date
- Brand (Crate or CB2)
- Digital CSAT
- Feedback (consolidated comments)
