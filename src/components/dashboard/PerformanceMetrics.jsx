
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function PerformanceMetrics({ projects, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            Performance Metrics
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs font-normal">Key performance indicators related to project completion, on-time delivery, and approval rates.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = {
    completionRate: projects.length > 0 
      ? (projects.filter(p => p.status === "completed").length / projects.length) * 100 
      : 0,
    
    onTimeRate: (() => {
      const completedProjects = projects.filter(p => p.status === "completed" && p.estimated_end_date && p.actual_end_date);
      if (completedProjects.length === 0) return 0;
      const onTime = completedProjects.filter(p => new Date(p.actual_end_date) <= new Date(p.estimated_end_date));
      return (onTime.length / completedProjects.length) * 100;
    })(),
    
    activeProjectsRate: projects.length > 0 
      ? (projects.filter(p => p.status === "processing").length / projects.length) * 100 
      : 0,
    
    approvalRate: (() => {
      const sentBids = projects.filter(p => ["bid_submitted", "awarded", "processing", "completed"].includes(p.status));
      if (sentBids.length === 0) return 0;
      const approved = projects.filter(p => ["awarded", "processing", "completed"].includes(p.status));
      return (approved.length / sentBids.length) * 100;
    })()
  };

  const MetricItem = ({ icon: Icon, label, value, color, description }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-gray-700temp">{label}</span>
        </div>
        <span className="text-sm font-bold">{value.toFixed(1)}%</span>
      </div>
      <Progress value={value} className="h-2" />
      <p className="text-xs text-gray-500temp">{description}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          <span className="flex items-center gap-1">
            Performance Metrics
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs font-normal">Key performance indicators related to project completion, on-time delivery, and approval rates.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <MetricItem
            icon={CheckCircle}
            label="Completion Rate"
            value={metrics.completionRate}
            color="text-green-500"
            description="Percentage of projects completed"
          />
          
          <MetricItem
            icon={Clock}
            label="On-Time Delivery"
            value={metrics.onTimeRate}
            color="text-blue-500"
            description="Projects completed on or before deadline"
          />
          
          <MetricItem
            icon={TrendingUp}
            label="Project Approval Rate"
            value={metrics.approvalRate}
            color="text-purple-500"
            description="Projects that get awarded by customers"
          />
          
          <MetricItem
            icon={AlertCircle}
            label="Active Projects"
            value={metrics.activeProjectsRate}
            color="text-orange-500"
            description="Currently in-progress projects"
          />
        </div>
        
        <div className="mt-6 p-4 bg-gray50-temp dark:bg-gray-900 rounded-lg">
          <h4 className="font-semibold text-gray-900temp mb-2">Performance Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500temp">Best Metric:</span>
              <span className="ml-2 font-medium text-purple-600">
                {Math.max(metrics.completionRate, metrics.onTimeRate, metrics.approvalRate) === metrics.completionRate 
                  ? "Completion Rate" 
                  : Math.max(metrics.onTimeRate, metrics.approvalRate) === metrics.onTimeRate 
                    ? "On-Time Delivery" 
                    : "Bid Approval"}
              </span>
            </div>
            <div>
              <span className="text-gray-500temp">Focus Area:</span>
              <span className="ml-2 font-medium text-orange-600">
                {Math.min(metrics.completionRate, metrics.onTimeRate, metrics.approvalRate) === metrics.completionRate 
                  ? "Completion Rate" 
                  : Math.min(metrics.onTimeRate, metrics.approvalRate) === metrics.onTimeRate 
                    ? "On-Time Delivery" 
                    : "Bid Approval"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
