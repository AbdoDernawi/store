"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/admin/format";

type SalesLineChartProps = {
  data: Array<{
    label: string;
    sales: number;
    orders: number;
  }>;
};

export function SalesLineChart({ data }: SalesLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg bg-emerald-50/50 text-sm font-bold text-slate-500">
        لا توجد مبيعات ضمن هذه الفترة بعد.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }}
            tickFormatter={(value) => `${Number(value).toLocaleString("ar-LY")}`}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #d1fae5",
              borderRadius: 8,
              boxShadow: "0 16px 35px rgba(15,23,42,0.08)",
              direction: "rtl",
              fontFamily: "Tajawal, sans-serif",
            }}
            formatter={(value, name) => [
              name === "sales" ? formatMoney(Number(value)) : value,
              name === "sales" ? "المبيعات" : "الطلبات",
            ]}
            labelStyle={{ color: "#0f172a", fontWeight: 900 }}
          />
          <Area
            activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 3 }}
            dataKey="sales"
            fill="url(#salesGradient)"
            stroke="#059669"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
