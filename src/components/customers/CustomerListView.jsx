import { useState, useRef } from "react";
import StickyScrollbar from "../shared/StickyScrollbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Edit, Trash, Mail, Phone, MapPin, ArrowUpDown, Filter, X, } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useTableSort } from "@/hooks/useTableSort";
import TableHeaderFilter from "../shared/TableHeaderFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";

const customerTypeColors = {
  residential: "bg-blue-100 text-blue-800",
  commercial: "bg-green-100 text-green-800",
  industrial: "bg-purple-100 text-purple-800",
};

const formatPhoneSearch = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export default function CustomerListView({
  customers,
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
}) {
  const { sortedData, handleSort } = useTableSort(customers);
  const [showFilters, setShowFilters] = useState(false);
  const tableContainerRef = useRef(null);

  const allSelected =
    customers.length > 0 &&
    customers.every(c => selectedItems.includes(c.id || c._id));

  const someSelected =
    customers.some(c => selectedItems.includes(c.id || c._id)) &&
    !allSelected;

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
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => onSelectAll(checked)}
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
              className="text-center cursor-pointer select-none"
              onClick={() => handleSort("customer_type")}
            >
              <div className="flex items-center justify-center gap-1">
                Type <ArrowUpDown className="w-4 h-4 text-gray-400temp" />
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

            <TableHead>Address</TableHead>
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
                <Select
                  value={columnFilters.customer_type || "all"}
                  onValueChange={(value) =>
                    onColumnFilterChange(
                      "customer_type",
                      value === "all" ? "" : value
                    )
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.email || ""}
                  onChange={(value) =>
                    onColumnFilterChange("email", value)
                  }
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.phone || ""}
                  onChange={(value) => {
                    const formatted = formatPhoneSearch(value);
                    onColumnFilterChange("phone", formatted);
                  }}
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead>
                <TableHeaderFilter
                  placeholder="Search..."
                  value={columnFilters.address || ""}
                  onChange={(value) =>
                    onColumnFilterChange("address", value)
                  }
                  className="h-8 text-xs"
                />
              </TableHead>

              <TableHead></TableHead>
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {sortedData.length > 0 ? (
            sortedData.map((customer) => {
              const isSelected = selectedItems.includes(customer.id || customer._id);

              return (
                <TableRow
                  key={customer.id || customer._id}
                  className="hover:bg-gray50-temp transition border-b"
                >
                  <TableCell>
                    {canDelete && <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onSelectItem(customer.id || customer._id, checked)
                      }
                    />}
                  </TableCell>

                  <TableCell>
                    <Link
                      to={createPageUrl(`CustomerDetails?id=${customer.id || customer._id}`)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {customer.company_name}
                    </Link>
                  </TableCell>

                  <TableCell className="text-gray-700temp">
                    {customer.contact_name}
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge
                      className={customerTypeColors[customer.customer_type]}
                    >
                      {customer.customer_type}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600temp">
                      <Mail className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">
                        {customer.email}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600temp">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600temp">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-[250px]">
                        {customer.address}
                        {customer.city && `, ${customer.city}`}
                        {customer.state && `, ${customer.state}`}
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
                            onEdit(customer);
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
                            onDelete(customer);
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
                colSpan={8}
                className="text-center py-10 text-gray-500"
              >
                No contacts found
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
