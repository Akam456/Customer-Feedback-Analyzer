const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Papa = require('papaparse');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

let cleanedData = [];

// Configuration for gpt-oss-20b model
const MODEL_CONFIG = {
  // Try Ollama first (local), then fallback to Transformers server
  endpoints: [
    {
      name: 'ollama',
      url: process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
      type: 'ollama'
    },
    {
      name: 'transformers',
      url: process.env.TRANSFORMERS_URL || 'http://localhost:8000/v1/chat/completions',
      type: 'openai-compatible'
    }
  ]
};

function cleanCSVData(data) {
  return data.map(row => {
    const cleanedRow = {};
    
    if (row['Response Date']) {
      cleanedRow['Response Date'] = row['Response Date'].split(' ')[0];
    }
    
    if (row['Digital Survey']) {
      const surveyText = row['Digital Survey'].toLowerCase();
      if (surveyText.includes('crate')) {
        cleanedRow['Brand'] = 'Crate';
      } else if (surveyText.includes('cb2')) {
        cleanedRow['Brand'] = 'CB2';
      } else {
        cleanedRow['Brand'] = row['Digital Survey'];
      }
    }
    
    cleanedRow['Digital CSAT'] = row['Digital CSAT'] || '';
    
    const feedbackParts = [
      row['Issue Comment'],
      row['Open Comment'],
      row['Improve Experience Comment'],
      row['Additional Comments']
    ].filter(Boolean);
    
    cleanedRow['Feedback'] = feedbackParts.join(' ').trim();
    
    return cleanedRow;
  });
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvText = req.file.buffer.toString('utf8');
    
    Papa.parse(csvText, {
      header: true,
      complete: (results) => {
        console.log('Raw CSV rows:', results.data.length);
        cleanedData = cleanCSVData(results.data);
        console.log('Cleaned data rows:', cleanedData.length);
        console.log('First few rows:', cleanedData.slice(0, 3));
        res.json({
          message: 'File uploaded and cleaned successfully',
          data: cleanedData.slice(0, 10),
          totalRows: cleanedData.length
        });
      },
      error: (error) => {
        res.status(500).json({ error: 'Failed to parse CSV: ' + error.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process file: ' + error.message });
  }
});

app.get('/api/data', (req, res) => {
  res.json({
    data: cleanedData,
    totalRows: cleanedData.length
  });
});

// Function to call gpt-oss-20b model
async function callGPTOSS(message, dataContext) {
  for (const endpoint of MODEL_CONFIG.endpoints) {
    try {
      console.log(`Trying ${endpoint.name} endpoint...`);
      
      if (endpoint.type === 'ollama') {
        const response = await axios.post(endpoint.url, {
          model: 'llama3.2:latest',
          prompt: `You are a customer feedback analyst. Analyze the data and answer concisely.\n\n${dataContext}`,
          stream: false,
          options: {
            temperature: 0.3,
            num_ctx: 2048,
            num_predict: 400,
            top_k: 10,
            top_p: 0.5
          }
        }, {
          timeout: 30000
        });
        
        return response.data.response;
        
      } else if (endpoint.type === 'openai-compatible') {
        const response = await axios.post(endpoint.url, {
          model: 'llama3.2:latest',
          messages: [
            {
              role: "system",
              content: "You are a customer feedback analyst. Provide clear, actionable insights based on the data provided. Be conversational and helpful. Reasoning: medium"
            },
            {
              role: "user",
              content: dataContext
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        return response.data.choices[0].message.content;
      }
    } catch (error) {
      console.log(`${endpoint.name} failed:`, error.message);
      continue;
    }
  }
  
  // If all endpoints fail, provide detailed analysis using the data we already processed
  const brandCounts = {};
  const csatByBrand = {};
  const csatStats = { total: 0, sum: 0, validScores: [] };
  const commonWords = {};
  const issueKeywords = {};
  
  console.log(`Processing ${cleanedData.length} rows for fallback analysis...`);
  let feedbackCount = 0;
  
  cleanedData.forEach((row, index) => {
    // Count brands
    brandCounts[row.Brand] = (brandCounts[row.Brand] || 0) + 1;
    
    // Calculate CSAT stats
    const csat = parseFloat(row['Digital CSAT']);
    if (!isNaN(csat)) {
      csatStats.total++;
      csatStats.sum += csat;
      csatStats.validScores.push(csat);
      
      // CSAT by brand
      if (!csatByBrand[row.Brand]) {
        csatByBrand[row.Brand] = { total: 0, sum: 0 };
      }
      csatByBrand[row.Brand].total++;
      csatByBrand[row.Brand].sum += csat;
    }
    
    // Extract common words and issue keywords from feedback - PROCESS ALL DATA
    if (row.Feedback && row.Feedback.trim()) {
      feedbackCount++;
      const feedback = row.Feedback.toLowerCase();
      
      // Debug first few entries
      if (index < 5) {
        console.log(`Row ${index}: "${feedback.substring(0, 100)}"`);
      }
      
      // Common issue keywords tracking
      const issueTerms = [
        'delivery', 'shipping', 'damaged', 'broken', 'defective', 'quality', 'poor', 'bad',
        'service', 'staff', 'rude', 'slow', 'wait', 'delay', 'late', 'missing', 'wrong',
        'order', 'cancel', 'refund', 'return', 'exchange', 'website', 'online', 'error',
        'payment', 'charge', 'billing', 'price', 'expensive', 'customer', 'support',
        'product', 'item', 'size', 'color', 'description', 'packaging', 'assembly'
      ];
      
      issueTerms.forEach(term => {
        if (feedback.includes(term)) {
          issueKeywords[term] = (issueKeywords[term] || 0) + 1;
        }
      });
      
      // Extract all meaningful words
      const words = feedback
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'with', 'they', 'were', 'have', 'from', 'would', 'been', 'will', 'your', 'their', 'when', 'where', 'what', 'very', 'much', 'more', 'some', 'just', 'like', 'also', 'only', 'even', 'well', 'good', 'great', 'nice'].includes(word));
      
      words.forEach(word => {
        commonWords[word] = (commonWords[word] || 0) + 1;
      });
    }
  });
  
  console.log(`Processed ${feedbackCount} feedback entries out of ${cleanedData.length} total rows`);
  console.log('Top issue keywords:', Object.entries(issueKeywords).sort(([,a], [,b]) => b - a).slice(0, 5));
  
  const avgCSAT = csatStats.total > 0 ? (csatStats.sum / csatStats.total).toFixed(2) : 'N/A';
  const topWords = Object.entries(commonWords)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => `${word} (${count})`)
    .join(', ');
    
  const topIssues = Object.entries(issueKeywords)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([issue, count]) => `${issue} (${count} mentions)`)
    .join(', ');
    
  const brandCSAT = Object.entries(csatByBrand)
    .map(([brand, stats]) => `${brand}: ${(stats.sum / stats.total).toFixed(2)}`)
    .join(', ');

  return `Based on analysis of your ${cleanedData.length} feedback entries:

**CSAT Analysis:**
- Overall average CSAT score: ${avgCSAT}/5
- Brand breakdown: ${brandCSAT}
- Total responses with CSAT data: ${csatStats.total}

**Brand Distribution:**
${Object.entries(brandCounts).map(([brand, count]) => `- ${brand}: ${count} responses (${((count/cleanedData.length)*100).toFixed(1)}%)`).join('\n')}

**Date Range:**
From ${cleanedData[0]?.['Response Date']} to ${cleanedData[cleanedData.length-1]?.['Response Date']}

**Most Common Feedback Terms:**
${topWords}

**Top Customer Issues:**
${topIssues}

**Key Insights:**
${message.toLowerCase().includes('csat') || message.toLowerCase().includes('score') ? `The average CSAT score across all ${cleanedData.length} responses is ${avgCSAT} out of 5.` : ''}
${message.toLowerCase().includes('cb2') ? `CB2 has ${brandCounts['CB2'] || 0} responses out of ${cleanedData.length} total (${(((brandCounts['CB2'] || 0)/cleanedData.length)*100).toFixed(1)}%).` : ''}
${message.toLowerCase().includes('crate') ? `Crate has ${brandCounts['Crate'] || 0} responses out of ${cleanedData.length} total (${(((brandCounts['Crate'] || 0)/cleanedData.length)*100).toFixed(1)}%).` : ''}

*Note: This analysis is generated directly from your data while the AI model loads. All calculations are based on the complete dataset of ${cleanedData.length} entries.*`;
}

// Function to generate chart data based on user request
function generateChartData(message, data) {
  const lowerMessage = message.toLowerCase();
  
  // Check if user is asking for charts/graphs
  if (!lowerMessage.includes('chart') && !lowerMessage.includes('graph') && !lowerMessage.includes('visualize') && !lowerMessage.includes('plot')) {
    return null;
  }
  
  // CSAT by Brand Chart
  if (lowerMessage.includes('csat') && (lowerMessage.includes('brand') || lowerMessage.includes('compare'))) {
    const csatByBrand = {};
    data.forEach(row => {
      const csat = parseFloat(row['Digital CSAT']);
      if (!isNaN(csat)) {
        if (!csatByBrand[row.Brand]) {
          csatByBrand[row.Brand] = { total: 0, sum: 0 };
        }
        csatByBrand[row.Brand].total++;
        csatByBrand[row.Brand].sum += csat;
      }
    });
    
    const labels = Object.keys(csatByBrand);
    const values = labels.map(brand => (csatByBrand[brand].sum / csatByBrand[brand].total).toFixed(1));
    
    return {
      type: 'bar',
      title: 'Average CSAT Score by Brand',
      data: {
        labels,
        datasets: [{
          label: 'Average CSAT Score',
          data: values,
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
          borderColor: ['#2563EB', '#059669', '#D97706', '#DC2626'],
          borderWidth: 1
        }]
      }
    };
  }
  
  // Brand Distribution Chart
  if (lowerMessage.includes('brand') && (lowerMessage.includes('distribution') || lowerMessage.includes('count') || lowerMessage.includes('breakdown'))) {
    const brandCounts = {};
    data.forEach(row => {
      brandCounts[row.Brand] = (brandCounts[row.Brand] || 0) + 1;
    });
    
    const labels = Object.keys(brandCounts);
    const values = Object.values(brandCounts);
    
    return {
      type: 'doughnut',
      title: 'Feedback Distribution by Brand',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      }
    };
  }
  
  // CSAT Distribution Chart
  if (lowerMessage.includes('csat') && lowerMessage.includes('distribution')) {
    const csatRanges = {
      '1-2': 0,
      '3-4': 0,
      '5-6': 0,
      '7-8': 0,
      '9-10': 0
    };
    
    data.forEach(row => {
      const csat = parseFloat(row['Digital CSAT']);
      if (!isNaN(csat)) {
        if (csat <= 2) csatRanges['1-2']++;
        else if (csat <= 4) csatRanges['3-4']++;
        else if (csat <= 6) csatRanges['5-6']++;
        else if (csat <= 8) csatRanges['7-8']++;
        else csatRanges['9-10']++;
      }
    });
    
    return {
      type: 'bar',
      title: 'CSAT Score Distribution',
      data: {
        labels: Object.keys(csatRanges),
        datasets: [{
          label: 'Number of Responses',
          data: Object.values(csatRanges),
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          borderWidth: 1
        }]
      }
    };
  }
  
  return null;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (cleanedData.length === 0) {
      return res.json({
        response: "No data has been uploaded yet. Please upload a CSV file first."
      });
    }

    // Create comprehensive data analysis for AI processing
    const brandCounts = {};
    const csatByBrand = {};
    const csatStats = { total: 0, sum: 0 };
    const feedbackSample = [];
    const dateRange = { first: null, last: null };
    const issueKeywords = {};
    const commonWords = {};
    
    cleanedData.forEach((row, index) => {
      // Count brands
      brandCounts[row.Brand] = (brandCounts[row.Brand] || 0) + 1;
      
      // Track date range
      if (!dateRange.first) dateRange.first = row['Response Date'];
      dateRange.last = row['Response Date'];
      
      // Calculate CSAT stats
      const csat = parseFloat(row['Digital CSAT']);
      if (!isNaN(csat)) {
        csatStats.total++;
        csatStats.sum += csat;
        
        // CSAT by brand
        if (!csatByBrand[row.Brand]) {
          csatByBrand[row.Brand] = { total: 0, sum: 0 };
        }
        csatByBrand[row.Brand].total++;
        csatByBrand[row.Brand].sum += csat;
      }
      
      // Process ALL feedback for comprehensive issue analysis
      if (row.Feedback && row.Feedback.trim()) {
        const feedback = row.Feedback.toLowerCase();
        
        // Track specific customer issue keywords
        const issueTerms = [
          'delivery', 'shipping', 'damaged', 'broken', 'defective', 'quality', 'poor', 'bad',
          'service', 'staff', 'rude', 'slow', 'wait', 'delay', 'late', 'missing', 'wrong',
          'order', 'cancel', 'refund', 'return', 'exchange', 'website', 'online', 'error',
          'payment', 'charge', 'billing', 'price', 'expensive', 'customer', 'support',
          'product', 'item', 'size', 'color', 'description', 'packaging', 'assembly'
        ];
        
        issueTerms.forEach(term => {
          if (feedback.includes(term)) {
            issueKeywords[term] = (issueKeywords[term] || 0) + 1;
          }
        });
        
        // Extract meaningful words for broader analysis
        const words = feedback
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3 && !['this', 'that', 'with', 'they', 'were', 'have', 'from', 'would', 'been', 'will', 'your', 'their', 'when', 'where', 'what', 'very', 'much', 'more', 'some', 'just', 'like', 'also', 'only', 'even', 'well', 'good', 'great', 'nice'].includes(word));
        
        words.forEach(word => {
          commonWords[word] = (commonWords[word] || 0) + 1;
        });
      }
      
      // Take a smaller sample for detailed feedback examples
      if (index < 5 || index >= cleanedData.length - 5 || index % Math.max(1, Math.floor(cleanedData.length / 20)) === 0) {
        feedbackSample.push({
          Date: row['Response Date'],
          Brand: row.Brand,
          CSAT: row['Digital CSAT'],
          Feedback: row.Feedback?.substring(0, 100)
        });
      }
    });

    // Create comprehensive context with full dataset analysis
    const avgCSAT = csatStats.total > 0 ? (csatStats.sum / csatStats.total).toFixed(2) : 'N/A';
    const brandCSATInfo = Object.entries(csatByBrand)
      .map(([brand, stats]) => `${brand}: ${(stats.sum / stats.total).toFixed(2)} (${stats.total} responses)`)
      .join(', ');

    const topIssues = Object.entries(issueKeywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => `${issue}: ${count}`)
      .join(', ');

    const topWords = Object.entries(commonWords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([word, count]) => `${word}: ${count}`)
      .join(', ');

    const dataContext = `DATASET: ${cleanedData.length} customer feedback entries analyzed
BRANDS: ${Object.entries(brandCounts).map(([brand, count]) => `${brand}=${count}`).join(', ')}
CSAT: Overall=${avgCSAT}/5, By Brand: ${brandCSATInfo}
DATES: ${dateRange.first} to ${dateRange.last}

TOP CUSTOMER ISSUES (from all ${cleanedData.length} entries):
${topIssues}

COMMON FEEDBACK TERMS (from all ${cleanedData.length} entries):
${topWords}

SAMPLE FEEDBACK (${feedbackSample.length} examples):
${feedbackSample.map(row => `${row.Brand}|${row.CSAT}|${row.Feedback}`).join('\n')}

QUESTION: ${message}
ANSWER:`;

    // Check if user is requesting a chart
    const chartData = generateChartData(message, cleanedData);
    
    let response;
    if (chartData) {
      response = `Here's your ${chartData.title.toLowerCase()}:`;
    } else {
      response = await callGPTOSS(message, dataContext);
    }

    const responseObj = {
      response: response,
      dataUsed: cleanedData.length
    };

    if (chartData) {
      responseObj.chartData = chartData;
    }

    res.json(responseObj);

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});