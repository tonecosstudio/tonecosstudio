/**
 * ChartRenderer - Renderizador de charts com Recharts
 *
 * Este componente é carregado dinamicamente apenas quando necessário
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartRendererProps {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  config: any;
  height?: number;
}

export default function ChartRenderer({ type, data, config, height = 300 }: ChartRendererProps) {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {config.lines?.map((line: any, index: number) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                name={line.name}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {config.bars?.map((bar: any, index: number) => (
              <Bar
                key={index}
                dataKey={bar.dataKey}
                fill={bar.fill}
                name={bar.name}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={config.dataKey}
              nameKey={config.nameKey}
              cx="50%"
              cy="50%"
              outerRadius={config.outerRadius || 80}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={config.colors?.[index % config.colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {config.areas?.map((area: any, index: number) => (
              <Area
                key={index}
                type="monotone"
                dataKey={area.dataKey}
                stroke={area.stroke}
                fill={area.fill}
                name={area.name}
              />
            ))}
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {renderChart()}
    </ResponsiveContainer>
  );
}
