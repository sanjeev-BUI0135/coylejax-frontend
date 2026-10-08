import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import MultiSelect from "@/components/ui/MultiSelect";

const FilterCriteria = ({
  filters,
  divisions,
  statusOptions,
  onAdd,
  onRemove,
  onChange,
  isExpanded,
  onToggle
}) => {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b dark:border-gray-700 bg-white dark:bg-slate-900">
        <CardTitle className="text-base font-semibold">Filter Criteria</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4 bg-white dark:bg-slate-900">
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 mb-1">
              <div className="col-span-4">Field Name</div>
              {/* <div className="col-span-3">Condition</div> */}
              <div className="col-span-6">Field Value</div>
              {/* <div className="col-span-2">Operator</div> */}
              <div className="col-span-2 text-right">Action</div>
            </div>
            {filters.map((filter, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <Select
                    value={filter.field}
                    onValueChange={(v) => onChange(index, "field", v)}
                  >
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Status">Status</SelectItem>
                      <SelectItem value="Division">Division</SelectItem>
                      {/* <SelectItem value="CreatedAt">Created Date</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>
                {/* <div className="col-span-3">
                  <Select
                    value={filter.condition}
                    onValueChange={(v) => onChange(index, "condition", v)}
                  >
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="=(equal)">=(equal)</SelectItem>
                      <SelectItem value=">=(greater than & equal)">&gt;=(greater than & equal)</SelectItem>
                      <SelectItem value=">(greater than)">&gt;(greater than)</SelectItem>
                      <SelectItem value="<(less than)">&lt;(less than)</SelectItem>
                      <SelectItem value="<=(less than & equal)">&lt;=(less than & equal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                <div className="col-span-6">
                  {filter.field === "Status" ? (
                    <MultiSelect
                      options={statusOptions.map(s => ({ label: s, value: s }))}
                      selectedValues={filter.value}
                      onChange={(v) => onChange(index, "value", v)}
                      placeholder="Select Status"
                    />
                  ) : filter.field === "Division" ? (
                    <MultiSelect
                      options={divisions.map(d => ({ label: d.display_name, value: d._id }))}
                      selectedValues={filter.value}
                      onChange={(v) => onChange(index, "value", v)}
                      placeholder="Select Division"
                    />
                  ) : (
                    <Input
                      type="date"
                      className="bg-gray-50"
                      value={filter.value[0] || ""}
                      onChange={(e) => onChange(index, "value", [e.target.value])}
                    />
                  )}
                </div>
                {/* <div className="col-span-2">
                  <Select
                    value={filter.operator}
                    onValueChange={(v) => onChange(index, "operator", v)}
                  >
                    <SelectTrigger className="bg-gray-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                <div className="col-span-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={filters.length === 1}
                    onClick={() => {
                      if (filters.length > 1) {
                        onRemove(index);
                      }
                    }}
                    className={`${filters.length === 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-400 hover:text-red-500"
                      }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {index === filters.length - 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onAdd}
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="w-9" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default FilterCriteria;
