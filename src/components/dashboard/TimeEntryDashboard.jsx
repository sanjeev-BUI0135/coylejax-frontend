import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  UilHistory,
  UilChartLine,
  UilCube,
  UilUsersAlt,
  UilBuilding,
  UilStopwatch,
  UilClockThree,
  UilFileCheck
} from '@iconscout/react-unicons';
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardStats({ divisionFilter = "all", timeEntryPerms }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);

    const token = localStorage.getItem('token');

    fetch(`${import.meta.env.VITE_API_BASE}/time-entry`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then((data) => {
        setStats(data.dashboard || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, [divisionFilter]);

  const divisionName = {
    all: "All Divisions",
    division_10: "Division 10",
    division_32: "Division 32",
    division_8: "Division 8",
    gates: "Gates"
  }[divisionFilter];

  const statCards = [
    {
      title: "Total Hours",
      value: stats ? `${stats.totalHours?.toFixed(2) || '0.00'}` : "0.00",
      icon: UilHistory,
      color: "bg-orange-500",
      widgetId: "TotalHoursCard"
    },
    {
      title: "Days Worked",
      value: stats ? `${stats.daysWorked || 0}` : "0",
      icon: UilChartLine,
      color: "bg-green-500",
      widgetId: "DaysWorkedCard"
    },
    {
      title: "Avg Hours/Day",
      value: stats ? `${stats.avgHoursDay?.toFixed(2) || '0.00'}` : "0.00",
      icon: UilCube,
      color: "bg-yellow-500",
      widgetId: "AvgHoursDayCard"
    },
    {
      title: "This Week's Entries",
      value: stats ? `${stats.weekEntries || 0}` : "0",
      icon: UilUsersAlt,
      color: "bg-indigo-700",
      widgetId: "WeekEntriesCard"
    },
    {
      title: "Assigned Projects",
      value: stats ? `${stats.assignedProjects || 0}` : "0",
      icon: UilBuilding,
      color: "bg-green-300",
      widgetId: "AssignedProjectsCard"
    },
    {
      title: "Top Project Hours",
      value: stats?.topProjectHours ? `${stats.topProjectHours.totalHours?.toFixed(2) || '0.00'}` : "0.00",
      icon: UilStopwatch,
      color: "bg-blue-500",
      description: stats?.topProjectHours?.project_name || "No projects",
      widgetId: "TopProjectHoursCard"
    },
    {
      title: "Lowest Project Hours",
      value: stats?.lowestProjectHours ? `${stats.lowestProjectHours.totalHours?.toFixed(2) || '0.00'}` : "0.00",
      icon: UilClockThree,
      color: "bg-pink-500",
      description: stats?.lowestProjectHours?.project_name || "No projects",
      widgetId: "LowestProjectHoursCard"
    },
    {
      title: "Top Assigned Hours",
      value: stats?.topProjectHours ? `${stats.topProjectHours.totalHours?.toFixed(2) || '0.00'}` : "0.00",
      icon: UilFileCheck,
      color: "bg-gray50-temp",
      description: stats?.topProjectHours?.project_name,
      widgetId: "TopAssignedHoursCard"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        if (timeEntryPerms && !timeEntryPerms.widgets[stat.widgetId]?.view) return null;

        return (
          <Card key={index} className="relative overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${stat.color} rounded-full opacity-10`} />

            <CardHeader className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500temp ">{stat.title}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold mt-2 text-gray-900temp dark:text-white">{stat.value}</p>
                  )}
                  {stat.description && (
                    <p className="text-sm text-gray-500temp  mt-1 truncate max-w-[180px]" title={stat.description}>
                      {stat.description}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-20 dark:bg-opacity-30`}>
                  <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}