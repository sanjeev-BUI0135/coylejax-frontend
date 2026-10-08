
import React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Building2,
  Users,
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Target,
  Award,
  Minus,
  XCircle,
  Frown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export default function DashboardStats({ stats, loading, divisionFilter, dashboardPerms }) {
  const divisionName = {
    all: "All Divisions",
    division_10: "Division 10",
    division_32: "Division 32",
    division_8: "Division 8",
    gates: "Gates"
  }[divisionFilter];

  const statCards = [
    {
      permissionKey: "TotalProjectsCard",
      title: "Total Estimates",
      value: stats.totalEstimates,
      icon: Calculator,
      color: "bg-blue-500",
      description: "Total quotes created",
      tooltipText: "Total number of estimates created within the selected date range."
    },
    {
      permissionKey: "AvgProjectValueCard",
      title: "Estimate Revenue",
      value: stats.estimateRevenue !== undefined
        ? formatCurrency(stats.estimateRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "",
      icon: DollarSign,
      color: "bg-indigo-500",
      description: "Total value of estimates",
      tooltipText: "Sum of the total amounts of all estimates within the selected date range."
    },
    {
      permissionKey: "PendingProjectsCard",
      title: "Pending Estimates",
      value: stats.pendingEstimates,
      icon: Clock,
      color: "bg-orange-500",
      description: "Awaiting approval",
      tooltipText: "Number of estimates currently in 'sent' or 'draft' status."
    },
    {
      permissionKey: "LostProjectsCard",
      title: "Awarded Projects (Approved Estimates)",
      value: stats.awardedProjects,
      icon: Award,
      color: "bg-amber-500",
      description: "Won or approved projects",
      tooltipText: "Number of estimates that have been 'awarded' or 'approved'."
    },
    {
      permissionKey: "LostRevenueCard",
      title: "Total Revenue (In Process)",
      value: stats.inProcessRevenue !== undefined
        ? formatCurrency(stats.inProcessRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "",
      icon: TrendingUp,
      color: "bg-purple-500",
      description: "Revenue to be billed",
      tooltipText: "Sum of the estimated values of all open, processing, or awarded projects."
    },
    {
      permissionKey: "CompletedProjectsCard",
      title: "Completed Projects",
      value: stats.completedProjects,
      icon: CheckCircle,
      color: "bg-emerald-500",
      trend: stats.completedProjectsGrowth !== undefined
        ? `${stats.completedProjectsGrowth >= 0 ? "+" : ""}${stats.completedProjectsGrowth}% this month`
        : null,
      description: "Successfully finished",
      tooltipText: "Total number of projects marked as 'completed'."
    },
    {
      permissionKey: "RevenueCard",
      title: "Total Revenue (Completed)",
      value: stats.completedRevenue !== undefined
        ? formatCurrency(stats.completedRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "",
      icon: DollarSign,
      color: "bg-green-500",
      description: "Revenue from completed",
      tooltipText: "Sum of the estimated values of all completed projects."
    },
    {
      permissionKey: "ActiveProjectsCard",
      title: "Active Projects",
      value: stats.activeProjects,
      icon: Building2,
      color: "bg-sky-500",
      description: "Currently in progress",
      tooltipText: "Total number of ongoing projects (not completed, lost, or cancelled)."
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {statCards
        .filter((stat) => {
          if (!stat.permissionKey) return true;
          return dashboardPerms?.widgets?.[stat.permissionKey]?.view;
        })
        .map((stat, index) => (
          <Card
            key={index}
            className="
            group relative overflow-hidden
            rounded-2xl
            border border-slate-200/70 dark:border-slate-800
            bg-white/90 dark:bg-slate-900/90
            shadow-sm
            hover:shadow-2xl
            hover:-translate-y-1
            transition-all duration-300
            h-md
          "
          >
            {/* Top Gradient Line */}
            <div
              className={`absolute top-0 left-0 h-1 w-full ${stat.color}`}
            />

            {/* Glow Effect */}
            <div
              className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${stat.color} opacity-10 blur-3xl group-hover:opacity-20 transition-all`}
            />

            <CardHeader className="p-4 h-full flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-5 cursor-help">
                          {stat.title}

                          {stat.tooltipText && (
                            <Info className="inline-block w-4 h-4 ml-1 align-text-top text-slate-400" />
                          )}
                        </p>
                      </TooltipTrigger>

                      <TooltipContent side="top">
                        <p className="max-w-[200px] text-xs">
                          {stat.tooltipText}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <p className="text-xs text-slate-400 mt-1">
                    {stat.description}
                  </p>
                </div>

                <div
                  className={`
                  p-3 rounded-2xl
                  ${stat.color}
                  bg-opacity-10
                  dark:bg-opacity-20
                  group-hover:scale-110
                  group-hover:rotate-6
                  transition-all duration-300
                `}
                >
                  <stat.icon
                    className={`w-5 h-5 ${stat.color.replace(
                      "bg-",
                      "text-"
                    )}`}
                  />
                </div>
              </div>

              {/* Value */}
              <div className="mt-4">
                {loading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {stat.value || 0}
                    </p>

                    <TrendingUp className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:-translate-y-1 transition-all" />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {stat.trend && (
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${stat.trend.includes("-")
                        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                        : "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                      }`}
                  >
                    {stat.trend.includes("-") ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3" />
                    )}

                    {stat.trend}
                  </div>
                )}

                {/* <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Live Metric
                </div> */}
              </div>
            </CardHeader>
          </Card>
        ))}
    </div>
  );
}
