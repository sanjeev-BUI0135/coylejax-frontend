import { useState, useEffect, useMemo, useCallback } from "react";
import { Customer } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Users, WifiOff, Download, Upload, MoreVertical } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerForm from "../components/customers/CustomerForm";
import CustomerListView from "../components/customers/CustomerListView";
import CustomerBulkUpload from "../components/customers/CustomerBulkUpload";
import Swal from "sweetalert2";
import ViewToggle from "../components/shared/ViewToggle";
import Pagination from "../components/shared/Pagination";
import BulkActions from "../components/shared/BulkActions";
import AdvancedFilters from "../components/shared/AdvanceFilters";
import localApi from "../services/localApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TablePageSkeleton from "../components/ui/tableskeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchInput, setSearchInput] = useState(() => localStorage.getItem("customerSearch") || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('customersViewMode') || 'list');
  const [showFilters, setShowFilters] = useState(() => localStorage.getItem('customersShowFilters') === 'true');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => parseInt(localStorage.getItem('customersItemsPerPage')) || 25);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("-createdAt");
  const [selectedItems, setSelectedItems] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [me, setMe] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    customerType: "all"
  });
  const [columnFilters, setColumnFilters] = useState({
    company_name: "",
    contact_name: "",
    customer_type: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: ""
  });

  const modules = user.permissions || [];
  const canView = modules.find(m => m.module === 'Customers')?.canView;
  const canAdd = modules.find(m => m.module === 'Customers')?.canAdd;
  const canUpdate = modules.find(m => m.module === 'Customers')?.canUpdate;
  const canDelete = modules.find(m => m.module === 'Customers')?.canDelete;

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sort: sortBy,
        company_name: columnFilters.company_name,
        contact_name: columnFilters.contact_name,
        customer_type: columnFilters.customer_type,
        email: columnFilters.email,
        phone: columnFilters.phone,
        address: columnFilters.address,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await Customer.list(params);
      const data = Array.isArray(response) ? response : (response?.data ?? []);

      setCustomers(data);
      setPagination({
        page: response?.page || currentPage,
        limit: response?.limit || itemsPerPage,
        total: response?.total || 0,
        pages: response?.pages || Math.ceil((response?.total || 0) / itemsPerPage)
      });
      setTotalCount(response?.total || 0);
    } catch (err) {
      console.error("Error loading customers:", err);
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, searchTerm, columnFilters]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    localStorage.setItem('customersViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('customersShowFilters', showFilters);
  }, [showFilters]);

  useEffect(() => {
    localStorage.setItem('customersItemsPerPage', itemsPerPage);
  }, [itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, columnFilters]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe()
        setMe(res)
      } catch (error) {
        console.log(error)
      }
    }
    fetchMe()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (canView) {
        loadCustomers();
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [canView, loadCustomers]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setViewMode("grid");
    }
  }, [isMobile]);

  const handleSubmit = async (customerData) => {
    try {
      let savedCustomer;
      if (editingCustomer) {
        if (!canUpdate) {
          return Swal.fire("Permission Denied", "You do not have permission to edit customers.", "error");
        }
        savedCustomer = await Customer.update(editingCustomer.id, customerData);

        if (savedCustomer) {
          const updatedCustomer = {
            ...savedCustomer,
            id: savedCustomer.id || savedCustomer._id
          };
          setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
          Swal.fire({
            icon: "success",
            title: "Updated!",
            text: "Contact updated successfully",
            timer: 1500,
            showConfirmButton: false
          });
        }
        setShowForm(false);
        setEditingCustomer(null);
      } else {
        if (!canAdd) {
          return Swal.fire("Permission Denied", "You do not have permission to add contacts.", "error");
        }
        await Customer.create(customerData);
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Contact created successfully",
          timer: 1500,
          showConfirmButton: false
        });
        setShowForm(false);
        setEditingCustomer(null);
        loadCustomers();
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error;

      if (!errorMessage) {
        // optional: don't show anything OR show minimal fallback
        return;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonColor: "#d33"
      });
    }
  };

  const handleEdit = (customer) => {
    if (!canUpdate) {
      return Swal.fire("Permission Denied", "You do not have permission to edit contacts.", "error");
    }
    setSelectedItems([]);
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = async (customer) => {
    setSelectedItems([]);
    if (!canDelete) {
      return Swal.fire("Permission Denied", "You do not have permission to delete contacts.", "error");
    }

    const result = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you really want to delete "${customer.company_name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await Customer.delete(customer.id);
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        setSelectedItems(prev => prev.filter(id => id !== customer.id));
        Swal.fire("Deleted!", "Contact has been deleted.", "success");
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete contact.", "error");
      }
    }
  };

  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const ids = displayCustomers.map(c => c.id || c._id);
      setSelectedItems(ids);
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete) {
      return Swal.fire({
        title: 'Permission Denied',
        text: 'You do not have permission to delete contacts.',
        icon: 'warning',
        confirmButtonColor: '#f0ad4e',
      });
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedItems.length} contact(s). This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Deleting...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        await Customer.bulkDelete(selectedItems);

        setCustomers(prev => prev.filter(c => !selectedItems.includes(c.id)));
        setSelectedItems([]);
        await loadCustomers();
        Swal.fire('Deleted!', 'Contacts have been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting contacts:", error);
        Swal.fire('Error', 'Failed to delete contacts.', 'error');
      }
    }
  };

  const setColumnFilter = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const displayCustomers = customers;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleExport = async () => {
    setSelectedItems([]);
    if (!canView) return alert("You do not have permission to export contacts.");

    try {
      Swal.fire({
        title: 'Preparing Export...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const params = {
        page: 1,
        limit: totalCount > 0 ? totalCount : 10000,
        sort: sortBy,
        company_name: columnFilters.company_name,
        contact_name: columnFilters.contact_name,
        customer_type: columnFilters.customer_type,
        email: columnFilters.email,
        phone: columnFilters.phone,
        address: columnFilters.address,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await Customer.list(params);
      const allCustomers = Array.isArray(response) ? response : (response?.data ?? []);

      if (allCustomers.length === 0) {
        Swal.close();
        return alert("No contacts to export.");
      }

      const headers = [
        "Company Name", "Contact Name", "Email", "Phone",
        "Address", "City", "State", "ZIP Code", "Contact Type"
      ];

      const escapeCsvField = (field) => {
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = allCustomers.map(customer => {
        const row = [
          customer.company_name,
          customer.contact_name,
          customer.email,
          customer.phone,
          customer.address,
          customer.city,
          customer.state,
          customer.zip_code,
          customer.customer_type
        ];
        return row.map(escapeCsvField).join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute("download", `CoyleJax_Contacts_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      Swal.close();
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire('Error', 'Failed to export contacts.', 'error');
    }
  };

  if (initialLoading) return <TablePageSkeleton />;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage your client relationships</p>
        </div>

        <div className="flex items-center gap-3">

          {/* Desktop Buttons */}
          {!isMobile && (
            <>
              <ViewToggle view={viewMode} onViewChange={setViewMode} />

              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!canView}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              {canAdd && (
                <Button
                  variant="outline"
                  onClick={() => { setSelectedItems([]); setShowBulkUpload(true) }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              )}

              {canAdd && (
                <Button
                  onClick={() => { setSelectedItems([]); setShowForm(true) }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Contacts
                </Button>
              )}
            </>
          )}

          {/* Mobile Dropdown */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">

                {canView && (
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                )}

                {canAdd && (
                  <DropdownMenuItem onClick={() => setShowBulkUpload(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </DropdownMenuItem>
                )}

                {canAdd && (
                  <DropdownMenuItem onClick={() => { setSelectedItems([]); setShowForm(true) }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Contacts
                  </DropdownMenuItem>
                )}

              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <CustomerForm
            customer={editingCustomer}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingCustomer(null);
            }}
          />
        )}
        {showBulkUpload && (
          <CustomerBulkUpload
            onClose={() => setShowBulkUpload(false)}
            onSuccess={loadCustomers}
          />
        )}
      </AnimatePresence>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
            <Input
              placeholder="Search contacts..."
              value={searchInput}
              onChange={(e) => { setSelectedItems([]); setSearchInput(e.target.value) }}
              className="pl-10"
            />
          </div>
          <AdvancedFilters isOpen={showFilters} onToggle={() => { setSelectedItems([]); setShowFilters(!showFilters); }}>
            <CustomerFilters filters={filters} onFilterChange={setFilters} />
          </AdvancedFilters>
        </div>
      </div>

      <BulkActions
        selectedCount={selectedItems.length}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedItems([])}
      />

      {error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg">
          <WifiOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-700">Connection Error</h3>
          <p className="text-gray-600temp mt-2">{error}</p>
          <Button onClick={loadCustomers} className="mt-6 bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
        </div>
      ) : (
            <>
              {!isMobile && viewMode === "list" ? (
                <CustomerListView
                  customers={displayCustomers}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  selectedItems={selectedItems}
                  onSelectItem={handleSelectItem}
                  onSelectAll={handleSelectAll}
                  columnFilters={columnFilters}
                  onColumnFilterChange={setColumnFilter}
                  totalFilteredCount={displayCustomers.length}
                />
              ) : (
                <>
                  {displayCustomers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                      <AnimatePresence>
                        {displayCustomers.map((customer) => (
                          <CustomerCard
                            key={customer.id}
                            customer={customer}
                            onEdit={(e) => {
                              e.preventDefault();
                              handleEdit(customer);
                            }}
                            onDelete={(e) => {
                              e.preventDefault();
                              handleDelete(customer);
                            }}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            selectedItems={selectedItems}
                            onSelectItem={handleSelectItem}
                            totalFilteredCount={totalCount}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">
                        No contacts found
                      </h3>
                      <p className="text-gray-500 mt-2">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  )}
                </>
              )}

              {totalCount > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
    </div>
  );
}

function CustomerFilters({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700temp mb-2">
          Contacts Type
        </label>
        <Select
          value={filters.customerType}
          onValueChange={(value) =>
            handleChange("customerType", value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Contacts Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}