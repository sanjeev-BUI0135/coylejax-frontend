import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Search } from "lucide-react";

export default function MultiSelect({
  options,
  selectedValues = [],
  onChange,
  placeholder = "Select options",
  showSearch = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options
    .filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const allSelected = filteredOptions.length > 0 && filteredOptions.every(opt => selectedValues.includes(opt.value));

  const handleToggle = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    const visibleValues = filteredOptions.map(opt => opt.value);
    if (allSelected) {
      onChange(selectedValues.filter(val => !visibleValues.includes(val)));
    } else {
      const newSelected = [...new Set([...selectedValues, ...visibleValues])];
      onChange(newSelected);
    }
  };

  const selectedLabels = options
    .filter((opt) => selectedValues.includes(opt.value))
    .map((opt) => opt.label)
    .join(", ");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between bg-white text-left font-normal"
        >
          <span className="truncate">
            {selectedLabels || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="z-[100000] w-[var(--radix-dropdown-menu-trigger-width)] max-h-[280px] p-0 flex flex-col"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {showSearch && (
          <div className="p-2 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex items-center px-2 py-1.5 border rounded-md bg-gray-50/50 focus-within:ring-1 focus-within:ring-blue-500">
              <Search className="w-4 h-4 text-gray-500 mr-2" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent outline-none text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        <div className="p-1 border-b border-gray-100 bg-gray-50/50">
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={handleSelectAll}
            className="flex items-center space-x-2 cursor-pointer font-medium rounded-md py-2"
          >
            <Checkbox checked={allSelected} className="mr-2 pointer-events-none data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
            <span>{allSelected ? "Uncheck All" : "Check All"}</span>
          </DropdownMenuItem>
        </div>

        <div className="overflow-y-auto flex-1 p-1">
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-sm text-center text-gray-500">No results found</div>
          ) : (
            filteredOptions.map((opt) => {
            const isSelected = selectedValues.includes(opt.value);
            return (
              <DropdownMenuItem
                key={opt.value}
                onSelect={(e) => e.preventDefault()}
                onClick={() => handleToggle(opt.value)}
                className={`flex items-center space-x-2 cursor-pointer py-2 ${
                  isSelected ? "bg-blue-50/50" : ""
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(opt.value)}
                  className="mr-2 pointer-events-none data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <span className="text-sm">{opt.label}</span>
              </DropdownMenuItem>
            );
          }))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
