import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const COLORS = [
  "#3b82f6", // Draft
  "#a855f7", // Sent
  "#14b8a6", // Approved
  "#f59e0b", // Revised
  "#ef4444", // Declined
  "#06b6d4", // Converted
];

export default function EstimateStatusChart({ estimates = [] }) {
  const data = [
    {
      name: "Draft",
      value: estimates.filter(
        (e) => e.status?.toLowerCase() === "draft"
      ).length,
    },
    {
      name: "Sent",
      value: estimates.filter(
        (e) => e.status?.toLowerCase() === "sent"
      ).length,
    },
    {
      name: "Approved",
      value: estimates.filter(
        (e) =>
          e.status?.toLowerCase() === "approved" &&
          !e.converted_to_project &&
          !e.converted_project_id
      ).length,
    },
    {
      name: "Rejected",
      value: estimates.filter(
        (e) => e.status?.toLowerCase() === "rejected"
      ).length,
    },
    {
      name: "Converted",
      value: estimates.filter(
        (e) =>
          e.converted_to_project === true ||
          !!e.converted_project_id
      ).length,
    },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="shadow-sm border bg-white h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-1">
          Estimates by Status
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal">Breakdown of estimates by their current status within the selected date range and division.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          {/* Left Side */}
          <div className="space-y-3 flex-1 w-full max-w-[300px]">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="grid grid-cols-[1fr_40px_45px] items-center gap-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span>{item.name}</span>
                </div>

                <span className="text-right font-medium">
                  {item.value}
                </span>

                <span className="text-right text-gray-500">
                  {total
                    ? Math.round((item.value / total) * 100)
                    : 0}
                  %
                </span>
              </div>
            ))}
          </div>

          {/* Donut Chart */}
          <div className="h-52 w-52 relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">
                {total}
              </span>
              <span className="text-sm text-gray-500">
                Total
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}