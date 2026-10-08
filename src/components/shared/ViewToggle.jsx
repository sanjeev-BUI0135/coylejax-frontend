import React from "react";
import { Button } from "@/components/ui/button";
import { Grid3x3, List } from "lucide-react";

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-white dark:bg-gray-800">
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className={`h-8 px-3 ${view === "list"
            ? "dark:bg-blue-500 dark:text-white"
            : "dark:text-gray-300"
          }`}
      >
        <List className="w-4 h-4" />
      </Button>

      <Button
        variant={view === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
        className={`h-8 px-3 ${view === "grid"
            ? "dark:bg-blue-500 dark:text-white"
            : "dark:text-gray-300"
          }`}
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>

    </div>
  );
}