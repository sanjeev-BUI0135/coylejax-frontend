import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Trash2, Phone, Mail, UserRoundPen, Edit, Calculator, Calendar } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns"
import { formatDateUTC } from "@/utils/formatdate";

function LeadCard({
  lead,
  users = [],
  currentUser,
  leadStatuses,
  hasAllLeadsAccess,
  selected,
  onSelect,
  onDelete,
  onConvert,
  onEdit,
  canUpdate,
  canDelete,
  onAssign,
  assigningLeadId,
  onQuickEstimate
}) {
  const [selectedUser, setSelectedUser] = useState("unassigned");

  const filteredUsers = users.filter((u) =>
    u.project_type?.includes(lead.division) && u.leads_assigned
  );

  let finalUsers = [...filteredUsers];
  const assignedUserId = lead.assigned_to?._id || (typeof lead.assigned_to === 'string' ? lead.assigned_to : null);
  
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

  useEffect(() => {
    setSelectedUser(
      lead.assigned_to?._id || "unassigned"
    );
  }, [lead.assigned_to?._id]);

  const handleAssignClick = useCallback(() => {
    if (
      selectedUser === "unassigned" ||
      selectedUser === lead.assigned_to?._id
    ) return;

    onAssign?.(lead._id, selectedUser);
  }, [selectedUser, lead, onAssign]);

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

  const leadStatusMap = useMemo(() => {
    const map = {};
    leadStatuses.forEach(status => {
      map[status.value] = status.display_name;
    });

    return map;
  }, [leadStatuses]);

  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{lead.customer_name}</h3>
          <p className="text-sm text-gray-500">
            {lead.company_name || "—"}
          </p>
        </div>

        <div className="flex">
          {canUpdate && (
            <Button variant="ghost" onClick={() => onEdit?.(lead)} className="me-1">
              <Edit className="w-4 h-4 text-gray-600temp" />
            </Button>
          )}
          {canDelete && <Button variant="ghost" onClick={() => onDelete?.(lead._id)} className="me-1">
            <Trash2 className="w-4 h-4 text-gray-500 hover:text-black" />
          </Button>}

          {canUpdate && <Button variant="ghost" onClick={() => onConvert?.(lead._id)} className="me-1">
            <UserRoundPen className="w-4 h-4 text-blue-600 hover:text-blue-800" />
          </Button>}
          {canUpdate && (
            <Button
              variant="ghost"
              onClick={() => onQuickEstimate?.(lead)}
              title="Quick Estimate"
              className="me-1"
            >
              <Calculator className="w-4 h-4 text-purple-600 hover:text-purple-800" />
            </Button>
          )}

          {canDelete && <input
            type="checkbox"
            checked={selected}
            onChange={e => onSelect?.(lead._id, e.target.checked)}
          />}

        </div>
      </div>
      <div className="mt-3 text-sm flex items-center gap-2">
        <Mail className="w-4 h-4" />
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
      </div>
      {/* PHONE */}
      <div className="mt-3 text-sm flex items-center gap-2">
        <Phone className="w-4 h-4" />
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
      </div>
      <div className="mt-3 text-sm flex items-center gap-2">
        {leadStatusMap[lead.lead_status] || lead.lead_status}
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase">Created</span>
            <span className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200">
              {formatDateUTC(lead.createdAt)}
            </span>
          </div>
        </div>
        {lead.due_date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Due Date</span>
              <span className="text-xs bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 px-2 py-1 rounded border border-blue-100 dark:border-slate-700">
                {formatDateUTC(lead.due_date)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN */}
      <div className="mt-4 flex gap-2 items-center">
        {canUpdate && <Select
          value={selectedUser}
          onValueChange={setSelectedUser}
        >
          <SelectTrigger className="w-full h-8">
            <SelectValue placeholder="Select User" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="unassigned">
              Unassigned
            </SelectItem>

            {finalUsers.map(u => (
              <SelectItem key={u._id} value={u._id} className={u.isHiddenOption ? "hidden" : ""}>
                {u.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>}

        {canUpdate && <Button
          disabled={
            assigningLeadId === lead._id ||
            selectedUser === "unassigned" ||
            selectedUser === lead.assigned_to?._id
          }
          onClick={handleAssignClick}
          className={`px-3 py-1 text-xs rounded flex items-center gap-1
            ${assigningLeadId === lead._id
              ? "bg-gray-300 text-gray-600 cursor-wait"
              : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
        >
          {assigningLeadId === lead._id ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Assigning...
            </>
          ) : (
            <>
              <UserRoundPen className="w-4 h-4" />
              Assign
            </>
          )}
        </Button>}
      </div>
    </div>
  );
}

export default React.memo(LeadCard);
