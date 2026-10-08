import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import TableHeaderFilter from "@/components/shared/TableHeaderFilter";
import { Trash, Filter, X, ArrowUpDown, UserRoundPen, Edit, Calculator, MoreHorizontal, UserRound } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useTableSort } from "@/hooks/useTableSort";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { buildPermissionMap } from "../../utils/buildPermissionMap";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { formatDateUTC } from "@/utils/formatdate";
import StickyScrollbar from "@/components/shared/StickyScrollbar";

function LeadListView({
  leads = [],
  users = [],
  divisions = [],
  leadStatuses = [],
  hasAllLeadsAccess,
  onEdit,
  selectedItems = [],
  currentUser,
  onSelectItem,
  onSelectAll,
  onClearSelection,
  canUpdate,
  canDelete,
  onAssign,
  assigningLeadId,
  onDelete,
  onConvert,
  columnFilters = {},
  onColumnFilterChange,
  onQuickEstimate
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [pendingAssign, setPendingAssign] = useState({});
  const tableContainerRef = useRef(null);

  useEffect(() => {
    setPendingAssign({});
  }, [leads]);
  /* ---------------- PRE-GROUP USERS (BIG WIN) ---------------- */


  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "MMM d, yyyy");
    } catch (error) {
      return "Invalid Date";
    }
  };

  /* ---------------- FILTER LEADS ---------------- */
  const filteredData = useMemo(() => {
    return leads;
  }, [leads]);

  const { sortedData, handleSort } = useTableSort(filteredData);

  /* ---------------- CALLBACKS ---------------- */
  const toggleFilters = useCallback(() => {
    setShowFilters(p => !p);
  }, []);

  const handleSelectAllLocal = useCallback((v) => {
    onSelectAll?.(v);
  }, [onSelectAll]);

  const handlePendingAssign = useCallback((leadId, value) => {

    setPendingAssign(prev => ({
      ...prev,
      [leadId]:
        value === "unassigned" || !value
          ? "unassigned"
          : value
    }));

  }, []);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canview = buildPermissionMap(user.permissions, "Projects");
  const divisionMap = useMemo(() => {
    const map = {};
    divisions.forEach(d => {
      map[d.value] = d.display_name;
    });
    return map;
  }, [divisions]);
  const leadStatusMap = useMemo(() => {
    const map = {};
    leadStatuses.forEach(status => {
      map[status.value] = status.display_name;
    });

    return map;
  }, [leadStatuses]);

  return (
    <div className="relative">
      <div className="bg-white dark:bg-gray-900 rounded-lg border overflow-hidden relative">
        <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide">
          <TableHeader>
          {/* HEADER ROW */}
          <TableRow>
            <TableHead className="w-10">
              <div className="flex flex-col items-left gap-2 pt-2 pb-2">
                <button
                  onClick={toggleFilters}
                  className="p-0 bg-transparent border-none hover:text-blue-600 text-gray-600"
                >
                  {showFilters ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Filter className="w-4 h-4" />
                  )}
                </button>

                {canDelete && <Checkbox
                  checked={
                    leads.length > 0 &&
                    leads.every(l => selectedItems.includes(l._id))
                  }
                  onCheckedChange={handleSelectAllLocal}
                />}
              </div>
            </TableHead>

            <TableHead onClick={() => handleSort("company_name")}>
              <div className="flex items-center gap-1">
                Company <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>

            <TableHead onClick={() => handleSort("customer_name")}>
              <div className="flex items-center gap-1">
                Contact <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>

            <TableHead onClick={() => handleSort("email")}>
              <div className="flex items-center gap-1">
                Email <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>

            <TableHead onClick={() => handleSort("phone")}>
              <div className="flex items-center gap-1">
                Phone <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>

            <TableHead onClick={() => handleSort("division")}>
              <div className="flex items-center gap-1">
                Division <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>
            <TableHead onClick={() => handleSort("lead_status")}>
              <div className="flex items-center gap-1">
                Status <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>
            <TableHead onClick={() => handleSort("due_date")}>
              <div className="flex items-center gap-1">
                Due Date <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>
            <TableHead onClick={() => handleSort("createdAt")}>
              <div className="flex items-center gap-1">
                Created Date <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </div>
            </TableHead>
            <TableHead>Assign User</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>

          {/* FILTER ROW */}
          {showFilters && (
            <TableRow>
              {/* Checkbox column */}
              <TableHead />

              {[
                "company_name",
                "customer_name",
                "email",
                "phone",
                "division",
                "lead_status",
                "due_date",
                "createdAt",
                "assigned_to"
              ].map((key) => (
                <TableHead key={key}>

                  {/* DATE FILTER */}
                  {key === "createdAt" || key === "due_date" ? (
                    <CustomDatePicker
                      value={columnFilters[key] || ""}
                      onChange={(val) =>
                        onColumnFilterChange?.(key, val)
                      }
                      className="h-8 text-xs"
                      portalId="root"
                    />
                  )

                    /* DIVISION DROPDOWN */
                    : key === "division" ? (
                      <Select
                        value={columnFilters[key] || "all"}
                        onValueChange={(val) =>
                          onColumnFilterChange?.(
                            key,
                            val === "all" ? "" : val
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>

                          {divisions.map((division) => (
                            <SelectItem
                              key={division._id}
                              value={division.value}
                            >
                              {division.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                      : key === "lead_status" ? (
                        <Select
                          value={columnFilters[key] || "all"}
                          onValueChange={(val) =>
                            onColumnFilterChange?.(
                              key,
                              val === "all" ? "" : val
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>

                            {leadStatuses.map((status) => (
                              <SelectItem
                                key={status._id}
                                value={status.value}
                              >
                                {status.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                        /* ASSIGNED USER DROPDOWN */
                        : key === "assigned_to" ? (
                          <Select
                            value={columnFilters[key] || "all"}
                            onValueChange={(val) =>
                              onColumnFilterChange?.(
                                key,
                                val === "all" ? "" : val
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Assigned user" />
                            </SelectTrigger>

                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              {users
                                .filter((user) => user.leads_assigned)
                                .map((user) => (
                                  <SelectItem
                                    key={user._id}
                                    value={user._id}
                                  >
                                    {user.full_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )

                          /* NORMAL INPUT */
                          : (
                            <TableHeaderFilter
                              value={columnFilters[key] || ""}
                              onChange={(val) => {
                                if (key === "phone") {
                                  const digits = val.replace(/\D/g, "").slice(0, 10);
                                  let formatted = val;
                                  if (digits.length > 0) {
                                    if (digits.length <= 3) formatted = digits;
                                    else if (digits.length <= 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                                    else formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                                  } else {
                                    formatted = "";
                                  }
                                  onColumnFilterChange?.(key, formatted);
                                } else {
                                  onColumnFilterChange?.(key, val);
                                }
                              }}
                              placeholder={
                                key === "customer_name"
                                  ? "contact name..."
                                  : `${key.replace("_", " ")}...`
                              }
                            />
                          )}
                </TableHead>
              ))}

              {/* Actions column */}
              <TableHead />
            </TableRow>
          )}
        </TableHeader>

        <TableBody>
          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-12">
                <div className="flex flex-col items-center justify-center">
                  <UserRound className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No leads found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {Object.values(columnFilters || {}).some(v => v !== "")
                      ? "No leads match your filter criteria"
                      : "Get started by creating your first lead"}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}

          {sortedData.map((lead) => {
            const filteredUsers = users.filter((u) =>
              u.project_type?.includes(lead.division) && u.leads_assigned
            );
            
            const assignedUserId = lead.assigned_to?._id || (typeof lead.assigned_to === 'string' ? lead.assigned_to : null);
            let finalUsers = [...filteredUsers];
            
            if (assignedUserId) {
              const exists = finalUsers.some(u => u._id === assignedUserId);
              if (!exists) {
                const missingUser = users.find(u => u._id === assignedUserId);
                if (missingUser) {
                  finalUsers.push({ ...missingUser, isHiddenOption: true });
                } else if (lead.assigned_to?.full_name) {
                  finalUsers.push({ ...lead.assigned_to, isHiddenOption: true });
                }
              }
            }

            const selectedUser = pendingAssign[lead._id];

            const isDisabled =
              !selectedUser ||
              selectedUser === "unassigned" ||
              selectedUser === lead.assigned_to?._id;

            return (
              <TableRow key={lead._id}>
                <TableCell>
                  {canDelete && <Checkbox
                    checked={selectedItems.includes(lead._id)}
                    onCheckedChange={(v) =>
                      onSelectItem?.(lead._id, v)
                    }
                  />}
                </TableCell>

                <TableCell>{lead.company_name || "-"}</TableCell>
                <TableCell className="font-medium">{lead.customer_name || "-"}</TableCell>
                <TableCell>
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.email}
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {divisionMap[lead.division] || "-"}
                </TableCell>
                <TableCell>
                  {lead.lead_status ? (
                    <span className="px-1 py-1 text-xs font-medium">
                      {leadStatusMap[lead.lead_status] || lead.lead_status}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{formatDateUTC(lead.due_date)}</TableCell>
                <TableCell>{formatDateUTC(lead.createdAt)}</TableCell>

                {/* ASSIGN */}
                <TableCell>
                  {canUpdate && <Select
                    value={
                      selectedUser !== undefined
                        ? selectedUser
                        : (lead.assigned_to?._id || "unassigned")
                    }
                    onValueChange={(v) =>
                      handlePendingAssign(lead._id, v)
                    }
                  >
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="unassigned">
                        Unassigned
                      </SelectItem>

                      {finalUsers.map((u) => (
                        <SelectItem key={u._id} value={u._id} className={u.isHiddenOption ? "hidden" : ""}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>}
                </TableCell>

                {/* ACTIONS */}
                <TableCell className="text-right flex items-center justify-end gap-2">

                  {/* Assign Button */}
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      disabled={isDisabled || assigningLeadId === lead._id}
                      onClick={() => {
                        if (!selectedUser || selectedUser === "unassigned") return;
                        onAssign?.(lead._id, selectedUser);
                      }}
                      className={`flex items-center gap-1 ${assigningLeadId === lead._id
                        ? "text-gray-400 cursor-wait"
                        : isDisabled
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-green-600 hover:text-green-800"
                        }`}
                    >
                      {assigningLeadId === lead._id ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <UserRoundPen className="w-4 h-4" />
                          Assign
                        </>
                      )}
                    </Button>
                  )}

                  {/* Dropdown Actions */}
                  <DropdownMenu onOpenChange={(open) => { if (open) { onClearSelection?.(); } }}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-48">

                      {canUpdate && (
                        <DropdownMenuItem onClick={() => onEdit?.(lead)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Lead
                        </DropdownMenuItem>
                      )}

                      {canUpdate && (
                        <DropdownMenuItem onClick={() => onConvert?.(lead._id)}>
                          <UserRoundPen className="w-4 h-4 mr-2" />
                          Convert to Contact
                        </DropdownMenuItem>
                      )}

                      {canUpdate && canview?.widgets?.Estimates?.add && (
                        <DropdownMenuItem onClick={() => onQuickEstimate?.(lead)}>
                          <Calculator className="w-4 h-4 mr-2" />
                          Quick Estimate
                        </DropdownMenuItem>
                      )}

                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete?.(lead._id)}
                          className="text-red-600"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete Lead
                        </DropdownMenuItem>
                      )}

                    </DropdownMenuContent>
                  </DropdownMenu>

                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
      <StickyScrollbar tableContainerRef={tableContainerRef} />
    </div>
  );
}

export default React.memo(LeadListView);