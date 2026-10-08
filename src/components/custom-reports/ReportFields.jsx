import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";

const FieldItem = ({ field, selectedFields, onToggle }) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={field}
      id={field.id}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 p-2 rounded group transition-all duration-200 border border-transparent bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:shadow-xs relative"
    >
      <div 
        className="flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        title="Drag to reorder"
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <Checkbox 
        id={field.id} 
        checked={selectedFields.includes(field.id)}
        onCheckedChange={() => onToggle(field.id)}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />
      <Label htmlFor={field.id} className="cursor-pointer font-normal text-sm flex-1 select-none">
        {field.label}
      </Label>
    </Reorder.Item>
  );
};

const ReportFields = ({ fields, selectedFields, onToggle, onToggleAll, onReorder }) => {
  const isAllSelected = fields.length > 0 && selectedFields.length === fields.length;

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-slate-900 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Report Fields</CardTitle>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="select-all-fields" 
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <Label htmlFor="select-all-fields" className="text-sm font-normal cursor-pointer text-gray-600 dark:text-gray-300">
            Select All
          </Label>
        </div>
      </CardHeader>
      <CardContent className="p-4 max-h-[600px] overflow-y-auto">
        <Reorder.Group 
          axis="y" 
          values={fields} 
          onReorder={onReorder} 
          className="space-y-2"
        >
          {fields.map((field) => (
            <FieldItem 
              key={field.id} 
              field={field} 
              selectedFields={selectedFields} 
              onToggle={onToggle} 
            />
          ))}
        </Reorder.Group>
      </CardContent>
    </Card>
  );
};

export default ReportFields;
