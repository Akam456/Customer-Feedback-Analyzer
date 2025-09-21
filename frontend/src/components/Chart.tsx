import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: any;
  title?: string;
  width?: number;
  height?: number;
}

const Chart: React.FC<ChartProps> = ({ type, data, title, width = 400, height = 300 }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: type === 'pie' || type === 'doughnut' ? undefined : {
      y: {
        beginAtZero: true,
      },
    },
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={data} options={options} />;
      case 'line':
        return <Line data={data} options={options} />;
      case 'pie':
        return <Pie data={data} options={options} />;
      case 'doughnut':
        return <Doughnut data={data} options={options} />;
      default:
        return <Bar data={data} options={options} />;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 my-4">
      <div style={{ width: `${width}px`, height: `${height}px` }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default Chart;