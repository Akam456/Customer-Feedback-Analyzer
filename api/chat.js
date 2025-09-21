const axios = require('axios');

// Configuration for AI model
const MODEL_CONFIG = {
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

// Function to call AI model with fallback
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
              content: "You are a customer feedback analyst. Provide clear, actionable insights based on the data provided. Be conversational and helpful."
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

  // Fallback analysis using the data
  const cleanedData = global.cleanedData || [];

  if (cleanedData.length === 0) {
    return "No data available for analysis. Please upload a CSV file first.";
  }

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

    // Extract common words and issue keywords from feedback
    if (row.Feedback && row.Feedback.trim()) {
      feedbackCount++;
      const feedback = row.Feedback.toLowerCase();

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

**Most Common Feedback Terms:**
${topWords}

**Top Customer Issues:**
${topIssues}

**Key Insights:**
${message.toLowerCase().includes('csat') || message.toLowerCase().includes('score') ? `The average CSAT score across all ${cleanedData.length} responses is ${avgCSAT} out of 5.` : ''}
${message.toLowerCase().includes('cb2') ? `CB2 has ${brandCounts['CB2'] || 0} responses out of ${cleanedData.length} total (${(((brandCounts['CB2'] || 0)/cleanedData.length)*100).toFixed(1)}%).` : ''}
${message.toLowerCase().includes('crate') ? `Crate has ${brandCounts['Crate'] || 0} responses out of ${cleanedData.length} total (${(((brandCounts['Crate'] || 0)/cleanedData.length)*100).toFixed(1)}%).` : ''}

*Note: This analysis is generated directly from your data. All calculations are based on the complete dataset of ${cleanedData.length} entries.*`;
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

  return null;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, data } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use data from request body if available, fallback to global
    const cleanedData = data || global.cleanedData || [];

    if (cleanedData.length === 0) {
      return res.json({
        response: "No data has been uploaded yet. Please upload a CSV file first to start analyzing your customer feedback."
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

      // Process feedback for comprehensive issue analysis
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
      }

      // Take a sample for detailed feedback examples
      if (index < 5 || index >= cleanedData.length - 5 || index % Math.max(1, Math.floor(cleanedData.length / 20)) === 0) {
        feedbackSample.push({
          Date: row['Response Date'],
          Brand: row.Brand,
          CSAT: row['Digital CSAT'],
          Feedback: row.Feedback?.substring(0, 100)
        });
      }
    });

    // Create comprehensive context
    const avgCSAT = csatStats.total > 0 ? (csatStats.sum / csatStats.total).toFixed(2) : 'N/A';
    const brandCSATInfo = Object.entries(csatByBrand)
      .map(([brand, stats]) => `${brand}: ${(stats.sum / stats.total).toFixed(2)} (${stats.total} responses)`)
      .join(', ');

    const topIssues = Object.entries(issueKeywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => `${issue}: ${count}`)
      .join(', ');

    const dataContext = `DATASET: ${cleanedData.length} customer feedback entries analyzed
BRANDS: ${Object.entries(brandCounts).map(([brand, count]) => `${brand}=${count}`).join(', ')}
CSAT: Overall=${avgCSAT}/5, By Brand: ${brandCSATInfo}
DATES: ${dateRange.first} to ${dateRange.last}

TOP CUSTOMER ISSUES (from all ${cleanedData.length} entries):
${topIssues}

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
}