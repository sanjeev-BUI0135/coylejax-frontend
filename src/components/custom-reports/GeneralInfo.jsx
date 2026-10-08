import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GeneralInfo = ({ formData, onChange, errors = {} }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Report Type</Label>
        <Select
          value={formData.report_type}
          onValueChange={(v) => onChange("report_type", v)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Project">Project</SelectItem>
            {/* <SelectItem value="Estimate">Estimate</SelectItem>
            <SelectItem value="Invoice">Invoice</SelectItem> */}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Report Name <span className="text-red-500">*</span></Label>
        <Input
          placeholder="e.g. Automate Report"
          className={`bg-white ${errors.report_name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          value={formData.report_name}
          onChange={(e) => onChange("report_name", e.target.value)}
        />
        {errors.report_name && (
          <p className="text-red-500 text-xs mt-1">{errors.report_name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(v) => onChange("status", v)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default GeneralInfo;
