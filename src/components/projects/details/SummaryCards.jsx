import React from "react";
import { User as UserIcon, Building2, MapPin, DollarSign, Calendar, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { formatDateUTC } from "../../../utils/formatdate";
import { useHierarchyUsers } from "@/hooks/useHierarchyUsers";

export default function SummaryCards({ project, projectCustomers, customer, subProjects, subProjectsTotal, totalProjectValue, user, priorityColors }) {
  const navigate = useNavigate();
  const hierarchyUsers = useHierarchyUsers(user);
  
  let pmName = project?.project_manager_name || project?.manager || "";
  if (!pmName && (project?.created_by_user || project?.created_by) && hierarchyUsers.length > 0) {
    let cid = project.created_by_user || project.created_by;
    if (typeof cid === 'object' && cid !== null) {
      cid = cid.$oid || cid._id || cid.id || cid;
    }
    const foundUser = hierarchyUsers.find(u => String(u._id || u.id) === String(cid));
    if (foundUser) {
      pmName = foundUser.full_name || foundUser.name || `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4 text-sm">
      <div className="flex items-center gap-2 bg-muted p-1 rounded border border-white dark:border-gray-700 dark:bg-gray-800">
        <UserIcon className="w-4 h-4" />

        {projectCustomers?.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {projectCustomers.map((c, index) => (
              <span
                key={c._id}
                onClick={() =>
                  navigate(`/customers/${c._id}?projectId=${project.id}`)
                }
                className="cursor-pointer text-blue-600 hover:underline"
              >
                {c.contact_name}
                {index < projectCustomers.length - 1 && ','}
              </span>
            ))}
          </span>
        ) : (
          <span
            className="cursor-pointer text-blue-600 hover:underline"
            onClick={() => customer?._id && navigate(`/customers/${customer._id}`)}
          >
            {customer?.contact_name || "No customer"}
          </span>
        )}
      </div>


      <div className="flex items-center gap-2 bg-muted p-1 rounded border border-white dark:border-gray-700 dark:bg-gray-800">
        <Building2 className="w-4 h-4 " />
        <span>{project?.project_type_name || (project.project_type || '').replace("_", " ")}</span>
      </div>

      <div className="flex items-center gap-2 bg-muted p-1 rounded border border-white dark:border-gray-700 dark:bg-gray-800">
        <Briefcase className="w-4 h-4 " />
        <span>PM: {pmName || "N/A"}</span>
      </div>



      {user?.role_type !== "Crew View" && (
        <div className="flex flex-col gap-1 bg-muted p-2 rounded border border-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 " />
            <span className="font-semibold">
              Total Est. {formatCurrency(totalProjectValue)}
            </span>
          </div>
          {!project.is_sub_project && subProjects.length > 0 && (
            <div className="text-xs text-gray-600temp pl-6 space-y-0.5">
              <div>Main: {formatCurrency(project.estimated_value)}</div>
              <div>Sub-Projects: {formatCurrency(subProjectsTotal)}</div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 bg-muted p-1 rounded border border-white dark:border-gray-700 dark:bg-gray-800">
        <Calendar className="w-4 h-4 " />
        <span>Start: {project.estimated_start_date ? formatDateUTC(new Date(project.estimated_start_date), "MMM d, yyyy") : 'N/A'}</span>
      </div>

      <div className="flex items-center gap-2 bg-muted p-1 rounded border border-white dark:border-gray-700 dark:bg-gray-800">
        <Calendar className="w-4 h-4 " />
        <span>End: {project.estimated_end_date ? formatDateUTC(new Date(project.estimated_end_date), "MMM d, yyyy") : 'N/A'}</span>
      </div>
    </div>
  );
}
