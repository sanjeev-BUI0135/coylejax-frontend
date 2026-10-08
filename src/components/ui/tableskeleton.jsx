import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TablePageSkeleton = ({ rows = 8 }) => {
  return (
    <div className="<div> animate-pulse space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-10 w-full sm:w-[420px] rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {/* Table Header */}
        <div className="border-b px-4 py-3 flex items-center gap-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40 hidden md:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-28 hidden lg:block" />
          <Skeleton className="h-4 w-28 hidden lg:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>

        {/* Rows */}
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-4 flex items-center gap-4"
            >
              <Skeleton className="h-4 w-4 rounded" />

              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-44 hidden md:block" />
              <Skeleton className="h-5 w-24 hidden md:block" />
              <Skeleton className="h-5 w-28 hidden lg:block" />
              <Skeleton className="h-5 w-28 hidden lg:block" />
              <Skeleton className="h-6 w-20 rounded-full hidden lg:block" />

              {/* Actions */}
              <div className="ml-auto flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default TablePageSkeleton;
