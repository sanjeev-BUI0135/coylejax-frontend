import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package, Edit, Trash, AlertTriangle, Filter, X, ArrowUp, ArrowDown, FileText, ArrowUpDown, ChevronDown, ChevronUp
} from 'lucide-react';
import TooltipModal from '../inventory/TooltipModal';
import { useTableSort } from "@/hooks/useTableSort";
import Pagination from '../shared/Pagination';
import BulkActions from '../shared/BulkActions';
import Swal from "sweetalert2";
import TableHeaderFilter from '../shared/TableHeaderFilter';
import StickyScrollbar from '../shared/StickyScrollbar';

const categoryColors = {
  materials: "bg-blue-100 text-blue-800",
  equipment: "bg-green-100 text-green-800",
  tools: "bg-purple-100 text-purple-800",
  supplies: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800temp"
};

export default function InventoryListView({
  items = [],
  categories = [],
  locations = [],
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  selectedItems,
  setSelectedItems,
  onItemsUpdate,
  loadData,
  viewMode,
  loadInventory,
  clientSidePagination = false,
  totalItems = 0,
  currentPage: externalPage = 1,
  itemsPerPage: externalItemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  currentSort = "item_name",
  onSortChange,
  loadStats,
  loading
}) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalItemsPerPage, setInternalItemsPerPage] = useState(10);
  const tableContainerRef = useRef(null);

  const currentPage = clientSidePagination ? internalPage : externalPage;
  const itemsPerPage = clientSidePagination ? internalItemsPerPage : externalItemsPerPage;

  const handlePageChangeWrapper = (page) => {
    if (clientSidePagination) {
      setInternalPage(page);
    } else if (onPageChange) {
      onPageChange(page);
    }
  };

  const handleItemsPerPageChangeWrapper = (size) => {
    if (clientSidePagination) {
      setInternalItemsPerPage(size);
      setInternalPage(1);
    } else if (onItemsPerPageChange) {
      onItemsPerPageChange(size);
    }
  };
  const [expandedItem, setExpandedItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState({
    item_name: '',
    category: '',
    location: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    reorder_level: ''
  });

  // Determine sort config based on mode
  const externalSortConfig = useMemo(() => {
    if (clientSidePagination) return null;
    const sortString = currentSort || "item_name";
    const direction = sortString.startsWith('-') ? 'desc' : 'asc';
    const key = sortString.replace(/^-/, '');
    return { key, direction };
  }, [currentSort, clientSidePagination]);

  const handleExternalSort = (config) => {
    if (onSortChange) {
      const prefix = config.direction === 'desc' ? '-' : '';
      onSortChange(`${prefix}${config.key}`);
    }
  };

  const { sortedData, handleSort } = useTableSort(
    items,
    "",
    "asc",
    externalSortConfig,
    clientSidePagination ? null : handleExternalSort
  );
  const filteredData = sortedData.filter(item => {
    const matchesFilter = (itemValue, filterValue) => {
      if (!filterValue) return true;
      return String(itemValue || "").toLowerCase().includes(filterValue.toLowerCase());
    };

    const matchesNumericFilter = (itemValue, filterValue) => {
      if (!filterValue) return true;
      return String(itemValue || "").includes(filterValue);
    };

    return (
      matchesFilter(item.item_name, columnFilters.item_name) &&
      matchesFilter(item.category, columnFilters.category) &&
      matchesFilter(item.location, columnFilters.location) &&
      matchesFilter(item.supplier, columnFilters.supplier) &&
      matchesNumericFilter(item.quantity, columnFilters.quantity) &&
      matchesNumericFilter(item.unit_cost, columnFilters.unit_cost) &&
      matchesNumericFilter(item.reorder_level, columnFilters.reorder_level)
    );
  });

  // Pagination

  const totalCount = clientSidePagination ? filteredData.length : totalItems;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const displayData = useMemo(() => {
    if (clientSidePagination) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }
    return filteredData;
  }, [filteredData, clientSidePagination, currentPage, itemsPerPage]);

  const allSelectedOnCurrentPage = displayData.length > 0 &&
    displayData.every(item => selectedItems.includes(item.id || item._id));

  const allSelectedInFiltered = filteredData.length > 0 &&
    selectedItems.length === filteredData.length;

  const hasActiveFilters = Object.values(columnFilters).some(value => value !== '');

  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  };

  const handleSelectAll = (checked) => {
    const currentPageIds = displayData.map(item => item.id || item._id);

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
      const allFilteredIds = filteredData.map(item => item.id || item._id);
      setSelectedItems(allFilteredIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
    if (clientSidePagination) setInternalPage(1);
    else if (onPageChange) onPageChange(1);

    if (loadStats) loadStats();
  };

  const handleBulkDelete = async () => {
    if (!canDelete) {
      Swal.fire({
        title: "Permission Denied",
        text: "You do not have permission to delete inventory items.",
        icon: "warning",
      });
      return;
    }

    if (selectedItems.length === 0) {
      Swal.fire({
        title: "No Selection",
        text: "Please select at least one item to delete.",
        icon: "warning",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedItems.length} item(s). This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete them!",
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Deleting...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/inventoryitems/bulk`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ ids: selectedItems }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bulk delete failed");
      }

      setSelectedItems([]);

      Swal.fire({
        title: "Deleted!",
        text: `${data.deleted} item(s) deleted successfully.`,
        icon: "success",
      });

      if (loadInventory) await loadInventory();
      if (loadStats) await loadStats();

    } catch (error) {
      console.error("Bulk delete error:", error);
      Swal.fire({
        title: "Error",
        text: error.message || "Failed to delete items.",
        icon: "error",
      });
    }
  };


  const handlePageChange = (pageNumber) => {
    handlePageChangeWrapper(pageNumber);
    setExpandedItem(null);
  };

  const handleItemsPerPageChange = (value) => {
    handleItemsPerPageChangeWrapper(value);
    setExpandedItem(null);
  };

  const toggleItemExpand = (itemId) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const isValidUrl = (value) => {
    if (!value) return false;
    const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    return pattern.test(value.trim());
  };

  const getUnitCostChangeIndicator = (item) => {
    if (!item.previous_unit_cost || isNaN(parseFloat(item.previous_unit_cost))) return null;

    const currentCost = parseFloat(item.unit_cost) || 0;
    const previousCost = parseFloat(item.previous_unit_cost) || 0;

    if (previousCost > 0 && currentCost !== previousCost) {
      return currentCost > previousCost ? 'increase' : 'decrease';
    }
    return null;
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const getCategoryName = (value) => {
    if (!value) return "Uncategorized";
    const cat = categories.find(c => c.value === value);
    return cat?.display_name || value;
  };

  const getLocationName = (value) => {
    if (!value) return "No Location";
    const loc = locations.find(l => l.value === value);
    return loc?.display_name || value;
  };

  const getCategoryColor = (value) => {
    const name = getCategoryName(value)?.toLowerCase() || "";
    if (name.includes("material")) return "bg-blue-100 text-blue-800";
    if (name.includes("equipment")) return "bg-green-100 text-green-800";
    if (name.includes("tool")) return "bg-purple-100 text-purple-800";
    if (name.includes("suppl")) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800temp";
  };

  return (
    <div className="space-y-4 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center min-h-[200px] rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="border bg-white dark:bg-gray-900 dark:border-gray-700 rounded-lg shadow relative">
            <div className="overflow-x-auto scrollbar-hide" ref={tableContainerRef}>
              <table className="w-full">
                <thead className="bg-gray50-temp border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500temp w-12">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={() => setShowFilters((prev) => !prev)}
                          className="p-0 bg-transparent border-none hover:text-blue-600 text-gray-600temp"
                          title={showFilters ? "Hide Filters" : "Show Filters"}
                        >
                          {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                        </button>
                        {canDelete && <input
                          type="checkbox"
                          checked={allSelectedOnCurrentPage}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500temp">
                      Image
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500temp cursor-pointer"
                      onClick={() => handleSort("item_name")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Item Name</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500temp cursor-pointer"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Category</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500temp cursor-pointer"
                      onClick={() => handleSort("location")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Location</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500temp cursor-pointer"
                      onClick={() => handleSort("quantity")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Quantity</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500temp">
                      Unit
                    </th>
                    {user?.role_type !== "Crew View" && (<th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500temp cursor-pointer"
                      onClick={() => handleSort("unit_cost")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Cost </span>
                        <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
                      </div>
                    </th>)}
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500temp">
                      Supplier
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500temp cursor-pointer"
                      onClick={() => handleSort("reorder_level")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Reorder Level</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500temp">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500temp">
                      Actions
                    </th>
                  </tr>

                  {showFilters && (
                    <tr className="bg-white border-t dark:bg-gray-900">
                      <th></th>
                      <th></th>
                      <th className="px-4 py-2">
                        <TableHeaderFilter
                          placeholder="Search..."
                          value={columnFilters.item_name}
                          onChange={(value) => handleColumnFilterChange("item_name", value)}
                        />
                      </th>
                      <th className="px-4 py-2">
                        <TableHeaderFilter
                          placeholder="Search..."
                          value={columnFilters.category}
                          onChange={(value) => handleColumnFilterChange("category", value)}
                        />
                      </th>
                      <th className="px-4 py-2">
                        <TableHeaderFilter
                          placeholder="Search..."
                          value={columnFilters.location}
                          onChange={(value) => handleColumnFilterChange("location", value)}
                        />
                      </th>
                      <th className="px-4 py-2">
                        <TableHeaderFilter
                          placeholder="Search..."
                          value={columnFilters.quantity}
                          onChange={(value) => handleColumnFilterChange("quantity", value)}
                        />
                      </th>
                      <th></th>
                      <th className="px-4 py-2">
                        <TableHeaderFilter
                          placeholder="Search..."
                          value={columnFilters.unit_cost}
                          onChange={(value) => handleColumnFilterChange("unit_cost", value)}
                        />
                      </th>
                      <th className="px-4 py-2">
                        <TableHeaderFilter
                          placeholder="Search ..."
                          value={columnFilters.supplier}
                          onChange={(value) => handleColumnFilterChange("supplier", value)}
                        />
                      </th>
                      <th className="px-4 py-2">
                        <TableHeaderFilter
                          placeholder="Search..."
                          value={columnFilters.reorder_level}
                          onChange={(value) => handleColumnFilterChange("reorder_level", value)}
                        />
                      </th>
                      <th></th>
                      <th></th>
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800">
                  {displayData.map((item) => {
                    const isLowStock = item.quantity <= (item.reorder_level || 0);
                    const costChange = getUnitCostChangeIndicator(item);
                    const itemId = item.id || item._id;

                    return (
                      <tr
                        key={itemId}
                        className={`hover:bg-gray50-temp ${isLowStock ? 'bg-orange-50 dark:bg-gray-700' : ''} ${selectedItems.includes(itemId) ? 'bg-blue-50 dark:bg-gray-900' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {canDelete && <input
                            type="checkbox"
                            checked={selectedItems.includes(itemId)}
                            onChange={(e) => handleSelectItem(itemId, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.item_image_url ? (
                            <img
                              src={item.item_image_url}
                              alt={item.item_name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400temp" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900temp">{item.item_name}</span>
                            {isLowStock && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={getCategoryColor(item.category)}>
                            {getCategoryName(item.category)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900temp">
                          {getLocationName(item.location)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900temp">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600temp">
                          {item.unit}
                        </td>
                        {user?.role_type !== "Crew View" && (<td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-900temp">
                              {formatCurrency(item.unit_cost)}
                            </span>
                            {costChange === 'increase' && (
                              <ArrowUp className="w-4 h-4 text-green-600" title={`Previous: ${formatCurrency(item.previous_unit_cost)}`} />
                            )}
                            {costChange === 'decrease' && (
                              <ArrowDown className="w-4 h-4 text-red-600" title={`Previous: ${formatCurrency(item.previous_unit_cost)}`} />
                            )}
                          </div>
                        </td>)}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.supplier && isValidUrl(item.supplier) ? (
                            <a
                              href={item.supplier.startsWith("http") ? item.supplier : `https://${item.supplier}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline truncate max-w-xs block"
                            >
                              {item.supplier}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-900temp truncate max-w-xs block">
                              {item.supplier || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900temp">
                          {item.reorder_level || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <TooltipModal icon="info" text={item.description} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            {canUpdate && <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedItems([]); onEdit(item) }}
                              className="h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>}
                            {canDelete && <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(item._id)}
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                            >
                              <Trash className="w-4 h-4" />
                            </Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <StickyScrollbar tableContainerRef={tableContainerRef} />
        </>
      )}

      {viewMode === 'grid' && (
        <div className="space-y-4">

          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {displayData.map((item) => {
              const isLowStock = item.quantity <= (item.reorder_level || 0);
              const totalValue = (item.quantity || 0) * (item.unit_cost || 0);
              const costChange = getUnitCostChangeIndicator(item);
              const itemId = item.id || item._id;

              return (
                <Card
                  key={itemId}
                  className={`flex flex-col hover:shadow-lg transition-all duration-300 relative ${isLowStock ? 'border-l-4 border-l-orange-500' : ''
                    } ${selectedItems.includes(itemId) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="absolute top-2 left-2 z-10">
                    {canDelete && <input
                      type="checkbox"
                      checked={selectedItems.includes(itemId)}
                      onChange={(e) => handleSelectItem(itemId, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                    />}
                  </div>

                  <div className="relative h-40 w-full bg-gray-100 rounded-t-lg flex items-center justify-center">
                    {item.item_image_url ? (
                      <img
                        src={item.item_image_url}
                        alt={item.item_name}
                        className="h-full w-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-gray-400temp" />
                    )}
                  </div>

                  <CardContent className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900temp truncate">
                          {item.item_name}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-gray-500temp mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge className={getCategoryColor(item.category)}>
                            {getCategoryName(item.category)}
                          </Badge>
                          {isLowStock && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {canUpdate && <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedItems([]); onEdit(item) }}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>}
                        {canDelete && <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(item.id || item._id)}

                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600temp">Quantity:</span>
                        <span className="font-medium">{item.quantity} {item.unit}</span>
                      </div>
                      {item.unit_cost > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600temp">Unit Cost:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">${item.unit_cost}</span>
                            {costChange === 'increase' && (
                              <ArrowUp className="w-4 h-4 text-green-600" title={`Previous: $${item.previous_unit_cost}`} />
                            )}
                            {costChange === 'decrease' && (
                              <ArrowDown className="w-4 h-4 text-red-600" title={`Previous: $${item.previous_unit_cost}`} />
                            )}
                          </div>
                        </div>
                      )}
                      {totalValue > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600temp">Total Value:</span>
                          <span className="font-medium">${totalValue.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600temp">Location:</span>
                        <span className="font-medium">{item.location}</span>
                      </div>
                      {item.supplier && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600temp">Supplier:</span>
                          {isValidUrl(item.supplier) ? (
                            <a
                              href={item.supplier.startsWith("http") ? item.supplier : `https://${item.supplier}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 truncate hover:underline max-w-[150px]"
                            >
                              {item.supplier}
                            </a>
                          ) : (
                            <span className="font-medium truncate text-gray-800temp max-w-[150px]">
                              {item.supplier}
                            </span>
                          )}
                        </div>
                      )}
                      {item.reorder_level > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600temp">Reorder Level:</span>
                          <span className="font-medium">{item.reorder_level}</span>
                        </div>
                      )}
                      {item.receipt && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600temp">Receipt:</span>
                          <a
                            href={item.receipt.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}


          </div>
        </div>
      )}

      {selectedItems.length > 0 && (
        <BulkActions
          selectedCount={selectedItems.length}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedItems([])}
          onSelectAll={() => handleSelectAllFiltered(true)}
          totalItems={filteredData.length}
        />
      )}


    </div>
  );
}