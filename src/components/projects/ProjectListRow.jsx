import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Trash, Copy, Package, ArrowUpDown, Filter, X, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from 'react-router-dom';
import Swal from "sweetalert2";
import { AnimatePresence } from "framer-motion";
import BidSubmissionDialog from "./Bidsubmission";
import { useTableSort } from "@/hooks/useTableSort";
import { getChecklists } from "@/services/checklistService";
import CustomDatePicker from "../ui/CustomDatePicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TableHeaderFilter from "../shared/TableHeaderFilter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { formatDateUS, formatDateUTC } from "@/utils/formatdate";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { DEFAULT_PROJECT_VISIBLE_COLUMNS, PROJECT_LIST_COLUMN_OPTIONS, } from "./../../config/columnConfigs";
import ViewMoreText from "../shared/ViewMoreText";
import FileAttachmentsCell from "../shared/FileAttachmentsCell";
import { renderTextWithLinks } from "../ui/renderTextWithLinks";
import StickyScrollbar from "../shared/StickyScrollbar";

const statusColors = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800" },
  bid_submitted: { label: "Bid Submitted", color: "bg-yellow-100 text-yellow-800" },
  awarded: { label: "Awarded", color: "bg-green-100 text-green-800" },
  processing: { label: "Processing", color: "bg-orange-100 text-orange-800" },
  actively_working: { label: "Actively Working", color: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost", color: "bg-gray-400 text-white" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" }
};

const materialStatusColors = {
  'Not Ordered': "text-gray-500temp",
  'Pending Delivery': "text-blue-500",
  'Partially Received': "text-orange-500",
  'All Materials In Stock': "text-green-500"
};


function ProjectListRow({
  projects,
  customers,
  divisions,
  users = [],
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
  onSelectAll,
  columnFilters = {},
  onColumnFilterChange,
  totalFilteredCount,
  visibleColumnKeys = DEFAULT_PROJECT_VISIBLE_COLUMNS,
}) {
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState({});
  const customGetters = React.useMemo(() => {
    return {
      "customer_ids.0.company_name": (project) => {
        const customer = project.customer_ids?.[0];
        return customer?.company_name || "";
      },
      company_name: (project) => {
        const customer = project.customer_ids?.[0];
        return customer?.company_name || "";
      },
      "customer_ids.0.contact_name": (project) => {
        const customer = project.customer_ids?.[0];
        return customer?.contact_name || "";
      },
      contact_name: (project) => {
        const customer = project.customer_ids?.[0];
        return customer?.contact_name || "";
      },
      project_type: (project) => {
        return project?.project_type_name || project?.project_type || "";
      },
      created_date: (project) => {
        return project.created_date || project.createdAt || "";
      },
      created_by: (project) => {
        let creatorId = project.created_by_user;
        if (typeof creatorId === 'object' && creatorId !== null) {
          creatorId = creatorId.$oid || creatorId._id || creatorId.id || creatorId;
        }
        if (!creatorId) return "";
        
        const creator = users.find(u => String(u.id || u._id) === String(creatorId));
        if (creator) {
          return creator.full_name || `${creator.first_name || ""} ${creator.last_name || ""}`.trim() || creator.name || creator.email || "";
        }
        return "";
      },
      estimated_value: (project) => {
        return project.totalProjectValue || project.estimated_value || 0;
      },
      status: (project) => {
        if (project.status === "inactive") {
          if (project.is_lost) return "lost";
          if (project.is_completed) return "completed";
        }
        return project.displayStatus || project.status || "";
      },
      project_creation_type: (project) => {
        return project?.project_creation_type_name || project?.project_creation_type || "";
      },
    };
  }, [users]);

  const { sortedData, handleSort } = useTableSort(projects, "", "asc", customGetters);
  const [showFilters, setShowFilters] = useState(false);
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const tableContainerRef = React.useRef(null);

  const handleDuplicate = async (e, project) => {
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
          didOpen: () => { Swal.showLoading(); }
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

  const handleDelete = async (e, project) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const customer = project.customer_ids?.[0];

    const displayName = project.project_name || "Unnamed Project";

    const result = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you really want to delete "${displayName}"?`,
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
        console.error("Delete error:", err);
      }
    }
  };

  const handleStatusChangeClick = async (e, project, newStatus) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (newStatus === "lost") {
      setSelectedProject(project);
    } else if (newStatus === "bid_submitted") {
      setSelectedProject(project);
      setShowBidDialog(true);
    } else {
      if (newStatus === "completed") {
        try {
          Swal.fire({
            title: 'Verifying...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
          });

          const res = await getChecklists(project.id);
          const checklists = res || [];
          Swal.close();

          if (checklists?.length === 0) {
            return Swal.fire({
              title: "No Checklists Found",
              text: "Please add at least one checklist before completing the project.",
              icon: "warning",
              confirmButtonColor: "#f59e0b",
            });
          }

          const allValid = checklists.every(
            (item) => item.status === "Completed" || item.status === "N/A"
          );

          if (!allValid) {
            return Swal.fire({
              title: "Incomplete Checklist",
              text: "Please complete all checklist items before marking the project as completed.",
              icon: "warning",
              confirmButtonColor: "#f59e0b",
            });
          }
        } catch (error) {
          console.error("Checklist verification error:", error);
          Swal.close();
          return Swal.fire("Error", "Failed to verify checklist status.", "error");
        }
      }

      try {
        if (onStatusChange && typeof onStatusChange === 'function') {
          onStatusChange(project.id, newStatus);
        }
      } catch (error) {
        console.error("Status update error:", error);
        Swal.fire("Error", "Failed to update project status.", "error");
      }
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
    setSelectedProject(null);
  };

  const getStatusActions = (project) => {
    const actions = [];
    const currentStatus = project.status;

    if (currentStatus === "bid_submitted") {
      actions.push({ label: "Mark Awarded", value: "awarded" });
      actions.push({ label: "Mark Lost", value: "lost" });
      actions.push({ label: "Mark Cancelled", value: "cancelled" });
    } else if (currentStatus === "awarded") {
      actions.push({ label: "Start Processing", value: "processing" });
    } else if (currentStatus === "processing") {
      actions.push({ label: "Mark Completed", value: "completed" });
    }

    if (currentStatus !== 'completed' && currentStatus !== 'cancelled' && currentStatus !== 'lost') {
      actions.push({ label: "Cancel Project", value: "cancelled" });
    }

    return actions;
  };

  const renderActions = (project) => (
    <div className="flex justify-center">
      <DropdownMenu
        open={menuOpen[project.id]}
        onOpenChange={(open) => {
          setMenuOpen(prev => ({ ...prev, [project.id]: open }));
          if (open) { onClearSelection?.(); }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-gray-700temp">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white border-gray-200">
          <>
            {canEdit && (
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen({ ...menuOpen, [project.id]: false });
                  onEdit(project);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  setMenuOpen({ ...menuOpen, [project.id]: false });
                  handleDuplicate(e, project);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Project
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                onClick={(e) => {
                  setMenuOpen({ ...menuOpen, [project.id]: false });
                  handleDelete(e, project);
                }}
                className="text-red-600"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            )}
          </>
          {canEdit &&
            getStatusActions(project).map((action) => (
              <DropdownMenuItem
                key={action.value}
                onClick={(e) => {
                  setMenuOpen({ ...menuOpen, [project.id]: false });
                  handleStatusChangeClick(e, project, action.value);
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
  );

  const columns = [
    {
      label: "Project Name",
      key: "project_name",
      sortKey: "project_name",
      filterKey: "project_name",
      renderCell: (project) => (
        <>
          <Link
            to={(project.is_inactive || project.status === 'lost' || project.status === 'completed') ? `/inactive-projects/${project.id || project._id}` : `/projects/${project.id || project._id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {project.project_name || "Unnamed Project"}
          </Link>
          {project.status === 'lost' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center rounded-full transition-colors ml-2 inline-flex">
                    <Info className="w-4 h-4 text-red-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4 text-left">
                  <div className="space-y-2">
                    <p>
                      <strong>Reason:</strong>{" "}
                      {project.lost_reason}
                      {project.lost_reason_note ? ` : ${project.lost_reason_note}` : ""}
                    </p>
                        {project.lost_date && (
                          <p>
                            <strong>Reviewed on:</strong>{" "}
                            {formatDateUTC(project.lost_date)}
                          </p>
                        )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </>
      ),
    },
    {
      label: "Company Name",
      key: "company_name",
      sortKey: "customer_ids.0.company_name",
      filterKey: "company_name",
      renderCell: (project) => {
        const customer = project.customer_ids?.[0];
        const companyName = customer?.company_name || "-";
        const customerId = customer?.id || customer?._id;
        return customerId ? (
          <Link
            to={`/customers/${customerId}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {companyName}
          </Link>
        ) : (
          <span>{companyName}</span>
        );
      },
    },
    {
      label: "Contact Name",
      key: "contact_name",
      sortKey: "customer_ids.0.contact_name",
      filterKey: "customer_name",
      renderCell: (project) => {
        const customer = project.customer_ids?.[0];
        return <p className="font-medium">{customer?.contact_name || "-"}</p>;
      },
    },
    {
      label: "Project Number",
      key: "project_number",
      sortKey: "project_number",
      filterKey: "project_number",
      renderCell: (project) => project.project_number || "-",
    },
    {
      label: "Division Type",
      key: "project_type",
      sortKey: "project_type",
      filterKey: "project_type",
      renderFilter: () => (
        <Select
          value={columnFilters.project_type || "all"}
          onValueChange={(value) =>
            onColumnFilterChange("project_type", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <div className="truncate w-full pr-5 text-left">
              <SelectValue placeholder="Select Division" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {divisions
              .filter((division) => {
                if (division.status !== "active") return false;
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const ownerId = currentUser.role_type === "admin"
                  ? (currentUser.id || currentUser._id)
                  : currentUser.created_by;
                return String(division.created_by) === String(ownerId);
              })
              .map((division) => (
                <SelectItem key={division.value} value={division.value}>
                  {division.display_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      ),
      renderCell: (project) => project?.project_type_name || project.project_type || "-",
    },
    {
      label: "Created Date",
      key: "createdAt",
      sortKey: "created_date",
      filterKey: "createdAt",
      renderFilter: () => (
        <CustomDatePicker
          value={columnFilters.createdAt || ""}
          onChange={(date) => onColumnFilterChange("createdAt", date)}
          portalId="root"
        />
      ),
      renderCell: (project) => formatDateUTC(project.created_date || project.createdAt),
    },
    {
      label: "Created By",
      key: "created_by",
      sortKey: "created_by",
      filterKey: "created_by",
      renderCell: (project) => {
        let creatorId = project.created_by_user;
        if (typeof creatorId === 'object' && creatorId !== null) {
          creatorId = creatorId.$oid || creatorId._id || creatorId.id || creatorId;
        }
        if (!creatorId) return "-";
        
        const creator = users.find(u => String(u.id || u._id) === String(creatorId));
        if (creator) {
          return creator.full_name || `${creator.first_name || ""} ${creator.last_name || ""}`.trim() || creator.name || creator.email || "-";
        }
        return "-";
      },
    },
    {
      label: "Value",
      key: "estimated_value",
      sortKey: "estimated_value",
      filterKey: "estimated_value",
      hidden: user?.role_type === "Crew View",
      className: "font-semibold",
      renderCell: (project) => (
        <div className="flex flex-col">
          <span className="font-semibold">
            {formatCurrency(project.totalProjectValue || project.estimated_value || 0)}
          </span>
        </div>
      ),
    },
    {
      label: "Status",
      key: "status",
      sortKey: "status",
      filterKey: "status",
      headerClassName: "text-center",
      className: "text-center",
      renderFilter: () => (
        <Select
          value={columnFilters.status || "all"}
          onValueChange={(value) =>
            onColumnFilterChange("status", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {window.location.pathname.includes('inactive') ? (
              <>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="actively_working">Actively Working</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      ),
      renderCell: (project) => {
        const displayStatus = project.displayStatus || project.status;
        return (
          <Badge
            className={
              statusColors[displayStatus]?.color ||
              "bg-gray-100 text-gray-800"
            }
          >
            {statusColors[displayStatus]?.label ||
              displayStatus.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      label: "Project Type",
      key: "project_creation_type",
      sortKey: "project_creation_type",
      filterKey: "project_creation_type",
      headerClassName: "text-center",
      className: "text-center",
      renderFilter: () => (
        <Select
          value={columnFilters.project_creation_type || "all"}
          onValueChange={(value) =>
            onColumnFilterChange("project_creation_type", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <div className="truncate w-full pr-5 text-left">
              <SelectValue placeholder="Project Type" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new_project">New Project</SelectItem>
            <SelectItem value="service_work_order">Service Work</SelectItem>
          </SelectContent>
        </Select>
      ),
      renderCell: (project) =>
        project?.project_creation_type_name || project?.project_creation_type || "-",
    },
    {
      label: "Materials",
      key: "materials_status",
      sortKey: "materials_status",
      filterable: false,
      headerClassName: "text-center",
      className: "text-center",
      renderCell: (project) =>
        project.materials_status ? (
          <div
            className={`flex items-center justify-center gap-1 ${materialStatusColors[project.materials_status]}`}
          >
            <Package className="w-4 h-4" />
            <span className="text-xs">{project.materials_status}</span>
          </div>
        ) : (
          <span>-</span>
        ),
    },
    {
      label: "Priority",
      key: "priority",
      sortKey: "priority",
      filterable: false,
      headerClassName: "text-center",
      className: "text-center capitalize",
      renderCell: (project) => project.priority || "-",
    },
    {
      label: "Site Address",
      key: "location",
      filterKey: "location",
      renderCell: (project) => project.location || "-",
    },
    {
      label: "Description",
      key: "description",
      filterKey: "description",
      renderCell: (project) => <ViewMoreText text={project.description} title="Description" />,
    },
    {
      label: "Scope of Work",
      key: "requirements",
      filterKey: "requirements",
      renderCell: (project) => <ViewMoreText text={project.requirements} title="Scope of Work" />,
    },
    {
      label: "Notes",
      key: "special_instructions",
      filterKey: "special_instructions",
      renderCell: (project) => <ViewMoreText text={project.special_instructions} content={renderTextWithLinks(project.special_instructions)} title="Notes" />,
    },
    {
      label: "File Attachments",
      key: "file_attachments",
      sortable: false,
      filterable: false,
      headerClassName: "text-center",
      className: "px-2 py-3",
      renderCell: (project) => <FileAttachmentsCell attachments={project.file_attachments} title="Project Attachments" />,
    },
    {
      label: "Actions",
      key: "action",
      sortable: false,
      filterable: false,
      headerClassName: "text-center",
      className: "px-4 py-3",
      renderCell: renderActions,
    },
  ];

  const availableColumns = columns.filter((col) => !col.hidden);
  const availableColumnsByKey = new Map(availableColumns.map((col) => [col.key, col]));
  const visibleColumns = visibleColumnKeys
    .map((key) => availableColumnsByKey.get(key))
    .filter(Boolean);

  const allSelected = projects.length > 0 && selectedItems.length === totalFilteredCount;
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalFilteredCount;

  const renderColumnFilter = (col) => {
    if (col.filterable === false) return null;
    if (col.renderFilter) return col.renderFilter();
    return (
      <TableHeaderFilter
        placeholder="Search..."
        value={columnFilters[col.filterKey || col.key] || ""}
        onChange={(value) => onColumnFilterChange(col.filterKey || col.key, value)}
        className="h-8 text-xs"
      />
    );
  };

  return (
    <>
      <AnimatePresence>
        {showBidDialog && selectedProject && (
          <BidSubmissionDialog
            project={selectedProject}
            customers={customers}
            onClose={() => {
              setShowBidDialog(false);
              setSelectedProject(null);
            }}
            onSubmit={handleBidSubmit}
          />
        )}
      </AnimatePresence>

      <div className="table-listrow-divstyle">
        <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide" className="text-sm">
          <TableHeader className="bg-gray50-temp text-gray-700temp font-medium dark:bg-gray-900">
            <TableRow>
              <TableHead className="w-12 text-center">
                <div className="flex flex-col items-left justify-center gap-2 p-2">
                  <button
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="p-0 bg-transparent border-none hover:text-blue-600 text-gray-600temp dark:text-white"
                  >
                    {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                  </button>
                  {canDelete && (
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={onSelectAll}
                    />
                  )}
                </div>
              </TableHead>

              {visibleColumns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`px-2 py-3 text-left select-none ${col.sortable === false ? "" : "cursor-pointer"} ${col.headerClassName || ""}`}
                  onClick={() => col.sortable === false ? undefined : handleSort(col.sortKey || col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.headerClassName === "text-center" ? "justify-center" : ""}`}>
                    <span>{col.label}</span>
                    {col.sortable !== false && <ArrowUpDown className="w-4 h-4 text-gray-400temp" />}
                  </div>
                </TableHead>
              ))}
            </TableRow>

            {showFilters && (
              <TableRow className="bg-white border-t dark:bg-gray-900">
                <TableHead></TableHead>
                {visibleColumns.map((col) => (
                  <TableCell key={col.key}>
                    {DEFAULT_PROJECT_VISIBLE_COLUMNS.includes(col.key)
                      ? renderColumnFilter(col)
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableHeader>

          <TableBody>
            {sortedData.length > 0 &&
              sortedData.map((project) => {
                const isSelected = selectedItems.includes(project.id);
                return (
                  <TableRow
                    key={project.id}
                    className={`hover:bg-gray50-temp dark:hover:bg-gray-700 transition border-b ${isSelected ? "bg-blue-50 dark:bg-gray-700" : ""}`}
                  >
                    <TableCell className="px-4 py-3">
                      {canDelete && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => onSelectItem(project.id, checked)}
                        />
                      )}
                    </TableCell>

                    {visibleColumns.map((col) => (
                      <TableCell key={col.key} className={col.className || "px-2 py-3"}>
                        {col.renderCell(project)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
      <StickyScrollbar tableContainerRef={tableContainerRef} />
    </>
  );
}

export default React.memo(ProjectListRow);
