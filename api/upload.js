const multer = require('multer');
const Papa = require('papaparse');

// Configure multer for serverless
const upload = multer({ storage: multer.memoryStorage() });

// Global variable to store cleaned data (in production, use a database)
let cleanedData = [];

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

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
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
    // Run multer middleware
    await runMiddleware(req, res, upload.single('file'));

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

        // Store in global object for other functions to access
        global.cleanedData = cleanedData;

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
}