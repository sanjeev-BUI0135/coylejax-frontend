import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { addDays, isAfter, isBefore } from "date-fns";
import { formatSafeDate } from "@/utils/dateUtils";
import { Calendar, Clock, AlertTriangle, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateProjectProgress } from "../../utils/projectValidation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { formatDateUS, formatDateUTC } from "@/utils/formatdate";

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

const DIVISION_COLORS = {
  division_10: "border-l-blue-500",
  division_32: "border-l-green-500",
  division_8: "border-l-yellow-500",
  gates: "border-l-purple-500"
};

export default function ProjectTimeline({ projects, customers, loading, divisions = [] }) {

  const getDivisionName = (value) => {
    if (!value) return "";
    const div = divisions.find(d => d.value === value);
    return div ? div.display_name : value.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTimelineProjects = () => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    const nextMonth = addDays(today, 30);

    return projects
      .filter(p => p.estimated_start_date || p.estimated_end_date)
      .map(project => {
        const startDate = project.estimated_start_date ? new Date(project.estimated_start_date) : null;
        const endDate = project.estimated_end_date ? new Date(project.estimated_end_date) : null;

        let urgency = "normal";
        let timelineStatus = "";

        if (startDate && isBefore(startDate, nextWeek) && project.status === "quote_approved") {
          urgency = "urgent";
          timelineStatus = "Starting Soon";
        } else if (endDate && isBefore(endDate, nextWeek) && project.status === "in_progress") {
          urgency = "urgent";
          timelineStatus = "Due Soon";
        } else if (endDate && isAfter(endDate, today) && isBefore(endDate, nextMonth)) {
          urgency = "warning";
          timelineStatus = "Due This Month";
        }
        const progress = calculateProjectProgress(project);
        return {
          ...project,
          urgency,
          timelineStatus,
          startDate,
          endDate,
          progress
        };
      })
      .sort((a, b) => {
        if (a.urgency === "urgent" && b.urgency !== "urgent") return -1;
        if (b.urgency === "urgent" && a.urgency !== "urgent") return 1;
        if (a.startDate && b.startDate) return a.startDate - b.startDate;
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
  };

  const timelineProjects = getTimelineProjects();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="flex items-center gap-1">
          <Calendar className="w-5 h-5" />
          Project Timeline & Upcoming Milestones
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal text-white">List of projects with their estimated start and end dates, highlighting upcoming milestones.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <Link to="/projects">
          <Button variant="outline" size="sm" className="text-xs cursor-pointer">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineProjects.map((project) => {
            const rawCustomer = project.customer_ids?.[0];
            const customer =
              typeof rawCustomer === "object"
                ? rawCustomer
                : customers?.find(
                  (c) =>
                    String(c._id || c.id) === String(rawCustomer)
                );
            const displayName = [
              customer?.company_name,
              project?.project_name,
              customer?.contact_name,
            ]
              .filter(Boolean)
              .join(" - ") || "Unnamed Project";
            return (
              <div
                key={project.id}
                className={`relative p-4 border-l-4 ${DIVISION_COLORS[project.project_type]} bg-gray50-temp rounded-lg shadow-sm dark:bg-gray-900 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900temp break-words leading-snug">{displayName}</h3>
                      {project.urgency === "urgent" && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      {project.timelineStatus && (
                        <Badge
                          className={
                            project.urgency === "urgent"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {project.timelineStatus}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600temp">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span className="capitalize">{getDivisionName(project.project_type)}</span>
                      </div>

                      {project.startDate && (
                        <div>
                          <span className="text-gray-500temp">Start:</span>
                          <span className="ml-1 font-medium">
                            {formatDateUTC(project.startDate)}
                          </span>
                        </div>
                      )}

                      {project.endDate && (
                        <div>
                          <span className="text-gray-500temp">End:</span>
                          <span className="ml-1 font-medium">
                            {formatDateUTC(project.endDate)}
                          </span>
                        </div>
                      )}
                    </div>
                    {project.status === 'lost' && (
                      <div className="space-y-2">
                        <p className="text-red-600"><strong>Reason:</strong>{" "}{project.lost_reason}{project.lost_reason_note
                          ? ` : ${project.lost_reason_note}`
                          : ""}
                        </p>
                        {project.lost_date && (
                          <p className="text-red-600"><strong>Lost at:</strong> {formatDateUTC(project.lost_date)}</p>
                        )}
                      </div>
                    )}

                    {project.progress > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500temp">Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-auto">
                    <Badge className={statusColors[project.status]?.color || "bg-gray-100 text-gray-800"}>
                      {statusColors[project.status]?.label || project.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}

          {timelineProjects.length === 0 && (
            <div className="text-center py-8 text-gray-500temp">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400temp" />
              <p>No upcoming project milestones</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}