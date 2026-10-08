import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Printer, ArrowUpDown, Filter, X, Building2, FileText, Eye, MoreHorizontal, ChevronDown, Download } from "lucide-react";
import { Link } from 'react-router-dom';
import { useMemo, useState, useRef } from "react";
import StickyScrollbar from "../shared/StickyScrollbar";
import { useTableSort } from "@/hooks/useTableSort";
import { formatCurrency } from "@/lib/utils";
import CustomDatePicker from "../ui/CustomDatePicker";
import TableHeaderFilter from "../shared/TableHeaderFilter";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { formatDateUTC } from "@/utils/formatdate";
import { DEFAULT_ESTIMATE_VISIBLE_COLUMNS, ESTIMATE_LIST_COLUMN_OPTIONS } from "../../config/columnConfigs.js";
import ViewMoreText from "../shared/ViewMoreText";
import FileAttachmentsCell from "../shared/FileAttachmentsCell";
import { renderTextWithLinks } from "../ui/renderTextWithLinks.jsx"

const statusColors = {
  draft: "bg-gray-100 text-gray-800temp",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  // expired: "bg-orange-100 text-orange-800",
};

export const getDivisionDisplayName = (value, divisions) => {
  if (!value || !Array.isArray(divisions)) return value || "N/A";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const ownerId = user.created_by || user.id;
  let division = divisions.find(
    (d) => d.value === value && d.created_by === ownerId
  );
  if (!division) {
    division = divisions.find((d) => d.value === value);
  }
  return division?.display_name || value;
};

const getProjectCustomer = (project) => (
  Array.isArray(project?.customer_ids) ? project.customer_ids[0] : null
);

export default function EstimateListRow({
  estimate,
  divisions,
  onEdit,
  onPrint,
  onPrintDocx,
  onClearSelection,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  columnFilters = {},
  onColumnFilterChange,
  totalFilteredCount,
  onConvertToProject,
  canUpdate,
  canDelete,
  visibleColumnKeys = DEFAULT_ESTIMATE_VISIBLE_COLUMNS,
  onStatusChange,
}) {
  const customGetters = useMemo(() => {
    return {
      project_id: (est) => {
        const project = est.project || null;
        if (est.is_quick_estimate) {
          return est.quick_customer?.project_name || (est.quick_customer?.company_name || est.quick_customer?.customer_name ? `${est.quick_customer?.company_name || ""} - ${est.quick_customer?.customer_name || ""}` : "") || "";
        }
        return project?.project_name || "";
      },
      company_name: (est) => {
        const project = est.project || null;
        const customer = getProjectCustomer(project);
        return est.is_quick_estimate
          ? est.quick_customer?.company_name || ""
          : customer?.company_name || "";
      },
      customer_name: (est) => {
        const project = est.project || null;
        const customer = getProjectCustomer(project);
        return est.is_quick_estimate
          ? est.quick_customer?.customer_name || ""
          : customer?.contact_name || "";
      },
      email_address: (est) => {
        const project = est.project || null;
        const customer = getProjectCustomer(project);
        return est.is_quick_estimate
          ? est.quick_customer?.email_address || ""
          : customer?.email || "";
      },
      site_address: (est) => {
        return est.is_quick_estimate
          ? est.quick_customer?.site_address || ""
          : est.project?.location || "";
      },
      billing_address: (est) => {
        return est.billing_address || est.project?.billing_address || est.quick_customer?.billing_address || "";
      },
      type: (est) => {
        return getDivisionDisplayName(est.project?.project_type || est.quick_customer?.division_type, divisions) || "";
      },
      scope_of_work: (est) => {
        return est.Scope_of_work || "";
      },
      additional_markup: (est) => {
        return est.material_markup_amount || 0;
      },
      created_date: (est) => {
        return est.created_date || est.createdAt || "";
      },
    };
  }, [divisions]);

  const { sortedData, handleSort } = useTableSort(estimate, "", "asc", customGetters);
  const [showFilters, setShowFilters] = useState(false);
  const tableContainerRef = useRef(null);
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const allSelected = estimate.length > 0 && selectedItems.length === totalFilteredCount;
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalFilteredCount;

  // Helper function to check if estimate can be converted
  const canConvert = (est) => {
    return est.is_quick_estimate &&
      est.status === 'approved' &&
      !est.converted_to_project;
  };

  const renderActions = (est) => (
    <div className="flex justify-center">
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            onClearSelection?.();
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-gray-700temp"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {canUpdate && (
            <>
              <DropdownMenuItem
                onClick={() => onPrint(est, "summary")}
              >
                <Download className="w-4 h-4 mr-2" />
                Summary PDF
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onPrint(est, "details")}
              >
                <Download className="w-4 h-4 mr-2" />
                Details PDF
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onPrintDocx(est, "summary")}
              >
                <Download className="w-4 h-4 mr-2 text-blue-600" />
                Summary Word
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onPrintDocx(est, "details")}
              >
                <Download className="w-4 h-4 mr-2 text-blue-600" />
                Details Word
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onEdit(est)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Estimate
              </DropdownMenuItem>
            </>
          )}

          {canConvert(est) && canUpdate && (
            <DropdownMenuItem
              onClick={() => onConvertToProject(est)}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Convert To Project
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const columns = [
    {
      label: "Estimate No",
      key: "estimate_number",
      filterKey: "estimate_number",
      renderCell: (est) => (
        <Link
          to={`/estimate/${est._id}`}
          className="flex-grow text-blue-600"
        ><div className="flex items-center gap-2">
            {est.estimate_number}
          </div></Link>
      ),
    },
    {
      label: "Project Name",
      key: "project_id",
      sortKey: "project_id",
      filterKey: "project_name",
      renderCell: (est) => {
        const project = est.project || null;
        return est.is_quick_estimate ? (
          <span className="text-gray-900temp font-medium">
            {est.quick_customer?.project_name || (`${est.quick_customer?.company_name} - ${est.quick_customer?.customer_name}`) || "N/A"}
          </span>
        ) : project ? (
          <Link
            to={(project.is_inactive || project.status === 'lost' || project.status === 'completed') ? `/inactive-projects/${project._id || project.id}` : `/projects/${project._id || project.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {project?.project_name || "Unnamed Project"}
          </Link>
        ) : (
          <span className="text-gray-500temp">Unknown Project</span>
        );
      },
    },
    {
      label: "Company Name",
      key: "company_name",
      filterKey: "company_name",
      renderCell: (est) => {
        const project = est.project || null;
        const customer = getProjectCustomer(project);
        const companyName = est.is_quick_estimate
          ? est.quick_customer?.company_name || "-"
          : customer?.company_name || "-";

        return customer?._id || customer?.id ? (
          <Link
            to={`/customers/${customer?._id || customer?.id}`}
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
      key: "customer_name",
      filterKey: "customer_name",
      renderCell: (est) => (
        est.is_quick_estimate
          ? est.quick_customer?.customer_name || "-"
          : getProjectCustomer(est.project)?.contact_name || "-"
      ),
    },
    {
      label: "Email Address",
      key: "email_address",
      filterKey: "email_address",
      renderCell: (est) => (
        est.is_quick_estimate
          ? est.quick_customer?.email_address || "-"
          : getProjectCustomer(est.project)?.email || "-"
      ),
    },
    {
      label: "Customer PO Number",
      key: "customer_po_number",
      filterKey: "customer_po_number",
      renderCell: (est) => est.customer_po_number || "-",
    },
    {
      label: "Site Address",
      key: "site_address",
      filterKey: "site_address",
      renderCell: (est) => (
        est.is_quick_estimate
          ? est.quick_customer?.site_address || "-"
          : est.project?.location || "-"
      ),
    },
    {
      label: "Billing Address",
      key: "billing_address",
      filterKey: "billing_address",
      renderCell: (est) => est.billing_address || est.project?.billing_address || est.quick_customer?.billing_address || est.quick_customer?.site_address || est.project?.location || "-",
    },
    {
      label: "Division Type",
      key: "type",
      filterKey: "type",
      renderFilter: () => (
        <Select
          value={columnFilters.type || "all"}
          onValueChange={(value) =>
            onColumnFilterChange(
              "type",
              value === "all" ? "" : value
            )
          }
        >
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <div className="truncate w-full pr-5 text-left">
              <SelectValue placeholder="Select Division" />
            </div>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All
            </SelectItem>

            {divisions
              .filter((division) => {
                if (division.status !== "active") return false;
                const currentUser = JSON.parse(
                  localStorage.getItem("user") || "{}"
                );
                const ownerId = currentUser.role_type === "admin"
                  ? (currentUser.id || currentUser._id)
                  : currentUser.created_by;
                return (
                  String(division.created_by) === String(ownerId)
                );
              })
              .map((division) => (
                <SelectItem
                  key={division.value}
                  value={division.value}
                >
                  {division.display_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      ),
      renderCell: (est) => getDivisionDisplayName(est.project?.project_type || est.quick_customer?.division_type, divisions),
    },
    {
      label: "Scope of Work",
      key: "scope_of_work",
      filterKey: "scope_of_work",
      renderCell: (est) => <ViewMoreText text={est.Scope_of_work} title="Scope of Work" />,
    },
    {
      label: "Attached Files",
      key: "file_attachments",
      filterable: false,
      renderCell: (est) => <FileAttachmentsCell attachments={est.file_attachments} title="Estimate Attachments" />,
    },
    {
      label: "Additional Markup",
      key: "additional_markup",
      filterKey: "additional_markup",
      hidden: user?.role_type === "Crew View",
      className: "font-semibold text-gray-900temp",
      renderCell: (est) => formatCurrency(est.material_markup_amount || 0),
    },
    {
      label: "Notes",
      key: "notes",
      filterKey: "notes",
      renderCell: (est) => <ViewMoreText text={est.notes} content={renderTextWithLinks(est.notes)} title="Notes" />,
    },
    {
      label: "Created Date",
      key: "created_date",
      filterKey: "created_date",
      renderFilter: () => (
        <CustomDatePicker
          value={columnFilters.created_date || ""}
          onChange={(date) =>
            onColumnFilterChange("created_date", date)
          }
          portalId="root"
        />
      ),
      renderCell: (est) => formatDateUTC(est.created_date || est.createdAt),
    },
    {
      label: "Amount",
      key: "total_amount",
      filterKey: "total_amount",
      hidden: user?.role_type === "Crew View",
      className: "font-semibold text-gray-900temp",
      renderCell: (est) => formatCurrency(est?.total_amount),
    },
    {
      label: "Status",
      key: "status",
      filterKey: "status",
      headerClassName: "text-center",
      className: "text-center",
      renderFilter: () => (
        <TableHeaderFilter
          placeholder="Status..."
          value={columnFilters.status || ""}
          onChange={(value) => onColumnFilterChange("status", value)}
          className="h-8 text-xs"
        />
      ),
      renderCell: (est) => (
        canUpdate && est.status !== 'approved' && est.status !== 'rejected' ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <Badge className={`${statusColors[est.status]} cursor-pointer`}>
                {est.status}
                <ChevronDown className="w-3 h-3 ml-1 inline-block" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.keys(statusColors).map((statusKey) => (
                <DropdownMenuItem key={statusKey} onClick={() => onStatusChange && onStatusChange(est, statusKey)}>
                  <span className="capitalize">{statusKey}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge className={statusColors[est.status]}>
            {est.status}
          </Badge>
        )
      ),
    },
    {
      label: "Actions",
      key: "actions",
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
    <div className="relative">
    <div className="table-listrow-divstyle">
      <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide">
        <TableHeader className="bg-gray50-temp text-gray-700temp font-medium">
          <TableRow>
            <TableHead className="px-4 py-3 w-12 text-center">
              <div className="flex flex-col items-left justify-center gap-2">
                <button
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="p-0 bg-transparent border-none hover:text-blue-600 text-gray-600temp"
                >
                  {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                </button>
                {canDelete && (<Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={onSelectAll}
                />)}
              </div>
            </TableHead>

            {visibleColumns
              .map((col) => (
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
              <TableCell></TableCell>

              {visibleColumns.map((col) => (
                <TableCell key={col.key}>
                  {DEFAULT_ESTIMATE_VISIBLE_COLUMNS.includes(col.key)
                    ? renderColumnFilter(col)
                    : null}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableHeader>

        <TableBody>
          {sortedData.length > 0 &&
            sortedData.map((est) => {
              const isSelected = selectedItems.includes(est.id);

              return (
                <TableRow
                  key={est.id}
                  className={`hover:bg-gray50-temp transition border-b ${isSelected ? "bg-blue-50 dark:bg-gray-900" : ""
                    }`}
                >
                  <TableCell className="px-4 py-3">
                    {canDelete && <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectItem(est.id, checked)}
                    />}
                  </TableCell>

                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} className={col.className || ""}>
                      {col.renderCell(est)}
                    </TableCell>
                  ))}
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
