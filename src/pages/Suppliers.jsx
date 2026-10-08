import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Supplier } from "../api/entities";
import { Search, Plus, WifiOff, Download, Upload, Package, MoreVertical } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import SupplierCard from "../components/Suppliers/SupplierCard";
import SupplierForm from "../components/Suppliers/SupplierForm";
import SupplierListView from "../components/Suppliers/SupplierListView";
import BulkUploadModal from "../components/Suppliers/BulkUploadModal";
import Swal from "sweetalert2";
import ViewToggle from "../components/shared/ViewToggle";
import Pagination from "../components/shared/Pagination";
import BulkActions from "../components/shared/BulkActions";
import { toast } from "react-hot-toast";
import TablePageSkeleton from "../components/ui/tableskeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";


export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchInput, setSearchInput] = useState(() => localStorage.getItem("supplierSearch") || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('suppliersViewMode') || 'list');
  const [showFilters, setShowFilters] = useState(() => localStorage.getItem('suppliersShowFilters') === 'true');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => parseInt(localStorage.getItem('suppliersItemsPerPage')) || 25);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("-createdAt");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [columnFilters, setColumnFilters] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: ""
  });

  const modules = user.permissions || [];
  const canView = modules.find(m => m.module === 'Suppliers')?.canView ?? true;
  const canAdd = modules.find(m => m.module === 'Suppliers')?.canAdd ?? true;
  const canUpdate = modules.find(m => m.module === 'Suppliers')?.canUpdate ?? true;
  const canDelete = modules.find(m => m.module === 'Suppliers')?.canDelete ?? true;

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    localStorage.setItem("supplierSearch", searchInput);
  }, [searchInput]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sort: sortBy,
        company_name: columnFilters.company_name,
        contact_name: columnFilters.contact_name,
        email: columnFilters.email,
        phone: columnFilters.phone,
        address: columnFilters.address,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await Supplier.list(params);
      const data = Array.isArray(response) ? response : (response?.data ?? []);

      setSuppliers(data);
      setTotalCount(response?.total || 0);
    } catch (err) {
      console.error("Error loading suppliers:", err);
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, searchTerm, columnFilters]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (canView) {
        loadSuppliers();
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [canView, loadSuppliers]);

  useEffect(() => {
    localStorage.setItem('suppliersViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('suppliersShowFilters', showFilters);
  }, [showFilters]);

  useEffect(() => {
    localStorage.setItem('suppliersItemsPerPage', itemsPerPage);
  }, [itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, columnFilters]);

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

  const handleSubmit = async (supplierData) => {
    try {
      if (editingSupplier) {
        if (!canUpdate) {
          return Swal.fire("Permission Denied", "You do not have permission to edit suppliers.", "error");
        }
        await Supplier.update(editingSupplier._id, supplierData);
        Swal.fire("Success!", "Supplier updated successfully.", "success");
      } else {
        if (!canAdd) {
          return Swal.fire("Permission Denied", "You do not have permission to add suppliers.", "error");
        }
        await Supplier.create(supplierData);
        Swal.fire("Success!", "Supplier added successfully.", "success");
      }
      setShowForm(false);
      setEditingSupplier(null);
      loadSuppliers();
    } catch (err) {
      console.error("Error saving supplier:", err);
      Swal.fire("Error", "Failed to save supplier.", "error");
    }
  };

  const handleEdit = (supplier) => {
    setSelectedItems([]);
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async (supplier) => {
    setSelectedItems([]);
    const result = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you really want to delete "${supplier.company_name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await Supplier.delete(supplier._id);
        setSuppliers(prev => prev.filter(s => s._id !== supplier._id));
        setSelectedItems(prev => prev.filter(id => id !== supplier._id));
        Swal.fire("Deleted!", "Supplier has been deleted.", "success");
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete supplier.", "error");
      }
    }
  };

  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedItems(checked ? displaySuppliers.map(s => s._id) : []);
  };

  const handleBulkDelete = async () => {

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedItems.length} supplier(s). This action cannot be undone.`,
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

        await Supplier.bulkDelete(selectedItems);

        setSuppliers(prev => prev.filter(s => !selectedItems.includes(s._id)));
        setSelectedItems([]);
        Swal.fire('Deleted!', 'Suppliers have been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting suppliers:", error);
        Swal.fire('Error', 'Failed to delete suppliers.', 'error');
      }
    }
  };

  const handleBulkUpload = async (file) => {
    try {
      Swal.fire({
        title: 'Uploading...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const result = await Supplier.bulkUpload(file);

      if (result.errors && result.errors.length > 0) {
        const errorDetails = result.errors.map(err =>
          `Line ${err.line}: ${err.error}`
        ).join('\n');

        await Swal.fire({
          title: 'Upload Completed with Errors',
          html: `
          <p class="text-green-600">${result.count} suppliers uploaded successfully.</p>
          <p class="text-red-600 font-semibold mt-2">${result.errors.length} errors encountered:</p>
          <div class="text-left mt-2 p-3 bg-red-50 rounded max-h-48 overflow-y-auto">
            <pre class="text-sm">${errorDetails}</pre>
            ${result.errors.length > 5 ? '<p class="text-sm mt-2">...and more</p>' : ''}
          </div>
        `,
          icon: 'warning',
          confirmButtonColor: '#3085d6'
        });
      } else {
        Swal.fire(
          'Success!',
          `${result.count} suppliers uploaded successfully.`,
          'success'
        );
      }

      setShowBulkUpload(false);
      loadSuppliers();

    } catch (error) {
      console.error("Error uploading suppliers:", error);

      Swal.fire({
        title: 'Upload Failed',
        text: error.message || 'Failed to upload suppliers.',
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  const setColumnFilter = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };


  const displaySuppliers = suppliers;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleExport = async () => {
    setSelectedItems([]);
    if (!canView) {
      toast.error("You do not have permission to export suppliers.");
      return;
    }

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
        email: columnFilters.email,
        phone: columnFilters.phone,
        address: columnFilters.address,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await Supplier.list(params);
      const allSuppliers = Array.isArray(response) ? response : (response?.data ?? []);

      if (allSuppliers.length === 0) {
        Swal.close();
        toast.error("No suppliers to export.");
        return;
      }

      const headers = ["Company Name", "Contact Name", "Email", "Phone", "Address"];

      const escapeCsvField = (field) => {
        const str = String(field || "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = allSuppliers.map(s => {
        return [
          s.company_name,
          s.contact_name,
          s.email,
          s.phone,
          s.address
        ].map(escapeCsvField).join(",");
      });

      const csvContent = [headers.join(","), ...csvRows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `Suppliers_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      Swal.close();
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire('Error', 'Failed to export suppliers.', 'error');
    }
  };

  if (initialLoading) return <TablePageSkeleton />;

  return (
    <div>
      <div className="mb-8 flex justify-between items-center  gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900temp">Suppliers</h1>
          <p className="text-gray-600temp mt-1">Manage your supplier relationships</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop Buttons */}
          {!isMobile && (
            <>
              <ViewToggle view={viewMode} onViewChange={setViewMode} />

              {canView && (
                <Button
                  variant="outline"
                  onClick={handleExport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}

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
                  New Supplier
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
                  <DropdownMenuItem onClick={() => { setSelectedItems([]); setShowBulkUpload(true) }}>
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </DropdownMenuItem>
                )}

                {canAdd && (
                  <DropdownMenuItem onClick={() => { setSelectedItems([]); setShowForm(true) }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Supplier
                  </DropdownMenuItem>
                )}

              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <SupplierForm
            supplier={editingSupplier}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingSupplier(null);
            }}
          />
        )}
        {showBulkUpload && (
          <BulkUploadModal
            onUpload={handleBulkUpload}
            onCancel={() => setShowBulkUpload(false)}
            templateHeaders={["company_name", "contact_name", "email", "phone", "address"]}
          />
        )}
      </AnimatePresence>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
            <Input
              placeholder="Search suppliers..."
              value={searchInput}
              onChange={(e) => { setSelectedItems([]); setSearchInput(e.target.value) }}
              className="pl-10"
            />
          </div>
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
          <Button onClick={loadSuppliers} className="mt-6 bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {viewMode === "list" ? (
            <SupplierListView
              suppliers={displaySuppliers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canUpdate={canUpdate}
              canDelete={canDelete}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              columnFilters={columnFilters}
              onColumnFilterChange={setColumnFilter}
              totalFilteredCount={totalCount}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {displaySuppliers.map((supplier) => (
                  <SupplierCard
                    key={supplier._id}
                    supplier={supplier}
                    onEdit={(e) => {
                      e.preventDefault();
                      handleEdit(supplier);
                    }}
                    onDelete={(e) => {
                      e.preventDefault();
                      handleDelete(supplier);
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