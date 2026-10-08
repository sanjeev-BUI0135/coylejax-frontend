import React, { useEffect, useState } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer
} from "recharts";
import { Lead } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const LEGEND_COLORS = {
    referral: "linear-gradient(135deg, #3B82F6, #2563EB)", // Referral
    online: "linear-gradient(135deg, #10B981, #059669)", // Online
    radio: "linear-gradient(135deg, #F59E0B, #D97706)", // Radio
    outbound: "linear-gradient(135deg, #8B5CF6, #7C3AED)", // Outbound
    "current customer": "linear-gradient(135deg, #EF4444, #DC2626)", // Current Customer
    "plan hub": "linear-gradient(135deg, #14B8A6, #0D9488)", // Plan Hub
    "building connected": "linear-gradient(135deg, #EC4899, #DB2777)",  // Building Connected
    "unselected lead source": "linear-gradient(135deg, #9CA3AF, #6B7280)"
};

export default function LeadsSourceChart({ date, division }) {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, [date, division]);

    const loadData = async () => {
        try {
            const res = await Lead.getSourceStats({
                from: date?.from,
                to: date?.to,
                division: division !== "all" ? division : undefined
            });
            const list = res?.data || res;

            const totalLeads = list.reduce((sum, i) => sum + i.count, 0);

            const aggregatedMap = list.reduce((acc, item) => {
                const name = item.name || item.value || "Unselected Lead Source";
                acc[name] = (acc[name] || 0) + item.count;
                return acc;
            }, {});

            const formatted = Object.entries(aggregatedMap).map(([name, count]) => ({
                name,
                value: count,
                percent: count / totalLeads
            }));

            setData(formatted);
            setTotal(totalLeads);
        } catch (err) {
            console.error("Source stats error", err);
        }
    };

    const getSolidColor = (name) => {
        const key = name?.toLowerCase();

        const map = {
            referral: "#3B82F6",
            online: "#10B981",
            radio: "#F59E0B",
            outbound: "#8B5CF6",
            "current customer": "#EF4444",
            "plan hub": "#14B8A6",
            "building connected": "#EC4899",
            "unselected lead source": "#9CA3AF"
        };

        if (map[key]) return map[key];

        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = hash % 360;

        return `hsl(${hue}, 70%, 45%)`;
    };

    const renderLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        percent,
        value
    }) => {
        const RADIAN = Math.PI / 180;

        const radius = (innerRadius + outerRadius) / 2;

        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight="600"
            >
                {value}
                <tspan x={x} dy="14" fontSize={10}>
                    {(percent * 100).toFixed(1)}%
                </tspan>
            </text>
        );
    };

    if (!data.length || total === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">

            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="flex items-center gap-1">
                        <h2 className="text-lg font-semibold">Leads by Source</h2>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-[200px] text-xs">Distribution of leads based on their origin source within the selected date range and division.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <p className="text-sm text-gray-500">
                        See where your leads are coming from
                    </p>
                </div>

                <span
                    onClick={() => navigate("/leads")}
                    className="text-blue-600 text-sm cursor-pointer hover:underline flex items-center gap-1"
                >
                    View Leads <ArrowRight size={16} />
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">

                <div className="space-y-3">
                    {data.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">

                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                        background: getSolidColor(item.name)
                                    }}
                                />
                                <span className="text-sm">{item.name}</span>
                            </div>

                            <div className="flex items-center text-sm w-24 justify-between">
                                <span className="font-medium w-6 text-right">
                                    {item.value}
                                </span>
                                <span className="text-gray-500 w-12 text-right">
                                    {(item.percent * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ))}

                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3 flex justify-between items-center font-semibold">
                        <span>Total Leads</span>

                        <div className="flex items-center text-sm w-24 justify-between">
                            <span className="font-medium w-6 text-right">
                                {total}
                            </span>
                            <span className="w-12"></span>
                        </div>
                    </div>
                </div>

                {/* RIGHT CHART */}
                <div className="relative h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={60}
                                outerRadius={120}
                                dataKey="value"
                                label={renderLabel}
                                labelLine={false}
                                stroke="white"
                                strokeWidth={2}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={index} fill={getSolidColor(entry.name)} />
                                ))}
                            </Pie>

                        </PieChart>
                    </ResponsiveContainer>

                    {/* CENTER TEXT */}
                    <div className="absolute flex flex-col items-center justify-center">
                        <h2 className="text-3xl font-bold">{total}</h2>
                        <p className="text-sm text-gray-500">Total Leads</p>
                    </div>
                </div>

            </div>
        </div>
    );
}