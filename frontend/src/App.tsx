import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import DataPreview from './components/DataPreview';
import ChatInterface from './components/ChatInterface';
import FeatureCards from './components/FeatureCards';
import './App.css';

interface CleanedData {
  'Response Date': string;
  'Brand': string;
  'Digital CSAT': string;
  'Feedback': string;
}

function App() {
  const [uploadedData, setUploadedData] = useState<CleanedData[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isDataUploaded, setIsDataUploaded] = useState(false);

  const handleDataUpload = (data: CleanedData[], total: number) => {
    setUploadedData(data);
    setTotalRows(total);
    setIsDataUploaded(true);
  };

  const handleNewUpload = () => {
    const confirmed = window.confirm(
      `This will replace your current dataset of ${totalRows} rows. Are you sure you want to upload a new CSV file?`
    );
    if (confirmed) {
      setIsDataUploaded(false);
      setUploadedData([]);
      setTotalRows(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Customer Feedback Analyzer
          </h1>
          <p className="text-gray-600">
            Upload your CSV data and ask questions about customer feedback
          </p>
        </header>

        <div className="max-w-6xl mx-auto">
          {!isDataUploaded ? (
            <div>
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <FileUpload onDataUpload={handleDataUpload} />
              </div>
              <FeatureCards />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Current Dataset: {totalRows} rows
                  </h2>
                  <p className="text-sm text-gray-600">
                    Analyzing customer feedback data
                  </p>
                </div>
                <button
                  onClick={handleNewUpload}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload New CSV
                </button>
              </div>
              
              <div className="flex flex-col lg:flex-row space-y-8 lg:space-y-0 lg:space-x-8">
                <div className="lg:w-1/3">
                  <DataPreview data={uploadedData} totalRows={totalRows} />
                </div>
                <div className="lg:w-2/3">
                  <ChatInterface />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
