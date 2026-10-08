import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { InventoryItem } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Package, Upload, Download, AlertTriangle, Filter, ArrowUpDown, MoreVertical } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import InventoryItemForm from '../components/inventory/InventoryItemForm';
import BulkInventoryUpload from '../components/inventory/BulkInventoryUpload';
import InventoryListView from '../components/inventory/inventoryListView';
import Swal from 'sweetalert2';
import masterDataService from '../services/masterDataService';
import ViewToggle from "../components/shared/ViewToggle";
import Pagination from "../components/shared/Pagination";
import TablePageSkeleton from '../components/ui/tableskeleton';
import useDebounce from '../hooks/useDebounce';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const categoryColors = {
  materials: "bg-blue-100 text-blue-800",
  equipment: "bg-green-100 text-green-800",
  tools: "bg-purple-100 text-purple-800",
  supplies: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800temp"
};

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem("inventorySearchTerm") || "");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("inventoryFilters");
    return saved
      ? JSON.parse(saved)
      : { category: "all", location: "all", lowStock: false };
  });
  const [sortBy, setSortBy] = useState(() => localStorage.getItem("inventorySortBy") || "item_name");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('inventoryViewMode') || 'list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => parseInt(localStorage.getItem('inventoryItemsPerPage')) || 25);
  const [totalCount, setTotalCount] = useState(0);
  const [fullGeneralItems, setFullGeneralItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const modules = user.permissions || [];
  const InventoryTabPermission = modules.find(
    p =>
      p.module?.toLowerCase() === "projects" &&
      p.submenu_module?.toLowerCase() === "inventory"
  );
  const canAdd = InventoryTabPermission?.canAdd ?? false;
  const canUpdate = InventoryTabPermission?.canUpdate ?? false;
  const canDelete = InventoryTabPermission?.canDelete ?? false;
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);



  useEffect(() => {
    localStorage.setItem('inventoryViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('inventoryItemsPerPage', itemsPerPage);
  }, [itemsPerPage]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
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

  const isFiltered = useMemo(() => {
    return (
      debouncedSearchTerm !== "" ||
      filters.category !== "all" ||
      filters.location !== "all" ||
      filters.lowStock
    );
  }, [debouncedSearchTerm, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [isFiltered, filters.category, filters.location, filters.lowStock, debouncedSearchTerm]);

  useEffect(() => {
    if (!isFiltered) {
      loadInventory();
    }
  }, [currentPage, itemsPerPage, sortBy, isFiltered, filters.category, filters.location, filters.lowStock, debouncedSearchTerm]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const catRes = await masterDataService.getAll("categories");
        const locRes = await masterDataService.getAll("locations");

        const activeCategories = (catRes.data || [])
          .filter(item => item.status === "active" && (item.created_by === user.id || item.created_by === user.created_by))
          .sort((a, b) => b.sort_order - a.sort_order);

        const activeLocations = (locRes.data || [])
          .filter(item => item.status === "active" && (item.created_by === user.id || item.created_by === user.created_by))
          .sort((a, b) => b.sort_order - a.sort_order);

        setCategories(activeCategories);
        setLocations(activeLocations);
      } catch (err) {
        console.error("Failed to load categories/locations:", err);
      }
    };

    loadMasterData();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const probeResp = await InventoryItem.list({ limit: 1 });
      const totalCountOnServer = probeResp?.total || 0;

      const allResp = await InventoryItem.list({ limit: totalCountOnServer || 1 });
      const allData = Array.isArray(allResp) ? allResp : (allResp?.data ?? []);
      const generalItems = allData.filter(item => !item.project_id);

      const strictUserInventory = generalItems.filter(item => item.created_by === user.id || item.created_by === user.created_by);
      setFullGeneralItems(strictUserInventory);
    } catch (err) {
      console.error("Failed to load inventory stats:", err);
    }
  };

  const loadInventory = async () => {
    if (isFiltered) return;

    setLoading(true);
    try {
      const params = {
        page: Number(currentPage),
        limit: Number(itemsPerPage),
        sort: sortBy
      };

      const itemsResp = await InventoryItem.list(params);
      const itemsData = Array.isArray(itemsResp) ? itemsResp : (itemsResp?.data ?? []);

      const generalItems = itemsData.filter(item => !item.project_id);

      setInventoryItems(generalItems);
      setTotalCount(itemsResp?.total || itemsResp?.length || 0);
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const isValidUrl = (value) => {
    if (!value) return false;
    const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    return pattern.test(value.trim());
  };

  const handleSubmit = async (itemData, updateId = null) => {
    try {
      const idToUpdate = editingItem?._id || editingItem?.id || updateId || null;
      if (idToUpdate) {
        const existingItem = currentItems.find(i => i.id === idToUpdate || i._id === idToUpdate);

        if (!existingItem) {
          throw new Error("Editing item not found in inventory list");
        }

        if (itemData?.unit_cost !== undefined) {
          const newUnitCost = parseFloat(itemData.unit_cost);
          const existingUnitCost = parseFloat(existingItem.unit_cost);

          if (!isNaN(newUnitCost) && newUnitCost !== existingUnitCost) {
            itemData.previous_unit_cost = existingUnitCost;
          } else if (existingItem.previous_unit_cost !== undefined) {
            itemData.previous_unit_cost = existingItem.previous_unit_cost;
          }
        }
        await InventoryItem.update(idToUpdate, itemData);
      } else {
        const newItemData = { ...itemData, project_id: null };
        delete newItemData.previous_unit_cost;
        await InventoryItem.create(newItemData);
      }

      setShowForm(false);
      setEditingItem(null);

      Swal.fire({
        title: 'Success',
        text: idToUpdate ? 'Item updated successfully' : 'Item added successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      await loadInventory();
      await loadStats();

    } catch (error) {
      console.error("Error saving inventory item:", error);
      Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to save inventory item. Please try again.',
        icon: 'error'
      });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (itemId) => {
    setSelectedItems([]);
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to delete this inventory item?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await InventoryItem.delete(itemId);
        Swal.fire("Deleted!", "Inventory item has been deleted.", "success");
        if (!isFiltered) {
          await loadInventory();
        }
        await loadStats();
      } catch (error) {
        console.error("Error deleting inventory item:", error);
        Swal.fire("Error!", "Something went wrong while deleting.", "error");
      }
    }
  };

  const handleBulkUploadSuccess = async () => {
    setShowBulkUpload(false);
    if (!isFiltered) {
      await loadInventory();
    }
    await loadStats();
  };

  const handleExport = async () => {
    setSelectedItems([]);

    try {
      // 1. Total count eduthuko
      const probeResp = await InventoryItem.list({ limit: 1 });
      const totalCount = probeResp?.total || 0;

      // 2. Full data fetch pannunga
      const allResp = await InventoryItem.list({ limit: totalCount || 1 });
      const allData = Array.isArray(allResp) ? allResp : (allResp?.data ?? []);

      // 3. General items filter (same as your logic)
      const generalItems = allData.filter(item => !item.project_id);

      // 4. User-based filter (same logic)
      const exportSource = generalItems.filter(
        item => item.created_by === user.id || item.created_by === user.created_by
      );

      // 5. Apply same filters (optional but recommended for consistency)
      const finalData = exportSource.filter(item => {
        const matchesSearch = !debouncedSearchTerm ||
          item.item_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          item.supplier?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

        const matchesCategory = filters.category === "all" || item.category === filters.category;
        const matchesLocation = filters.location === "all" || item.location === filters.location;
        const matchesLowStock = !filters.lowStock || (item.quantity <= (item.reorder_level || 0));

        return matchesSearch && matchesCategory && matchesLocation && matchesLowStock;
      });

      if (finalData.length === 0) {
        alert("No inventory items to export.");
        return;
      }

      // 6. CSV create (same as your code)
      const headers = [
        "item_name", "description", "category", "quantity", "unit",
        "unit_cost", "previous_unit_cost", "total_value",
        "location", "supplier", "reorder_level", "low_stock_alert",
        "received_date", "notes"
      ];

      const escapeCsvField = (field) => {
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = finalData.map(item => {
        const totalValue = (item.quantity || 0) * (item.unit_cost || 0);
        const isLowStock = (item.quantity || 0) <= (item.reorder_level || 0);

        const row = [
          item.item_name || '',

          item.description || '',

          item.category || '',

          item.quantity || 0,

          item.unit || '',

          `$${Number(item.unit_cost || 0).toFixed(2)}`,

          item.previous_unit_cost !== undefined &&
            item.previous_unit_cost !== null &&
            item.previous_unit_cost !== ''
            ? `$${Number(item.previous_unit_cost).toFixed(2)}`
            : '',

          `$${Number(totalValue || 0).toFixed(2)}`,

          item.location || '',

          item.supplier || '',

          item.reorder_level || 0,

          isLowStock ? 'Yes' : 'No',

          item.received_date
            ? new Date(item.received_date).toLocaleDateString()
            : '',

          item.notes || ''
        ];

        return row.map(escapeCsvField).join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().slice(0, 10);

      link.setAttribute("href", url);
      link.setAttribute("download", `CoyleJax_Inventory_${today}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export inventory.");
    }
  };

  const currentItems = isFiltered ? fullGeneralItems : inventoryItems;

  const filteredAndSortedItems = useMemo(() => {
    const filtered = currentItems.filter(item => {
      const matchesSearch = !debouncedSearchTerm ||
        (item.item_name && item.item_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (item.supplier && item.supplier.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const matchesCategory = filters.category === "all" || item.category === filters.category;
      const matchesLocation = filters.location === "all" || item.location === filters.location;
      const matchesLowStock = !filters.lowStock || (item.quantity <= (item.reorder_level || 0));
      return matchesSearch && matchesCategory && matchesLocation && matchesLowStock;
    });

    // Client-side Sorting
    if (isFiltered) {
      return [...filtered].sort((a, b) => {
        const field = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;
        const multiplier = sortBy.startsWith('-') ? -1 : 1;

        const valA = a[field] ?? '';
        const valB = b[field] ?? '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * multiplier;
        }
        return String(valA).localeCompare(String(valB)) * multiplier;
      });
    }

    return filtered;
  }, [currentItems, debouncedSearchTerm, filters, sortBy, isFiltered]);

  const displayTotalCount = isFiltered ? filteredAndSortedItems.length : totalCount;

  const displayItems = useMemo(() => {
    if (isFiltered) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
    }
    return filteredAndSortedItems;
  }, [filteredAndSortedItems, isFiltered, currentPage, itemsPerPage]);

  const summaryStats = useMemo(() => {
    const source = fullGeneralItems;
    return {
      totalItems: source.length,
      lowStock: source.filter(item => item.quantity <= (item.reorder_level || 0)).length,
      locations: [...new Set(source.map(item => item.location).filter(Boolean))].length,
      totalValue: source.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0)
    };
  }, [fullGeneralItems]);

  const uniqueLocations = [...new Set(fullGeneralItems.map(item => item.location).filter(Boolean))];
  const uniqueLocationOptions = uniqueLocations.map(loc => {
    const match = locations.find(l => l.value === loc);
    return {
      value: loc,
      display_name: match?.display_name || loc
    };
  });

  if (initialLoading) return <TablePageSkeleton />;


  return (
    <div className="<div>" >
      <div className="mb-8">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900temp">Inventory Management</h1>
            <p className="text-gray-600temp mt-1">Manage your general inventory stock</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">

            {/* Desktop Buttons */}
            {!isMobile && (
              <>
                <ViewToggle view={viewMode} onViewChange={setViewMode} />

                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedItems([]); setShowFilters(!showFilters); }}
                >
                  <Filter className="w-4 h-4" />
                </Button>

                {canUpdate && (
                  <Button variant="outline" onClick={handleExport}>
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
                    onClick={() => {
                      setSelectedItems([]);
                      setEditingItem(null);
                      setShowForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
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

                  <DropdownMenuItem onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </DropdownMenuItem>

                  {canUpdate && (
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
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingItem(null);
                        setShowForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </DropdownMenuItem>
                  )}

                </DropdownMenuContent>
              </DropdownMenu>
            )}

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600temp">Total Items</p>
                <p className="text-xl font-bold">{summaryStats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600temp">Low Stock Alert</p>
                <p className="text-xl font-bold text-orange-600">
                  {summaryStats.lowStock}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600temp">Locations</p>
                <p className="text-xl font-bold">
                  {summaryStats.locations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          {user?.role_type !== "Crew View" && (<CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600temp">Total Value</p>
                <p className="text-xl font-bold">
                  {formatCurrency(summaryStats.totalValue)}
                </p>
              </div>
            </div>
          </CardContent>)}
        </Card>
      </div>

      <AnimatePresence>
        {showForm && (
          <InventoryItemForm
            item={editingItem}
            inventoryItems={inventoryItems}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkUpload && (
          <BulkInventoryUpload
            onSuccess={handleBulkUploadSuccess}
            onCancel={() => setShowBulkUpload(false)}
          />
        )}
      </AnimatePresence>

      {showFilters && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => { setSelectedItems([]); setSearchTerm(e.target.value) }}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) => { setSelectedItems([]); setFilters(prev => ({ ...prev, category: value })) }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.value || cat.id} value={cat.value}>
                        {cat.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Select value={filters.location} onValueChange={(value) => { setSelectedItems([]); setFilters(prev => ({ ...prev, location: value })) }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocationOptions.map(loc => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500temp" />
                <Select value={sortBy} onValueChange={(value) => { setSelectedItems([]); setSortBy(value); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item_name">Item Name</SelectItem>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="value">Total Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant={filters.lowStock ? "default" : "outline"}
                onClick={() => { setSelectedItems([]); setFilters(prev => ({ ...prev, lowStock: !prev.lowStock })); }}
                className={filters.lowStock ? "bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white dark:border-orange-600" : "dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Low Stock Only
              </Button>
            </div>
          </div>
        </div>
      )
      }

      < InventoryListView
        items={displayItems}
        categories={categories}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        locations={locations}
        onEdit={handleEdit}
        loadInventory={loadInventory}
        onDelete={handleDelete}
        canUpdate={canUpdate}
        canDelete={canDelete}
        viewMode={isMobile ? "grid" : viewMode}
        loadStats={loadStats}
      />

      {
        filteredAndSortedItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900temp">No inventory items found</h3>
            <p className="text-gray-500temp mt-2">
              {debouncedSearchTerm || filters.category !== "all" || filters.location !== "all" || filters.lowStock
                ? "Try adjusting your filters or search"
                : "Get started by adding your first inventory item"
              }
            </p>
            {!debouncedSearchTerm && filters.category === "all" && filters.location === "all" && !filters.lowStock && canAdd && (
              <Button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>
        )
      }
      {displayTotalCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(displayTotalCount / itemsPerPage)}
          totalItems={displayTotalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
        />
      )}
    </div >
  );
}