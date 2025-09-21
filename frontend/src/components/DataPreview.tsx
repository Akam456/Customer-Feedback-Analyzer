import React from 'react';

interface CleanedData {
  'Response Date': string;
  'Brand': string;
  'Digital CSAT': string;
  'Feedback': string;
}

interface DataPreviewProps {
  data: CleanedData[];
  totalRows: number;
}

const DataPreview: React.FC<DataPreviewProps> = ({ data, totalRows }) => {
  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col" style={{height: '700px'}}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Data Preview</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {totalRows} total rows
        </span>
        </div>
      </div>
      
      <div className="overflow-x-auto flex-1 flex flex-col p-4">
        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CSAT
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {row['Response Date']}
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      row['Brand'] === 'Crate' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {row['Brand']}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {row['Digital CSAT']}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                    {row['Feedback']}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {data.length < totalRows && (
          <div className="pt-4 text-center border-t border-gray-100 mt-auto">
            <p className="text-sm text-gray-500">
              Showing first {data.length} rows of {totalRows} total
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreview;