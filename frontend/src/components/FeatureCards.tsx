import React from 'react';

const FeatureCards: React.FC = () => {
  const features = [
    {
      title: "Interactive Analysis",
      description: "Ask questions in natural language",
      icon: (
        <div className="w-12 h-12 mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <rect x="3" y="3" width="7" height="7" fill="#22C55E" rx="1"/>
            <rect x="14" y="3" width="7" height="7" fill="#3B82F6" rx="1"/>
            <rect x="3" y="14" width="7" height="7" fill="#EF4444" rx="1"/>
            <rect x="14" y="14" width="7" height="7" fill="#F59E0B" rx="1"/>
          </svg>
        </div>
      )
    },
    {
      title: "Visual Insights", 
      description: "Charts and graphs for easy understanding",
      icon: (
        <div className="w-12 h-12 mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path d="M3 17L9 11L13 15L21 7" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17,7 21,7 21,11" stroke="#EF4444" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )
    },
    {
      title: "AI-Powered",
      description: "Smart recommendations and trends", 
      icon: (
        <div className="w-12 h-12 mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="9" fill="#06B6D4"/>
            <circle cx="8" cy="10" r="1.5" fill="white"/>
            <circle cx="16" cy="10" r="1.5" fill="white"/>
            <path d="M8 15C8.5 16 10 16.5 12 16.5S15.5 16 16 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {features.map((feature, index) => (
        <div 
          key={index}
          className="bg-white rounded-lg shadow-md p-6 text-center"
        >
          {feature.icon}
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {feature.title}
          </h3>
          <p className="text-gray-600 text-sm">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default FeatureCards;