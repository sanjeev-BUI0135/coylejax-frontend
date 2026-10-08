import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GitBranch, ArrowLeft, Edit, Plus, Info, Clock } from "lucide-react";
import { hasPermission } from "../../../utils/hasPermission";
import { buildPermissionMap } from "../../../utils/buildPermissionMap";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";


export default function ProjectHeader({
    project,
    statusConfig,
    priorityColors,
    projectStatusKeys,
    onStatusChange,
    onPriorityChange,
    onEdit,
    onCreateSubProject,
    onBackToParent,
    projectPermissions,
    showDetails,
    setShowDetails
}) {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canview = buildPermissionMap(user.permissions, "Projects");
    const currentStatus =
        statusConfig[project.status] || { label: project.status };

    const awardedDate = project.awarded_date;

    const handleBack = () => {
        if (project.is_sub_project) {
            onBackToParent();
        } else if (project.is_inactive || project.status === 'lost' || project.status === 'completed') {
            navigate("/inactive-projects");
        } else {
            navigate("/projects");
        }
    };
    const customer = project?.customer_ids?.[0];

    return (
        <div className="flex justify-between items-start mb-3">
            <div>
                {/* TITLE */}
                <div className="flex items-center gap-2">
                    <CardTitle className="md:text-2xl font-bold">
                      {project.project_name}
                    </CardTitle>

                    {project.project_number && (
                        <Badge variant="outline" className="font-mono border-blue-300 text-blue-600">
                            #{project.project_number}
                        </Badge>
                    )}

                    {project.is_sub_project && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            <GitBranch className="w-3 h-3 mr-1" />
                            Sub-Project
                        </Badge>
                    )}
                </div>

                {/* STATUS + PRIORITY */}
                <div className="flex items-center gap-3 mt-2">
                    {/* STATUS */}
                    {projectPermissions.module?.update && (<Select value={project.status} onValueChange={onStatusChange}>
                        <SelectTrigger className="w-auto p-0 border-0 shadow-none">
                            <SelectValue asChild>
                                <Badge className={`${currentStatus.color} cursor-pointer`}>
                                    {currentStatus.label}
                                </Badge>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {projectStatusKeys.map(key => (
                                <SelectItem key={key} value={key}>
                                    {statusConfig[key]?.label || key}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>)}

                    {/* LOST INFO */}
                    {project.status === "lost" && project.lost_reason && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="flex items-center rounded-full transition-colors">
                                        <Info className="w-4 h-4 text-red-600" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm p-4 text-left">
                                    <div className="space-y-2">
                                        <p>
                                            <strong>Reason:</strong>{" "}
                                            {project.lost_reason}
                                            {project.lost_reason_note ? `: ${project.lost_reason_note}` : ""}
                                        </p>

                                        {project.lost_date && (
                                            <p><strong>Reviewed on:</strong> {new Date(project.lost_date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}</p>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {/* PRIORITY */}
                    {projectPermissions.module?.update && (<Select value={project.priority} onValueChange={onPriorityChange}>
                        <SelectTrigger className="w-auto p-0 border-0 shadow-none">
                            <SelectValue asChild>
                                <Badge
                                    className={`${priorityColors[project.priority]} cursor-pointer`}
                                >
                                    {project.priority}
                                </Badge>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                    </Select>)}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="md:hidden px-2 py-1 text-sm border rounded-md text-blue-600 border-blue-300"
                    >
                        {showDetails ? "Hide" : "Details"}
                    </button>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2 items-center">

                {/* Desktop Buttons */}
                <div className="hidden md:flex gap-2">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>

                    {projectPermissions.module?.update && (
                        <Button variant="outline" onClick={onEdit}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edit Project
                        </Button>
                    )}

                    {!project.is_sub_project && canview?.widgets?.SubProjects?.add && (
                        <Button variant="outline" onClick={onCreateSubProject}>
                            <Plus className="w-4 h-4 mr-1" />
                            Create Sub-Project
                        </Button>
                    )}
                </div>

                {/* Mobile Dropdown */}
                <div className="md:hidden">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">

                            <DropdownMenuItem onClick={handleBack}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </DropdownMenuItem>

                            {projectPermissions.module?.update && (
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Project
                                </DropdownMenuItem>
                            )}

                            {!project.is_sub_project && canview?.widgets?.SubProjects?.add && (
                                <DropdownMenuItem onClick={onCreateSubProject}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Sub-Project
                                </DropdownMenuItem>
                            )}

                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

            </div>
        </div>
    );
}
