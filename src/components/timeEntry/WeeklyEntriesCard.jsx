import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDateUTC } from "../../utils/formatdate";

const WeeklyEntriesCard = ({
  weekSummary,
  exporting,
  onExport,
  projects
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base md:text-lg">This Week's Entries</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1 h-7 sm:text-sm sm:px-3 sm:py-2 sm:h-8"
              disabled={exporting || weekSummary.entries.length === 0}
            >
              <Download className="w-2.5 h-2.5 mr-1 sm:w-3 sm:h-3" />
              Export
              <ChevronDown className="w-2.5 h-2.5 ml-1 sm:w-3 sm:h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-xs sm:text-sm"
              onClick={() => onExport("pdf", weekSummary.entries, "Weekly Entries", "weekly_entries")}
              disabled={exporting}
            >
              {exporting ? "Exporting..." : "Export as PDF"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs sm:text-sm"
              onClick={() => onExport("csv", weekSummary.entries, "Weekly Entries", "weekly_entries")}
              disabled={exporting}
            >
              {exporting ? "Exporting..." : "Export as CSV"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pt-0">
        {weekSummary.entries.length === 0 ? (
          <p className="text-gray-500temp text-sm">No entries for this week</p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {weekSummary.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center p-3 bg-gray50-temp rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-black-900">
                      {formatDateUTC(entry.rawDate)}
                    </div>
                    <div className="text-xs sm:text-sm text-black-500 font-semibold">
                      {(() => {
                        const fullProject = projects?.find(
                          p =>
                            p._id?.toString() === entry.projectId?.toString() ||
                            p.id?.toString() === entry.projectId?.toString()
                        );

                        if (!fullProject) return entry.projectName;

                        return fullProject.project_name || "Unnamed Project";
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-xs sm:text-sm text-black-900">
                    {entry.hours?.toFixed(0)} hrs
                  </div>
                  <div className="text-xs  font-semibold text-black-500">
                    {entry.startTime} – {entry.endTime}
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

export default WeeklyEntriesCard;