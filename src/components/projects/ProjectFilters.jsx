import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export default function ProjectFilters({
  filters = { status: "all", priority: "all", project_type: "all" },
  onFilterChange = () => { },
  divisions = [],
  statusOptions,
  compact = false
}) {
  const handleFilterChange = (type, value) => {
    onFilterChange({
      ...filters,
      [type]: value
    });
  };

  const defaultStatusOptions = [
    "open_bids",
    "bid_submitted",
    "awarded",
    "processing",
    "actively_working",
    "completed",
    "lost",
    "cancelled"
  ];

  const finalStatusOptions = statusOptions || defaultStatusOptions;

  const formatStatus = (status) =>
    status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className={`flex gap-2 items-center ${compact ? "" : " w-full"} min-w-0`}>
      <div className={compact ? "w-[150px]" : "flex-1 min-w-0"}>
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>

            {finalStatusOptions.map(status => (
              <SelectItem key={status} value={status}>
                {formatStatus(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* <div className={compact ? "w-[140px]" : "flex-1 min-w-0"}>
        <Select
          value={filters.priority}
          onValueChange={(value) => handleFilterChange("priority", value)}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div> */}
      <div className={compact ? "w-[140px]" : "flex-1 min-w-0"}>
        {/* DIVISION */}
        <Select
          value={filters.project_type}
          onValueChange={(value) => handleFilterChange("project_type", value)}
        >
          <SelectTrigger className="w-full h-10 truncate">
            <SelectValue placeholder="Division" className="truncate" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>

            {divisions?.map((division) => (
              <SelectItem key={division._id} value={division.value}>
                {division.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
