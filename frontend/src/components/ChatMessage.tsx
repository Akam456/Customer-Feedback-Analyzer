import React from 'react';
import Chart from './Chart';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  chartData?: {
    type: 'bar' | 'line' | 'pie' | 'doughnut';
    data: any;
    title?: string;
  };
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          message.isUser
            ? 'bg-chat-blue text-chat-blue-text ml-auto'
            : 'bg-chat-green text-chat-green-text'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        {message.chartData && (
          <Chart
            type={message.chartData.type}
            data={message.chartData.data}
            title={message.chartData.title}
            width={300}
            height={200}
          />
        )}
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;