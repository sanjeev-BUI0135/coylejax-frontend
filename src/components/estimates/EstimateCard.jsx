import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, DollarSign, Edit, FileText, Building2, User, Paperclip, ArrowRight, History, Printer, MoreVertical, ChevronDown, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatDateUTC } from "@/utils/formatdate";

const statusColors = {
  draft: "bg-gray-100 text-gray-800temp",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  // expired: "bg-orange-100 text-orange-800"
};

const formatSafeDate = (date, formatString = "MMM d, yyyy") => {
  if (!date) return null;

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    return format(dateObj, formatString);
  } catch (error) {
    console.warn('Invalid date format:', date);
    return null;
  }
};

export default function EstimateCard({
  estimate,
  projects,
  customers,
  divisions,
  onEdit,
  onClearSelection,
  onEstimateUpdate,
  onPrint,
  onPrintDocx,
  onEstimateClick,
  selectedItems = [],
  onSelectItem,
  totalFilteredCount,
  onConvertToProject,
  canUpdate,
  canDelete,
  onStatusChange
}) {
  const project = estimate.project ||
  projects.find(
    (p) =>
      p._id?.toString() === estimate.project_id?.toString() ||
      p.id?.toString() === estimate.project_id?.toString()
  );
  const customer = project?.customer_ids?.[0];

  const formatDate = (dateValue, fallback = "N/A") => {
    if (!dateValue) return fallback;
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? fallback : format(date, "MMM d, yyyy");
  };

  const formattedCreatedDate = formatSafeDate(estimate.created_date);
  const formattedRevisionDate = formatSafeDate(estimate.revision_date);
  const formattedValidUntil = formatSafeDate(estimate.valid_until);

  const someSelected = selectedItems.length > 0 && selectedItems.length < totalFilteredCount;
  const isSelected = selectedItems.includes(estimate.id);

  const user = JSON.parse(localStorage.getItem("user")) || {};

  const canConvert = (estimate) => {
    return estimate.is_quick_estimate &&
      estimate.status === 'approved' &&
      !estimate.converted_to_project;
  };

  const getDivisionDisplayName = (value) => {
    if (!value || !Array.isArray(divisions)) return value || "N/A";
    const user = JSON.parse(localStorage.getItem("user") || {});
    const ownerId = user.created_by || user.id;
    let division = divisions.find(
      (d) => d.value === value && d.created_by === ownerId
    );
    if (!division) {
      division = divisions.find((d) => d.value === value);
    }
    return division?.display_name || value;
  };

  const displayName = project?.project_name;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="h-full"
      >
        <Card className="h-full hover:shadow-lg transition-all duration-300 flex flex-col bg-white">

          <CardHeader className="pb-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {canDelete && (
                  <Checkbox
                    indeterminate={someSelected}
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectItem(estimate.id, checked)}
                    className="mt-1"
                  />
                )}

                <div className="min-w-0 w-full">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <Link
                      to={`/estimate/${estimate._id}`}
                      className="flex-1 min-w-0"
                    > <CardTitle className="text-lg text-blue-600 font-semibold truncate">
                        {estimate.estimate_number}
                      </CardTitle>
                    </Link>
                    <div >
                      {canUpdate && estimate.status !== 'approved' && estimate.status !== 'rejected' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="outline-none">
                            <Badge className={`${statusColors[estimate.status]} cursor-pointer`}>
                              {estimate.status}
                              <ChevronDown className="w-3 h-3 ml-1 inline-block" />
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Object.keys(statusColors).map((statusKey) => (
                              <DropdownMenuItem key={statusKey} onClick={() => onStatusChange && onStatusChange(estimate, statusKey)}>
                                <span className="capitalize">{statusKey}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge className={statusColors[estimate.status]}>
                          {estimate.status}
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu onOpenChange={(open) => { if (open) { onClearSelection?.(); } }}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="ml-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48">

                        {canUpdate && (
                          <DropdownMenuItem onClick={() => onEdit(estimate)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Estimate
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={() => onPrint(estimate, "summary")}>
                          <Download className="w-4 h-4 mr-2" />
                          Summary PDF
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onPrint(estimate, "details")}>
                          <Download className="w-4 h-4 mr-2" />
                          Details PDF
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onPrintDocx(estimate, "summary")}>
                          <Download className="w-4 h-4 mr-2 text-blue-600" />
                          Summary Word
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onPrintDocx(estimate, "details")}>
                          <Download className="w-4 h-4 mr-2 text-blue-600" />
                          Details Word
                        </DropdownMenuItem>

                        {canConvert(estimate) && (
                          <DropdownMenuItem
                            onClick={() => onConvertToProject(estimate)}
                            className="text-green-600"
                          >
                            <Building2 className="w-4 h-4 mr-2" />
                            Convert to Project
                          </DropdownMenuItem>
                        )}

                      </DropdownMenuContent>
                    </DropdownMenu>

                  </div>

                  <div className="flex items-center justify-between mt-1 gap-2">
                    <p className="text-sm text-gray-500temp truncate">
                      {estimate.is_quick_estimate ? (
                        <span className="text-gray-900temp font-medium">
                          {estimate.quick_customer?.project_name || (`${estimate.quick_customer?.company_name} - ${estimate.quick_customer?.customer_name}`) || "N/A"}
                        </span>
                      ) : project ? (
                        <Link
                          to={(project.is_inactive || project.status === 'lost' || project.status === 'completed') ? `/inactive-projects/${project._id || project.id}` : `/projects/${project._id || project.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {displayName || project?.project_name || "Unnamed Project"}
                        </Link>
                      ) : (
                        <span className="text-gray-500temp">Unknown Project</span>
                      )}
                    </p>

                    {/* {estimate.customer_po_number && (
                      <span className="text-sm text-blue-600 font-medium whitespace-nowrap">
                        PO: {estimate.customer_po_number}
                      </span>
                    )} */}
                  </div>
                </div>
              </div>
            </div>
            {formattedRevisionDate && (
              <div className="flex items-center gap-2 text-xs text-gray-500temp mt-2">
                <History className="w-3 h-3" />
                <span>Revised: {formatDate(estimate.revision_date)}</span>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-0 flex-grow">
            <div className="space-y-4">
              {user?.role_type !== "Crew View" && (<div className="text-center p-4 bg-gray50-temp rounded-lg">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900temp">
                  {formatCurrency(estimate.total_amount)}
                </div>
                <p className="text-sm text-gray-500temp mt-1">Total Amount</p>
              </div>)}

              <div className="space-y-3 pt-4 border-t">
                {customer && (
                  <div className="flex items-center gap-2 text-sm text-gray-600temp">
                    <User className="w-4 h-4" />
                    <span>{customer.contact_name}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600temp">
                  <Building2 className="w-4 h-4" />
                  <span className="truncate">{getDivisionDisplayName(project?.project_type || estimate.quick_customer?.division_type)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600temp">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateUTC(estimate.created_date || estimate.createdAt)}</span>
                </div>

                {/* {formattedValidUntil && (
                  <div className="flex items-center gap-2 text-sm text-gray-600temp">
                    <FileText className="w-4 h-4" />
                    <span>Valid until {formatDate(estimate.valid_until)}</span>
                  </div>
                )} */}
              </div>

              {estimate.line_items && estimate.line_items.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-500temp mb-2">Line Items</p>
                  <div className="space-y-1">
                    {estimate.line_items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="truncate">{item.description}</span>
                        {user?.role_type !== "Crew View" && (<span className="font-medium">{formatCurrency(item.total)}</span>)}
                      </div>
                    ))}
                    {estimate.line_items.length > 3 && (
                      <p className="text-xs text-gray-500temp">
                        +{estimate.line_items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {estimate.file_attachments && estimate.file_attachments.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600temp pt-2 border-t">
                  <Paperclip className="w-4 h-4" />
                  <span>{estimate.file_attachments.length} attachment(s)</span>
                </div>
              )}
            </div>
          </CardContent>
          <div className="p-4 mt-auto border-t">
            {(project?._id || estimate?.project_id) ? (
              <Link to={(project && (project.is_inactive || project.status === 'lost' || project.status === 'completed')) ? `/inactive-projects/${project?._id || estimate?.project_id}` : `/projects/${project?._id || estimate?.project_id}`}>
                <Button variant="outline" className="w-full">
                  View Project <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full cursor-default hover:bg-transparent hover:text-inherit">
                Quick Estimate
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </>
  );
}