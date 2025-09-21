import React, { useState } from 'react';
import axios from 'axios';

interface CleanedData {
  'Response Date': string;
  'Brand': string;
  'Digital CSAT': string;
  'Feedback': string;
}

interface FileUploadProps {
  onDataUpload: (data: CleanedData[], total: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataUpload }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onDataUpload(response.data.data, response.data.totalRows);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-25 hover:shadow-md'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-600">Processing your file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">Upload your CSV file</p>
            <p className="text-sm text-gray-500">
              Drag and drop your customer feedback CSV here
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;