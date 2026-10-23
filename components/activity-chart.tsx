"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type DailyCount = {
  date: string;
  count: number;
};

type ActivityChartProps = {
  data: DailyCount[];
  color?: string;
};

export function ActivityChart({ data, color = "var(--copper)" }: ActivityChartProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(85,60,42,0.08)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#726153" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#726153" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(85,60,42,0.12)",
              background: "rgba(255,253,248,0.96)",
              fontSize: 13,
            }}
            labelStyle={{ color: "#241b14", fontWeight: 600 }}
            formatter={(value) => [`${Number(value ?? 0)} 次`, "次数"]}
          />
          <Bar
            dataKey="count"
            fill={color}
            radius={[6, 6, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
