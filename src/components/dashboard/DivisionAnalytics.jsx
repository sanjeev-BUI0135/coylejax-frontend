import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import localApi from "../../services/localApi";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  Award,
  Info
} from "lucide-react";
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import api from "../../services/masterDataService.js";

const COLOR_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#14b8a6",
];

const STATUS_LABELS = {
  open_bids: "Open Bids",
  bid_submitted: "Bid Submitted",
  awarded: "Awarded",
  processing: "Processing",
  in_progress: "In Progress",
  completed: "Completed",
  reopen: "Reopen",
  cancelled: "Cancelled",
  lost: "Lost",
};

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  fill,
  name
}) => {
  if (!name) return null;

  const displayName = name.length > 10 ? `${name.slice(0, 10)}...` : name;
  const label = `${displayName} ${(percent * 100).toFixed(0)}%`;

  const radius = innerRadius + (outerRadius - innerRadius) * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize="12px"
      fontWeight="600"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ pointerEvents: "none" }}
    >
      {label}
    </text>
  );
};


export default function DivisionAnalytics({ projects, payments, loading, selectedDivision, dashboardPerms }) {
  const [divisions, setDivisions] = useState([]);
  const [loadingDivisions, setLoadingDivisions] = useState(true);
  const [me, setMe] = useState([]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe()
        setMe(res)
      } catch (error) {
        console.log(error)
      }
    }
    fetchMe()
  }, [])

  const [user] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const loadDivisions = async () => {
  try {
    const divisionsData = await api.getAll("divisions");

    const activeDivisions = (divisionsData.data || divisionsData || [])
      .filter(div => div.status === "active")
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    let filteredDivisions = [];

    if (me.role_type === "admin") {
      filteredDivisions = activeDivisions.filter(div =>
        String(div.created_by) === String(me._id)
      );
    } else {
      filteredDivisions = activeDivisions.filter(div =>
        String(div.created_by) === String(me.created_by) &&
        me.project_type?.map(String).includes(String(div.value))
      );
    }

    setDivisions(filteredDivisions);

  } catch (error) {
    console.error("Failed to load divisions:", error);
    setDivisions([]);
  } finally {
    setLoadingDivisions(false);
  }
};
  useEffect(() => {
    loadDivisions();
  }, [user.id, me]);

  const getDivisionColors = () => {
    const colorMap = {};
    divisions.forEach((division, index) => {
      colorMap[division.value] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return colorMap;
  };

  const getDivisionNames = () => {
    const nameMap = {};
    divisions.forEach(division => {
      nameMap[division.value] = division.display_name;
    });
    return nameMap;
  };

  if (loading || loadingDivisions) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Division Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const DIVISION_COLORS = getDivisionColors();
  const DIVISION_NAMES = getDivisionNames();


  const getDivisionData = () => {
    const divisionStats = {};

    divisions.forEach(division => {
      divisionStats[division.value] = {
        projects: 0,
        revenue: 0,
        avgValue: 0,
        totalValue: 0,
        displayName: division.display_name,
        sortOrder: division.sort_order || 0,

        statusCounts: {
          open_bids: 0,
          bid_submitted: 0,
          awarded: 0,
          processing: 0,
          in_progress: 0,
          completed: 0,
          reopen: 0,
          cancelled: 0,
          lost: 0,
        }
      };
    });

    projects.forEach(project => {
      const division = project.project_type;
      if (divisionStats[division]) {
        const stats = divisionStats[division];

        stats.projects++;
        stats.totalValue += project.estimated_value || 0;

        const status = project.status;
        if (stats.statusCounts[status] !== undefined) {
          stats.statusCounts[status]++;
        }
      }
    });

    payments.forEach(payment => {
      if (payment.status === "received") {
        const project = projects.find(p => p.id === payment.project_id);
        if (project && divisionStats[project.project_type]) {
          divisionStats[project.project_type].revenue += (Number(payment.amount || 0));
        }
      }
    });

    Object.values(divisionStats).forEach(stats => {
      stats.avgValue = stats.projects > 0 ? stats.totalValue / stats.projects : 0;
    });

    return divisionStats;
  };

  const divisionData = getDivisionData();

  const chartData = Object.entries(divisionData)
  .map(([division, stats]) => ({
    name: DIVISION_NAMES[division],
    division,
    projects: stats.projects,
    revenue: stats.revenue,
    avgValue: stats.avgValue,
    color: DIVISION_COLORS[division],
    sortOrder: stats.sortOrder,
  }))
  .filter(item =>
    selectedDivision === "all" || item.division === selectedDivision
  )
  .sort((a, b) => a.sortOrder - b.sortOrder);

  const pieData = chartData.filter(item => item.projects > 0);

  const topPerformingDivision =
    chartData.length > 0
      ? chartData.reduce((prev, current) =>
        current.revenue > prev.revenue ? current : prev
      )
      : null;

  return (
    <div className="space-y-6">
      {dashboardPerms.widgets.DivisionPerformanceOverviewwidget?.view && (<Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <Building2 className="w-5 h-5" />
            Division Performance Overview
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs font-normal">Shows the total number of projects and revenue grouped by division.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-lg font-bold text-blue-700">
                <Target className="w-5 h-5" />
                {chartData.reduce((sum, d) => sum + d.projects, 0)}
              </div>
              <p className="text-sm text-blue-600 mt-1">Total Projects</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-lg font-bold text-green-700">
                {formatCurrency(chartData.reduce((sum, d) => sum + d.revenue, 0))}
              </div>
              <p className="text-sm text-green-600 mt-1">Total Revenue</p>
            </div>
          </div>

          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  dataKey="projects"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500temp">
              No project data available
            </div>
          )}
        </CardContent>
      </Card>)}

      {dashboardPerms.widgets.DivisionBreakdownwidget?.view && (<Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <Award className="w-5 h-5" />
            Division Breakdown
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs font-normal">Detailed list of projects, revenue, and average project value per division.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {chartData.map(({ division, name, color }) => {
              const stats = divisionData[division];

              return (
                <div key={division} className="p-4 border rounded-lg flex justify-between">
                  <div className="flex gap-3">
                    <div className="w-4 h-4 mt-1 rounded-full" style={{ backgroundColor: color }} />
                    <div>
                      <h3 className="font-semibold">{name}</h3>

                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600temp">
                        <span className="px-2 py-1 bg-gray-100 rounded-md border">
                          {stats.projects} Projects
                        </span>

                        {Object.entries(stats.statusCounts)
                          .filter(([_, count]) => count > 0)
                          .map(([key, count]) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-gray-100 rounded-md border"
                            >
                              {count} {STATUS_LABELS[key]}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {formatCurrency(stats.revenue)}
                    </div>
                    <div className="text-sm text-gray-500temp">
                      Avg: {formatCurrency(stats.avgValue)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>)}

      {dashboardPerms?.widgets?.TopPerformingDivisionswidget?.view && topPerformingDivision && topPerformingDivision.projects > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <TrendingUp className="w-5 h-5" />
              Top Performing Division
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs font-normal">The division that has generated the most revenue.</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: topPerformingDivision.color }}
                >
                  #1
                </div>
                <div>
                  <h3 className="font-bold text-lg dark:text-black">{topPerformingDivision.name}</h3>
                  <p className="text-sm text-gray-600temp">Leading in revenue generation</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(topPerformingDivision.revenue)}
                </div>
                <div className="text-sm text-gray-500temp">
                  {topPerformingDivision.projects} projects
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
