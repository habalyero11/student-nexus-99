import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface PerformanceData {
  outstanding: number;
  verySatisfactory: number;
  satisfactory: number;
  fairlySatisfactory: number;
  needsImprovement: number;
}

interface PerformanceChartProps {
  data: PerformanceData;
  title: string;
  chartType?: "bar" | "pie";
}

export const PerformanceChart = ({ data, title, chartType = "bar" }: PerformanceChartProps) => {
  const chartData = [
    { name: "Outstanding", value: data.outstanding, fullName: "Outstanding (90-100)" },
    { name: "Very Satisfactory", value: data.verySatisfactory, fullName: "Very Satisfactory (85-89)" },
    { name: "Satisfactory", value: data.satisfactory, fullName: "Satisfactory (80-84)" },
    { name: "Fairly Satisfactory", value: data.fairlySatisfactory, fullName: "Fairly Satisfactory (75-79)" },
    { name: "Needs Improvement", value: data.needsImprovement, fullName: "Needs Improvement (<75)" },
  ];

  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#f97316", "#ef4444"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="text-sm font-medium">{data.fullName}</p>
          <p className="text-sm text-blue-600">
            Students: <span className="font-medium">{data.value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-1 gap-1 text-xs">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colors[index] }}
              ></div>
              <span className="text-muted-foreground">{item.fullName}: {item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};