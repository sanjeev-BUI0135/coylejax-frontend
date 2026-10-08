import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-4">
      <p className="font-bold mb-3 text-slate-900 dark:text-white">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="mb-1" style={{ color: item.color }}>
          <span className="font-medium capitalize">{item.dataKey}</span>:{" "}
          <span className="font-bold text-slate-900 dark:text-white">${Number(item.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function RevenueOverviewChart({
  projects = [],
  payments = [],
}) {
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return months.map((month, index) => {
      const revenue = payments
        .filter((p) => {
          const d = new Date(
            p.payment_date || p.createdAt
          );
          return d.getMonth() === index;
        })
        .reduce(
          (sum, p) => sum + (Number(p.amount || 0)),
          0
        );

      const cost = projects
        .filter((p) => {
          const d = new Date(
            p.createdAt || p.created_date
          );
          return d.getMonth() === index;
        })
        .reduce(
          (sum, p) =>
            sum +
            Number(
              p.actual_cost ||
                p.cost ||
                p.estimated_value * 0.6 ||
                0
            ),
          0
        );

      return {
        month: `${month} '${String(
          new Date().getFullYear()
        ).slice(-2)}`,
        revenue,
        cost,
      };
    });
  }, [projects, payments]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-1">
          Revenue Overview
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal">Monthly comparison of total revenue vs cost over the last 12 months.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>

        {/* <button className="text-sm text-blue-600 font-medium">
          View report
        </button> */}
      </CardHeader>

      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={chartData}
              barGap={8}
            >
              <CartesianGrid
                vertical={false}
                stroke="#e5e7eb"
              />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 13, fontWeight: 600, fill: "#374151" }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
              tick={{ fontSize: 13, fontWeight: 600, fill: "#374151" }}
                tickFormatter={(v) =>
                  `$${(v / 1000).toFixed(0)}K`
                }
                tickLine={false}
                axisLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="revenue"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                maxBarSize={24}
              />

              <Bar
                dataKey="cost"
                fill="#86efac"
                radius={[6, 6, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-end gap-8 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            Revenue
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-300" />
            Cost
          </div>
        </div>
      </CardContent>
    </Card>
  );
}