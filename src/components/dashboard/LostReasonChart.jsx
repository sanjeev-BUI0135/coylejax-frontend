import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const COLORS = {
  Price: "#ef4444",
  Timeline: "#f97316",
  "Client cancelled": "#3b82f6",
  "Budget not approved": "#eab308",
  "Competitor selected": "#8b5cf6",
  Other: "#6b7280",
};

const mapLostReason = (reason = "") => {
  const normalized = reason.toLowerCase();

  if (normalized.includes("price")) return "Price";
  if (normalized.includes("timeline") || normalized.includes("delay"))
    return "Timeline";
  if (normalized.includes("client")) return "Client cancelled";
  if (normalized.includes("budget")) return "Budget not approved";
  if (normalized.includes("competitor")) return "Competitor selected";

  return "Other";
};

export default function LostReasonChart({ projects = [], loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            Analysis of Lost Projects
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs font-normal">Breakdown of reasons why projects were lost.</p>
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

  const lostProjects = projects.filter(
    (p) => p.status === "lost" && p.lost_reason
  );

  const reasonCounts = lostProjects.reduce((acc, project) => {
    const mappedReason = mapLostReason(project.lost_reason);
    acc[mappedReason] = (acc[mappedReason] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(reasonCounts).map(([name, value]) => ({
    name,
    value,
    color: COLORS[name] || COLORS.Other,
  }));

  const totalLost = chartData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Analysis of Lost Projects
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal">Breakdown of reasons why projects were lost.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {chartData.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">

            {/* Left Side */}
            <div className="space-y-3 flex-1 w-full max-w-[300px]">
              {chartData.map((item) => (
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

                    <span>{item.name}</span>
                  </div>

                  <span className="text-right font-medium">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Right Side */}
            <div className="h-56 w-56 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
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
            </div>

          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-center text-gray-500">
            No lost project data to display.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
