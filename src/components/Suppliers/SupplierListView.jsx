import { useState, useRef } from "react";
import StickyScrollbar from "../shared/StickyScrollbar";
import { useTableSort } from "@/hooks/useTableSort";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Edit,
  Trash,
  Mail,
  Phone,
  MapPin,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";
import TableHeaderFilter from "../shared/TableHeaderFilter";

export default function SupplierListView({
  suppliers,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  columnFilters = {},
  onColumnFilterChange,
  totalFilteredCount,
  currentSort,
  onSortChange,
  clientSidePagination = false
}) {
  const [showFilters, setShowFilters] = useState(false);
  const tableContainerRef = useRef(null);

  const { sortedData: sortedSuppliers, handleSort } = useTableSort(suppliers);

  const allSelected =
    suppliers.length > 0 && selectedItems.length === suppliers.length;

  const someSelected =
    selectedItems.length > 0 && selectedItems.length < suppliers.length;

  return (
    <div className="relative">
    <div className="table-listrow-divstyle">
      <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide" className="text-sm">
        <TableHeader className="bg-gray50-temp text-gray-700temp font-medium">
          <TableRow>
            <TableHead className="w-12 text-center">
              <div className="flex flex-col items-left gap-2 pt-2 pb-2">
                <button
                  onClick={() => setShowFilters((p) => !p)}
                  className="p-0 bg-transparent border-none hover:text-blue-600 text-gray-600temp"
                >
                  {showFilters ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Filter className="w-4 h-4" />
                  )}
                </button>

                {canDelete && <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />}
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("company_name")}
            >
              <div className="flex items-center gap-1">
                Company Name <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("contact_name")}
            >
              <div className="flex items-center gap-1">
                Contact Name <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("email")}
            >
              <div className="flex items-center gap-1">
                Email <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("phone")}
            >
              <div className="flex items-center gap-1">
                Phone <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("address")}
            >
              <div className="flex items-center gap-1">
                Address <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
              </div>
            </TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
          {showFilters && (
            <TableRow className="bg-white border-t dark:bg-gray-900">
              <TableHead></TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.company_name || ""}
                  onChange={(value) =>
                    onColumnFilterChange("company_name", value)
                  }
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.contact_name || ""}
                  onChange={(value) =>
                    onColumnFilterChange("contact_name", value)
                  }
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.email || ""}
                  onChange={(value) => onColumnFilterChange("email", value)}
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.phone || ""}
                  onChange={(value) => onColumnFilterChange("phone", value)}
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.address || ""}
                  onChange={(value) => onColumnFilterChange("address", value)}
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead></TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {sortedSuppliers.length > 0 ? (
            sortedSuppliers.map((supplier) => {
              const isSelected = selectedItems.includes(supplier._id);

              return (
                <TableRow
                  key={supplier.id}
                  className="hover:bg-gray50-temp transition border-b"
                >
                  <TableCell>
                    {canDelete && <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onSelectItem(supplier._id, checked)
                      }
                    />}
                  </TableCell>

                  <TableCell className="text-gray-700temp">
                    {supplier.company_name}
                  </TableCell>

                  <TableCell className="text-gray-700temp">
                    {supplier.contact_name}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600temp">
                      <Mail className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">
                        {supplier.email}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600temp">
                      <Phone className="w-4 h-4" />
                      <span>{supplier.phone}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600temp">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-[250px]">
                        {supplier.address}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-center gap-2">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            onEdit(supplier);
                          }}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            onDelete(supplier);
                          }}
                          className="h-8 w-8 text-red-600 hover:text-red-800"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-10 text-gray-500"
              >
                No suppliers found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    <StickyScrollbar tableContainerRef={tableContainerRef} />
    </div>
  );
}