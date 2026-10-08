import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const COLORS = [
    "#2563eb",
    "#14b8a6",
    "#a855f7",
    "#ef4444",
];

export default function ProjectStageChart({ projects = [] }) {
    const stages = [
        { name: "Open", value: projects.filter(p => p.status === "open").length },
        { name: "Processing", value: projects.filter(p => p.status === "processing").length },
        { name: "Actively Working", value: projects.filter(p => p.status === "actively_working").length },
        { name: "Completed", value: projects.filter(p => p.status === "completed").length },
    ];

    const total = stages.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card className="shadow-sm border bg-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-1">
                    Projects by Stage
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-[200px] text-xs font-normal">Breakdown of projects by their current stage within the selected date range and division.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
                    <div className="space-y-3 flex-1 w-full max-w-[300px]">
                        {stages.map((item, index) => (
                            <div
                                key={item.name}
                                className="grid grid-cols-[1fr_40px_45px] items-center gap-2 text-sm"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: COLORS[index] }}
                                    />
                                    <span className="truncate">{item.name}</span>
                                </div>

                                <span className="text-right font-medium">
                                    {item.value}
                                </span>

                                <span className="text-right text-gray-500">
                                    {total ? Math.round((item.value / total) * 100) : 0}%
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="h-52 w-52 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stages}
                                    innerRadius={55}
                                    outerRadius={85}
                                    dataKey="value"
                                >
                                    {stages.map((_, index) => (
                                        <Cell
                                            key={index}
                                            fill={COLORS[index]}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">
                                {total}
                            </span>
                            <span className="text-sm text-gray-500">
                                Total
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}