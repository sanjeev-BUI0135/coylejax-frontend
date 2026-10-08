import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const COLORS = {
  open: "#417bda",
  bid_submitted: "#f59e0b",
  awarded: "#10b981",
  processing: "#f97316",
  actively_working: "#aa98e1",
  completed: "#98e1bc",
  lost: "#6b7280",
  cancelled: "#ef4444"
};


export default function ProjectStatusChart({ projects, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            Project Status
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs font-normal">Breakdown of projects by their current overall status.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const statusCounts = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    value: count,
    color: COLORS[status]
  }));

  const total = chartData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Project Status
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal">Breakdown of projects by their current overall status.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-8">
          {/* Left Side */}
          <div className="space-y-3 flex-1 max-w-[300px]">
            {chartData.map((item, index) => (
              <div
                key={item.name}
                className="grid grid-cols-[1fr_40px_45px] items-center gap-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />

                  <span className="capitalize">
                    {item.name}
                  </span>
                </div>

                <span className="text-right font-medium">
                  {item.value}
                </span>

                <span className="text-right text-gray-500">
                  {total
                    ? Math.round(
                      (item.value / total) * 100
                    )
                    : 0}
                  %
                </span>
              </div>
            ))}
          </div>

          {/* Right Side */}
          <div className="h-52 w-52 relative flex-shrink-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color}
                    />
                  ))}
                </Pie>

                <RechartsTooltip />
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
