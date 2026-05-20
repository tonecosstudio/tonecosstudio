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
} from "recharts";

export type ChartType = "line" | "bar" | "pie" | "area";
export type ChartDataPoint = Record<string, string | number | null | undefined>;

type SeriesConfig = {
  dataKey: string;
  name?: string;
  stroke?: string;
  fill?: string;
};

type CartesianChartConfig = {
  xKey: string;
};

export type LineChartConfig = CartesianChartConfig & {
  lines?: SeriesConfig[];
};

export type BarChartConfig = CartesianChartConfig & {
  bars?: SeriesConfig[];
};

export type AreaChartConfig = CartesianChartConfig & {
  areas?: SeriesConfig[];
};

export type PieChartConfig = {
  dataKey: string;
  nameKey: string;
  outerRadius?: number;
  colors?: string[];
};

export type ChartRendererConfig =
  | LineChartConfig
  | BarChartConfig
  | PieChartConfig
  | AreaChartConfig;

interface ChartRendererProps {
  type: ChartType;
  data: ChartDataPoint[];
  config: ChartRendererConfig;
  height?: number;
}

export default function ChartRenderer({ type, data, config, height = 300 }: ChartRendererProps) {
  const renderChart = () => {
    switch (type) {
      case "line": {
        const lineConfig = config as LineChartConfig;
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={lineConfig.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {lineConfig.lines?.map((line, index) => (
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
      }

      case "bar": {
        const barConfig = config as BarChartConfig;
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={barConfig.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {barConfig.bars?.map((bar, index) => (
              <Bar key={index} dataKey={bar.dataKey} fill={bar.fill} name={bar.name} />
            ))}
          </BarChart>
        );
      }

      case "pie": {
        const pieConfig = config as PieChartConfig;
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={pieConfig.dataKey}
              nameKey={pieConfig.nameKey}
              cx="50%"
              cy="50%"
              outerRadius={pieConfig.outerRadius || 80}
              label
            >
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={pieConfig.colors?.[index % pieConfig.colors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      }

      case "area": {
        const areaConfig = config as AreaChartConfig;
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={areaConfig.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {areaConfig.areas?.map((area, index) => (
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
      }

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
