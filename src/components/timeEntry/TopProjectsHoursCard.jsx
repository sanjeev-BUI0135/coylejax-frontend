import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const TopProjectsHoursCard = ({
  weekSummary1,
  loading1,
  exporting,
  onExport,
  projects
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base md:text-lg">Top Projects Hours</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1 h-7 sm:text-sm sm:px-3 sm:py-2 sm:h-8"
              disabled={exporting || weekSummary1.entries.length === 0}
            >
              <Download className="w-2.5 h-2.5 mr-1 sm:w-3 sm:h-3" />
              Export
              <ChevronDown className="w-2.5 h-2.5 ml-1 sm:w-3 sm:h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-xs sm:text-sm"
              onClick={() => onExport("pdf", weekSummary1.entries, "Top Projects Hours", "top_projects")}
              disabled={exporting || weekSummary1.entries.length === 0}
            >
              {exporting ? "Exporting..." : "Export as PDF"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs sm:text-sm"
              onClick={() => onExport("csv", weekSummary1.entries, "Top Projects Hours", "top_projects")}
              disabled={exporting || weekSummary1.entries.length === 0}
            >
              {exporting ? "Exporting..." : "Export as CSV"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pt-0">
        {loading1 ? (
          <p className="text-gray-500temp text-sm">Loading top projects...</p>
        ) : weekSummary1.entries.length === 0 ? (
          <p className="text-gray-500temp text-sm">No project hours data available</p>
        ) : (
          <div className="space-y-3">
            {weekSummary1.entries.slice(0, 5).map((project, index) => (
              <div
                key={project.projectId || index}
                className="flex justify-between items-center p-2 bg-gray50-temp rounded-lg text-sm"
              >
                <div className="flex-1">
                  <div className="font-semibold text-black-900 text-xs sm:text-sm">
                    {(() => {
                      const fullProject = projects?.find(
                        p =>
                          p._id?.toString() === project.projectId?.toString() ||
                          p.id?.toString() === project.projectId?.toString()
                      );

                      if (!fullProject) return project.projectName;

                      return fullProject.project_name || "Unnamed Project";
                    })()}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-semibold text-black-900  text-xs sm:text-sm">
                    {project.totalHours?.toFixed(1)} hrs
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopProjectsHoursCard;