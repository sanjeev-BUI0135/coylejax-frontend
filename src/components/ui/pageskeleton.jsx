import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PageSkeleton = ({ viewMode = "list", rows = 6 }) => {
    return (
        <div className="<div> animate-pulse">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>

                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-24 rounded-md" />
                    <Skeleton className="h-10 w-28 rounded-md" />
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
            </div>

            {/* Search + Filters */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <Skeleton className="h-10 w-full sm:w-96 rounded-md" />
                    <Skeleton className="h-10 w-40 rounded-md" />
                </div>
            </div>

            {/* Bulk Actions */}
            <div className="mb-4 flex gap-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
            </div>

            {/* Content */}
            {viewMode === "list" ? (
                <div className="space-y-3">
                    {Array.from({ length: rows }).map((_, i) => (
                        <Card key={i} className="p-4 flex items-center gap-4">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-6 w-1/4" />
                            <Skeleton className="h-6 w-1/5" />
                            <Skeleton className="h-6 w-1/6" />
                            <div className="ml-auto flex gap-2">
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: rows }).map((_, i) => (
                        <Card key={i} className="p-4 space-y-3">
                            <Skeleton className="h-40 w-full rounded-md" />
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="flex justify-between pt-2">
                                <Skeleton className="h-8 w-20 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <div className="mt-8 flex justify-between items-center">
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
        </div>
    );
};

export default PageSkeleton;
