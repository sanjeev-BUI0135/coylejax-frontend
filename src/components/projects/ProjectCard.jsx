import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, User, DollarSign, Edit, MoreHorizontal, Building2, Paperclip, Package, Trash, FileCheck, Copy, Award, XCircle, Ban, Info } from "lucide-react";
import { format } from "date-fns";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCurrency } from "@/lib/utils";
import Swal from "sweetalert2";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BidSubmissionDialog from "./Bidsubmission";
import { calculateProjectProgress } from "../../utils/projectValidation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { formatDateUTC } from "@/utils/formatdate";

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  bid_submitted: "bg-yellow-100 text-yellow-800",
  awarded: "bg-green-100 text-green-800",
  processing: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  lost: "bg-gray-400 text-white",
  cancelled: "bg-red-100 text-red-800"
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

const materialStatusColors = {
  'Not Ordered': "text-gray-500temp",
  'Pending Delivery': "text-blue-500",
  'Partially Received': "text-orange-500",
  'All Materials In Stock': "text-green-500"
};

export default function ProjectCard({
  project,
  customers = [],
  onEdit,
  onStatusChange,
  canEdit,
  onClearSelection,
  canDelete,
  onDelete,
  onBidSubmit,
  onDuplicate,
  selectedItems = [],
  onSelectItem,
  totalFilteredCount = 0,
}) {
  const [showBidDialog, setShowBidDialog] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const customer = project.customer_ids?.[0];

  const displayStatus = project.displayStatus || project.status;

  const formatDivision = (type) => {
    if (!type) return "N/A";
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleDuplicate = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const result = await Swal.fire({
      title: `Duplicate Project?`,
      text: `Do you want to create a duplicate of "${project.project_name}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, duplicate it!",
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Duplicating...',
          text: 'Please wait while we create the duplicate.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/projects/duplicate/${project.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Server error: ${response.status}`);
        }

        const result = await response.json();
        const newProject = result.project;

        if (onDuplicate && typeof onDuplicate === 'function') {
          await onDuplicate(newProject);
        }

        Swal.fire({
          title: "Duplicated!",
          text: "Project has been duplicated successfully.",
          icon: "success",
          confirmButtonText: "OK",
        });

      } catch (err) {
        console.error("Duplicate error:", err);
        Swal.fire({
          title: "Error",
          text: err.message || "Failed to duplicate project.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleDelete = async (e) => {
    e?.preventDefault?.();

    const result = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you really want to delete "${project.project_name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        if (onDelete && typeof onDelete === 'function') {
          await onDelete(project);
        }
      } catch (err) {
        console.error("Delete error in card:", err);
      }
    }
  };

  const handleStatusChangeClick = (e, newStatus) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (newStatus === "bid_submitted") {
      setShowBidDialog(true);
    } else {
      try {
        if (onStatusChange && typeof onStatusChange === 'function') {
          onStatusChange(e, newStatus);
        }
      } catch (error) {
        console.error("Status update error:", error);
        Swal.fire("Error", "Failed to update project status.", "error");
      }
    }
  };

  const handleEditClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (onEdit && typeof onEdit === 'function') {
      onEdit(project);
    }
  };

  const handleBidSubmit = async (bidData) => {
    try {
      if (onBidSubmit && typeof onBidSubmit === 'function') {
        await onBidSubmit(bidData);
      }
      setShowBidDialog(false);
    } catch (error) {
      console.error("Bid submission error:", error);
      throw error;
    }
  };

  const getStatusActions = () => {
    const actions = [];

    const currentStatus = project.status;

    // if (currentStatus === "open_bids") {
    //   actions.push({
    //     label: "Submit Bid",
    //     value: "bid_submitted",
    //     icon: <FileCheck className="w-4 h-4 mr-2" />
    //   });
    // }  
    if (currentStatus === "bid_submitted") {
      actions.push({
        label: "Mark Awarded",
        value: "awarded",
        icon: <Award className="w-4 h-4 mr-2" />
      });
      actions.push({
        label: "Mark Lost",
        value: "lost",
        icon: <XCircle className="w-4 h-4 mr-2" />
      });
      actions.push({
        label: "Mark Cancelled",
        value: "cancelled",
        icon: <Ban className="w-4 h-4 mr-2" />
      });
    } else if (currentStatus === "awarded") {
      actions.push({
        label: "Start Processing",
        value: "processing",
        icon: <Package className="w-4 h-4 mr-2" />
      });
    } else if (currentStatus === "processing") {
      actions.push({
        label: "Mark Completed",
        value: "completed",
        icon: <FileCheck className="w-4 h-4 mr-2" />
      });
    }

    if (currentStatus !== 'completed' && currentStatus !== 'cancelled' && currentStatus !== 'lost') {
      actions.push({
        label: "Cancel Project",
        value: "cancelled",
        icon: <Trash className="w-4 h-4 mr-2" />
      });
    }

    return actions;
  };

  const selectedCount = Array.isArray(selectedItems) ? selectedItems.length : 0;
  const totalCount = typeof totalFilteredCount === "number" ? totalFilteredCount : 0;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;
  const isSelected = Array.isArray(selectedItems) && selectedItems.includes(project.id);
  const user = JSON.parse(localStorage.getItem("user"));
  const progress = calculateProjectProgress(project);
  return (
    <>
      <AnimatePresence>
        {showBidDialog && (
          <BidSubmissionDialog
            project={project}
            customers={customers}
            onClose={() => setShowBidDialog(false)}
            onSubmit={handleBidSubmit}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-300 bg-white border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start w-full">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {canDelete && <Checkbox
                  indeterminate={someSelected}
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelectItem(project.id, checked)}
                  className="mt-1"
                />}

                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900temp dark:text-white truncate">
                    <div className="flex items-center gap-2">
                      <span className="truncate whitespace-normal break-all">
                        {project.project_name || "Unnamed Project"}
                      </span>

                      {project.status === "lost" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center rounded-full transition-colors"
                              >
                                <Info className="w-4 h-4 text-red-600" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm p-4 text-left">
                              <div className="space-y-2">
                                <p><strong>Reason:</strong>{" "}{project.lost_reason}{project.lost_reason_note
                                  ? ` : ${project.lost_reason_note}`
                                  : ""}
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
                    </div>
                  </CardTitle>

                  <CardTitle className="text-sm font-medium text-gray-800temp dark:text-gray-500temp truncate">
                    {project.project_number}
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu open={menuOpen} onOpenChange={(open) => { setMenuOpen(); if (open) { onClearSelection?.(); } }}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500temp hover:text-gray-400temp !cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-gray-200">

                    <>
                      {canEdit && (<DropdownMenuItem onClick={(e) => { setMenuOpen(false); handleEditClick(e); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Project
                      </DropdownMenuItem>)}
                      {canEdit && (<DropdownMenuItem onClick={(e) => { setMenuOpen(false); handleDuplicate(e); }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate Project
                      </DropdownMenuItem>)}
                      {canDelete && (<DropdownMenuItem onClick={(e) => { setMenuOpen(false); handleDelete(e); }} className="text-red-600">
                        <Trash className="w-4 h-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>)}
                    </>
                    {canEdit &&
                      getStatusActions().map((action) => (
                        <DropdownMenuItem
                          key={action.value}
                          onClick={(e) => {
                            setMenuOpen(false);
                            handleStatusChangeClick(e, action.value);
                          }}
                        >
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      ))
                    }
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <Link
            to={(project.is_inactive || project.status === 'lost' || project.status === 'completed') ? `/inactive-projects/${project.id || project._id}` : `/projects/${project.id || project._id}`}
            className="flex-grow"
          >
            <CardContent className="pt-0 h-full">
              <div className="space-y-4">
                <p className="text-sm line-clamp-2">{project.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={statusColors[displayStatus]}>
                    {displayStatus.replace(/_/g, " ")}
                  </Badge>
                  <Badge className={priorityColors[project.priority]}>
                    {project.priority}
                  </Badge>
                  {project.project_creation_type_name && (
                    <Badge variant="outline" className="border-blue-400 text-blue-700">
                      {project.project_creation_type_name}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500temp dark:text-white">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{formatDivision(project.project_type)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="break-words min-w-0">{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm ">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateUTC(project.created_date || project.createdAt)}</span>
                  </div>
                  {user?.role_type !== "Crew View" && (
                    <div className="flex items-center gap-2 text-sm ">
                      <DollarSign className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {formatCurrency(project.totalProjectValue || project.estimated_value || 0)}
                        </span>
                        {/* {project.subProjectsCount > 0 && (
                          <span className="text-xs text-gray-500temp">
                            Main: {formatCurrency(project.estimated_value)} + {project.subProjectsCount} Sub
                          </span>
                        )} */}
                      </div>
                    </div>
                  )}
                  {project.materials_status && (
                    <div className={`flex items-center gap-2 text-sm ${materialStatusColors[project.materials_status]}`}>
                      <Package className="w-4 h-4" />
                      <span>{project.materials_status}</span>
                    </div>
                  )}
                  {project.file_attachments && project.file_attachments.length > 0 && (
                    <div className="flex items-center gap-2 text-sm ">
                      <Paperclip className="w-4 h-4" />
                      <span>{project.file_attachments.length} attachment(s)</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </motion.div>
    </>
  );
}