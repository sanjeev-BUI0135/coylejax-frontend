
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { formatDateUTC } from "@/utils/formatdate";

const statusColors = {
  requirements_gathering: { label: "Requirements Gathering", color: "bg-gray-100 text-gray-800" },
  estimate_pending: { label: "Estimate Pending", color: "bg-yellow-100 text-yellow-800" },
  quote_sent: { label: "Quote Sent", color: "bg-blue-100 text-blue-800" },
  quote_approved: { label: "Quote Approved", color: "bg-green-100 text-green-800" },
  open: { label: "Open", color: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", color: "bg-orange-100 text-orange-800" },
  actively_working: { label: "Actively Working", color: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost", color: "bg-gray-400 text-white" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" }
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export default function RecentProjects({ projects, customers, loading }) {
  if (loading) {
    return (
      <Card className="w-full max-w-full min-w-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="min-w-0 px-4 sm:px-6">
          <CardTitle className="text-gray-900temp dark:text-white flex items-center gap-1">
            Recent Projects
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs font-normal">List of the most recently created projects based on selected filters.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full px-4 sm:px-6">
          <div className="space-y-4 w-full min-w-0 max-w-full">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-60 max-w-full mb-2" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="ml-auto shrink-0">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-full min-w-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="min-w-0 px-4 sm:px-6">
        <CardTitle className="text-gray-900temp dark:text-white flex items-center gap-1">
          Recent Projects
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal">List of the most recently created projects based on selected filters.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 max-w-full px-4 sm:px-6">
        <div className="space-y-4 w-full min-w-0 max-w-full">
          {projects.map((project) => {
            const rawCustomer = project.customer_ids?.[0];

            const customer =
              typeof rawCustomer === "object"
                ? rawCustomer
                : customers?.find(
                  (c) =>
                    String(c._id || c.id) === String(rawCustomer)
                );


            return (
              <div
                key={project.id || project._id}
                className="w-full max-w-full min-w-0 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray50-temp dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex w-full min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

                  {/* LEFT CONTENT */}
                  <div className="w-full min-w-0 max-w-full flex-1 ">

                    {/* TITLE */}
                    <div className="w-full min-w-0 mb-2">
                      <h3 className="w-full min-w-0 font-semibold text-gray-900temp dark:text-white break-words [overflow-wrap:anywhere] leading-snug">
                        {project.project_name}
                      </h3>

                      {project.priority && (
                        <Badge
                          className={`mt-2 whitespace-nowrap ${priorityColors[project.priority] ||
                            "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {project.priority}
                        </Badge>
                      )}
                    </div>

                    {/* DESCRIPTION */}
                    <div className="w-full min-w-0 mb-2 overflow-hidden">
                      <p className="text-sm text-gray-500temp break-words [overflow-wrap:anywhere] line-clamp-2">
                        {project.description}
                      </p>

                      {project.description?.length > 80 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="mt-1 text-[10px] font-medium text-blue-500 hover:text-blue-700"
                            >
                              view more
                            </button>
                          </PopoverTrigger>

                          <PopoverContent
                            side="bottom"
                            align="start"
                            className="w-[calc(100vw-32px)] max-w-[500px] p-4"
                          >
                            <h4 className="font-semibold border-b pb-2 mb-3">
                              Project Description
                            </h4>

                            <div className="max-h-[300px] overflow-y-auto">
                              <p className="text-sm leading-6 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                {project.description}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* LOCATION + DATE */}
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-gray-500temp">
                      <div className="flex min-w-0 items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="min-w-0 truncate">
                          {project.location}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDateUTC(project.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* STATUS */}
                  <div className="w-full lg:w-auto lg:shrink-0">
                    <Badge
                      className={`max-w-full whitespace-normal break-words ${statusColors[project.status]?.color ||
                        "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {statusColors[project.status]?.label ||
                        project.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
