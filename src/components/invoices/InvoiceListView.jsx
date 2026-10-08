import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Invoice } from '../../api/entities';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ChevronDown, ChevronUp, FileText, Calendar, DollarSign, Building2, Hash, Filter, X, AlertCircle } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import Pagination from '../shared/Pagination';
import BulkActions from '../shared/BulkActions';
import CustomDatePicker from "../ui/CustomDatePicker";
import TableHeaderFilter from '../shared/TableHeaderFilter';
import Swal from "sweetalert2";
import { DEFAULT_INVOICE_VISIBLE_COLUMNS, INVOICE_LIST_COLUMN_OPTIONS } from "../../config/columnConfigs.js";
import { formatCurrency } from '@/lib/utils';
import { formatDateUTC } from '../../utils/formatdate';
import ViewMoreText from "../shared/ViewMoreText";
import FileAttachmentsCell from "../shared/FileAttachmentsCell";
import { renderTextWithLinks } from "../ui/renderTextWithLinks";
import InvoiceCard from './InvoiceCard';
import StickyScrollbar from '../shared/StickyScrollbar';

const statusColors = {
  draft: 'bg-gray-200 text-gray-800temp',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  void: 'bg-red-100 text-red-800',
  overdue: 'bg-red-200 text-red-900 font-semibold',
};

export default function InvoiceListView({
  invoices,
  projects,
  onInvoiceClick,
  onEdit,
  canDelete,
  canUpdate,
  onInvoicesUpdate,
  loadData,
  viewMode,
  currentPage = 1,
  pageSize = 10,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  clientSidePagination = false,
  currentSort = "-created_date",
  onSortChange,
  selectedItems,
  setSelectedItems,
  visibleColumnKeys = DEFAULT_INVOICE_VISIBLE_COLUMNS,
}) {
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const tableContainerRef = useRef(null);
  // const [selectedItems, setSelectedItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState({
    invoice_number: '',
    project_name: '',
    company_name: '',
    customer_name: '',
    status: '',
    balance: '',
    amount_paid: '',
    total_amount: '',
    due_date: '',
    customer_po_number: '',
    project_location: '',
    scope_of_work: '',
    additional_markup: '',
    notes: '',
  });

  const getInvoiceStatus = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'void') {
      return invoice.status;
    }
    if (invoice.due_date) {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      dueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return 'overdue';
      }
    }

    return invoice.status;
  };

  const getInvoiceBalance = (invoice) => {
    return invoice.status === 'paid'
      ? 0
      : Math.max(0, (invoice.total_amount || 0) - (invoice.amount_paid || 0));
  };
  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getProjectForInvoice = (invoice) => {
    if (invoice.project && invoice.project.project_name) return invoice.project;
    if (invoice.project_id && invoice.project_id.project_name) return invoice.project_id;
    return projects.find(
      (p) =>
        p.id === invoice.project_id ||
        p._id?.toString() === invoice.project_id?.toString()
    ) || null;
  };

  const getProjectCustomer = (project) => (
    typeof project?.customer_ids?.[0] === "object" ? project.customer_ids[0] : null
  );

  const filteredData = useMemo(() => {
    return invoices.filter((invoice) => {
      const {
        invoice_number,
        project_name,
        company_name,
        customer_name,
        status,
        balance,
        amount_paid,
        total_amount,
        due_date,
        customer_po_number,
        project_location,
        scope_of_work,
        additional_markup,
        notes,
      } = columnFilters;

      const project = getProjectForInvoice(invoice);
      const customer = getProjectCustomer(project);

      const projectDisplayName = normalize(project?.project_name || "");
      const companyDisplayName = normalize(customer?.company_name || "");
      const customerDisplayName = normalize(customer?.contact_name || "");

      if (
        invoice_number &&
        !normalize(invoice.invoice_number).includes(
          normalize(invoice_number)
        )
      ) {
        return false;
      }

      if (
        project_name &&
        !projectDisplayName.includes(normalize(project_name))
      ) {
        return false;
      }

      if (
        company_name &&
        !companyDisplayName.includes(normalize(company_name))
      ) {
        return false;
      }

      if (
        customer_name &&
        !customerDisplayName.includes(normalize(customer_name))
      ) {
        return false;
      }

      if (status) {
        const displayStatus = getInvoiceStatus(invoice);

        if (
          !displayStatus
            .toLowerCase()
            .includes(status.toLowerCase())
        ) {
          return false;
        }
      }

      if (balance) {
        const invBalance = getInvoiceBalance(invoice);

        if (!invBalance.toString().includes(balance)) {
          return false;
        }
      }

      if (amount_paid) {
        if (
          !invoice.amount_paid
            ?.toString()
            .includes(amount_paid)
        ) {
          return false;
        }
      }

      if (total_amount) {
        if (
          !invoice.total_amount
            ?.toString()
            .includes(total_amount)
        ) {
          return false;
        }
      }

      if (due_date) {
        if (!invoice.due_date) return false;

        const invoiceDate = new Date(invoice.due_date)
          .toISOString()
          .split("T")[0];

        if (invoiceDate !== due_date) {
          return false;
        }
      }

      if (
        customer_po_number &&
        !invoice.customer_po_number
          ?.toLowerCase()
          .includes(customer_po_number.toLowerCase())
      ) {
        return false;
      }

      if (
        project_location &&
        !normalize(invoice.project_location || project?.location).includes(normalize(project_location))
      ) {
        return false;
      }

      if (
        scope_of_work &&
        !normalize(invoice.Scope_of_work).includes(normalize(scope_of_work))
      ) {
        return false;
      }

      if (
        additional_markup &&
        !(invoice.material_markup_amount || 0).toString().includes(additional_markup)
      ) {
        return false;
      }

      if (
        notes &&
        !normalize(invoice.notes).includes(normalize(notes))
      ) {
        return false;
      }

      return true;
    });
  }, [invoices, columnFilters, projects]);

  const externalSortConfig = useMemo(() => {
    if (clientSidePagination) return null;
    const direction = currentSort.startsWith('-') ? 'desc' : 'asc';
    const key = currentSort.replace(/^-/, '');
    return { key, direction };
  }, [currentSort, clientSidePagination]);

  const handleExternalSort = (config) => {
    if (onSortChange) {
      const prefix = config.direction === 'desc' ? '-' : '';
      onSortChange(`${prefix}${config.key}`);
    }
  };

  const customGetters = useMemo(() => {
    return {
      project_id: (invoice) => {
        const project = getProjectForInvoice(invoice);
        return project?.project_name || "";
      },
      company_name: (invoice) => {
        const project = getProjectForInvoice(invoice);
        const customer = getProjectCustomer(project);
        return customer?.company_name || "";
      },
      customer_name: (invoice) => {
        const project = getProjectForInvoice(invoice);
        const customer = getProjectCustomer(project);
        return customer?.contact_name || "";
      },
      status: (invoice) => {
        return getInvoiceStatus(invoice) || "";
      },
      balance: (invoice) => {
        return Number(getInvoiceBalance(invoice) || 0);
      },
      project_location: (invoice) => {
        const project = getProjectForInvoice(invoice);
        return invoice.project_location || project?.location || "";
      },
      scope_of_work: (invoice) => {
        return invoice.Scope_of_work || "";
      },
      additional_markup: (invoice) => {
        return Number(invoice.material_markup_amount || 0);
      },
    };
  }, [projects]);

  const { sortedData, handleSort } = useTableSort(
    filteredData,
    "",
    "asc",
    customGetters,
    null,
    null
  );

  const displayTotalCount = clientSidePagination ? filteredData.length : totalCount;

  let displayData = sortedData;
  if (clientSidePagination) {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    displayData = sortedData.slice(startIndex, endIndex);
  }

  const totalPages = Math.ceil(displayTotalCount / pageSize);

  const allSelectedOnCurrentPage = displayData.length > 0 &&
    displayData.every(invoice => selectedItems.includes(invoice.id || invoice._id));

  const hasActiveFilters = Object.values(columnFilters).some(value => value !== '');

  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  };

  const handleSelectAll = (checked) => {
    const currentPageIds = displayData.map(invoice => invoice.id || invoice._id);

    if (checked) {
      setSelectedItems(prev => {
        const newSelection = [...prev];
        currentPageIds.forEach(id => {
          if (!newSelection.includes(id)) newSelection.push(id);
        });
        return newSelection;
      });
    } else {
      setSelectedItems(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleSelectAllFiltered = (checked) => {
    if (checked) {
      const allFilteredIds = displayData.map(invoice => invoice.id || invoice._id);
      setSelectedItems(allFilteredIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
    if (onPageChange) {
      onPageChange(1);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.length) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedItems.length} invoice(s). This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete them!",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Deleting...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      //  SINGLE API CALL
      await Invoice.bulkDelete(selectedItems);

      setSelectedItems([]);

      Swal.fire({
        title: "Deleted!",
        text: `${selectedItems.length} invoice(s) deleted successfully.`,
        icon: "success",
      });

      if (loadData) {
        loadData();
      }

    } catch (error) {
      console.error("Bulk delete error:", error);

      Swal.fire({
        title: "Error",
        text: error.message || "Failed to delete invoices.",
        icon: "error",
      });
    }
  };


  const handlePageChange = (pageNumber) => {
    if (onPageChange) {
      onPageChange(pageNumber);
    }
    setExpandedInvoice(null);
  };

  const handleItemsPerPageChange = (value) => {
    if (onPageSizeChange) {
      onPageSizeChange(value);
    }
    if (onPageChange) {
      onPageChange(1);
    }
    setExpandedInvoice(null);
  };

  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const user = JSON.parse(localStorage.getItem('user'));
  const invoiceColumns = [
    {
      label: "Invoice Number",
      key: "invoice_number",
      filterKey: "invoice_number",
      renderCell: ({ invoice }) => (
        <Link
          to={canUpdate ? `/invoices/${invoice.id}` : "#"}
          onClick={(e) => {
            if (!canUpdate) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className={`text-sm font-medium ${canUpdate
            ? "text-blue-600 hover:text-blue-800"
            : "text-gray-400 cursor-not-allowed pointer-events-none"
            }`}
        >
          {invoice.invoice_number}
        </Link>
      ),
    },
    {
      label: "Project Name",
      key: "project_id",
      sortKey: "project_id",
      filterKey: "project_name",
      renderCell: ({ project }) => (
        project?._id || project?.id ? (
          <Link
            to={(project.is_inactive || project.status === 'lost' || project.status === 'completed') ? `/inactive-projects/${project._id || project.id}` : `/projects/${project._id || project.id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {project?.project_name || "Unknown Project"}
          </Link>
        ) : (
          <span>{project?.project_name || "Unknown Project"}</span>
        )
      ),
    },
    {
      label: "Company Name",
      key: "company_name",
      filterKey: "company_name",
      renderCell: ({ customer }) => (
        customer?._id || customer?.id ? (
          <Link
            to={`/customers/${customer._id || customer.id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {customer?.company_name || "-"}
          </Link>
        ) : (
          <span>{customer?.company_name || "-"}</span>
        )
      ),
    },
    {
      label: "Contact Name",
      key: "customer_name",
      filterKey: "customer_name",
      renderCell: ({ customer }) => customer?.contact_name || "-",
    },
    {
      label: "Status",
      key: "status",
      filterKey: "status",
      renderCell: ({ displayStatus }) => (
        <Badge className={statusColors[displayStatus]}>
          {displayStatus}
        </Badge>
      ),
    },
    {
      label: "Total Amount",
      key: "total_amount",
      filterKey: "total_amount",
      hidden: user?.role_type === "Crew View",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap",
      renderCell: ({ invoice }) => formatCurrency(invoice.total_amount),
    },
    {
      label: "Paid",
      key: "amount_paid",
      filterKey: "amount_paid",
      hidden: user?.role_type === "Crew View",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap font-medium",
      renderCell: ({ invoice }) => formatCurrency(invoice.amount_paid),
    },
    {
      label: "Balance",
      key: "balance",
      filterKey: "balance",
      hidden: user?.role_type === "Crew View",
      headerClassName: "text-right",
      className: "text-right whitespace-nowrap font-medium",
      renderCell: ({ balance }) => formatCurrency(balance),
    },
    {
      label: "Due Date",
      key: "due_date",
      filterKey: "due_date",
      renderFilter: () => (
        <CustomDatePicker
          value={columnFilters.due_date || ""}
          onChange={(date) => handleColumnFilterChange("due_date", date)}
          className="h-8 text-xs"
          portalId="root"
        />
      ),
      renderCell: ({ invoice }) => formatDateUTC(invoice.due_date),
    },
    {
      label: "Customer PO Number",
      key: "customer_po_number",
      filterKey: "customer_po_number",
      renderCell: ({ invoice }) => invoice.customer_po_number || "-",
    },
    {
      label: "Project Location",
      key: "project_location",
      filterKey: "project_location",
      renderCell: ({ invoice, project }) => invoice.project_location || project?.location || "-",
    },
    {
      label: "Scope of Work",
      key: "scope_of_work",
      filterKey: "scope_of_work",
      renderCell: ({ invoice }) => <ViewMoreText text={invoice.Scope_of_work} title="Scope of Work" />,
    },
    {
      label: "Attached Files",
      key: "file_attachments",
      filterable: false,
      renderCell: ({ invoice }) => <FileAttachmentsCell attachments={invoice.file_attachments} title="Invoice Attachments" />,
    },
    {
      label: "Additional Markup",
      key: "additional_markup",
      filterKey: "additional_markup",
      hidden: user?.role_type === "Crew View",
      className: "font-semibold text-gray-900temp whitespace-nowrap",
      renderCell: ({ invoice }) => formatCurrency(invoice.material_markup_amount || 0),
    },
    {
      label: "Notes",
      key: "notes",
      filterKey: "notes",
      renderCell: ({ invoice }) => <ViewMoreText text={invoice.notes} content={renderTextWithLinks(invoice.notes)} title="Notes" />,
    },
  ];

  const availableInvoiceColumns = invoiceColumns.filter((column) => !column.hidden);
  const availableInvoiceColumnsByKey = new Map(
    availableInvoiceColumns.map((column) => [column.key, column])
  );
  const visibleInvoiceColumns = visibleColumnKeys
    .map((key) => availableInvoiceColumnsByKey.get(key))
    .filter(Boolean);

  const renderColumnFilter = (column) => {
    if (column.filterable === false) return null;
    if (column.renderFilter) return column.renderFilter();

    return (
      <TableHeaderFilter
        placeholder="Search..."
        value={columnFilters[column.filterKey || column.key] || ""}
        onChange={(value) => handleColumnFilterChange(column.filterKey || column.key, value)}
      />
    );
  };

  return (
    <div className="space-y-4">
      {viewMode === 'list' && (
        <>
          <div className="relative">
          <div className="table-listrow-divstyle">
            <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide" className="border-collapse text-sm">
              <TableHeader className="bg-gray50-temp text-gray-700temp font-medium">
                <TableRow>
                  <TableHead className="px-4 py-3 w-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={() => setShowFilters((prev) => !prev)}
                        className="p-0 bg-transparent border-none hover:text-blue-600 text-gray-600temp"
                        title={showFilters ? "Hide Filters" : "Show Filters"}
                      >
                        {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                      </button>
                      {(canDelete || canUpdate) && <input
                        type="checkbox"
                        checked={allSelectedOnCurrentPage}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />}
                    </div>
                  </TableHead>
                  {visibleInvoiceColumns.map((column) => (
                    <TableHead
                      key={column.key}
                      onClick={() => column.sortable === false ? undefined : handleSort(column.sortKey || column.key)}
                      className={`px-4 py-3 text-left select-none ${column.sortable === false ? "" : "cursor-pointer"} ${column.headerClassName || ""}`}
                    >
                      <div className={`flex items-center gap-1 ${column.headerClassName === "text-right" ? "justify-end" : ""}`}>
                        <span>{column.label}</span>
                        {column.sortable !== false && <ArrowUpDown className="w-4 h-4 text-gray-400temp" />}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>

                {showFilters && (
                  <TableRow className="bg-white border-t dark:bg-gray-900">
                    <TableHead className="px-4 py-2"></TableHead>
                    {visibleInvoiceColumns.map((column) => (
                      <TableCell key={column.key}>
                        {DEFAULT_INVOICE_VISIBLE_COLUMNS.includes(column.key)
                          ? renderColumnFilter(column)
                          : null}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200 dark:bg-gray-800">
                {displayData.length === 0 ? (
                  <TableRow>
                    {/* <TableCell colSpan={8} className="px-4 py-8 text-center text-gray-500temp">
                        {hasActiveFilters ? "No invoices match your filters" : "No invoices found"}
                      </TableCell> */}
                  </TableRow>
                ) : (
                  displayData.map((invoice) => {
                    const project = getProjectForInvoice(invoice);
                    const customer = getProjectCustomer(project);
                    const balance = getInvoiceBalance(invoice);
                    const invoiceId = invoice.id || invoice._id;
                    const isSelected = selectedItems.includes(invoiceId);
                    const displayStatus = getInvoiceStatus(invoice);

                    return (
                      <TableRow
                        key={invoiceId}
                        className={`hover:bg-gray50-temp cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-gray-900' : ''}`}
                      >
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          {(canDelete || canUpdate) && <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectItem(invoiceId, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />}
                        </TableCell>
                        {visibleInvoiceColumns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={`px-4 py-3 text-sm ${column.className || ""}`}
                          >
                            {column.renderCell({ invoice, project, customer, balance, displayStatus })}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <StickyScrollbar tableContainerRef={tableContainerRef} />
          </div>
        </>
      )}

      {viewMode === 'grid' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {displayData.map((invoice) => {
              const project = getProjectForInvoice(invoice);
              const invoiceId = invoice.id || invoice._id;
              const isSelected = selectedItems.includes(invoiceId);

              return (
                <div key={invoiceId} className="relative">
                  {canDelete && (
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectItem(invoiceId, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}
                  <InvoiceCard invoice={invoice} project={project} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedItems.length > 0 && canDelete && (
        <BulkActions
          selectedCount={selectedItems.length}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedItems([])}
          onSelectAll={() => handleSelectAllFiltered(true)}
          totalItems={displayTotalCount}
        />
      )}

      {displayTotalCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={displayTotalCount}
          itemsPerPage={pageSize}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}
