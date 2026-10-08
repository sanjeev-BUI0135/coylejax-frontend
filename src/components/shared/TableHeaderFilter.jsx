import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function TableHeaderFilter({ value, onChange, placeholder = "Search..." }) {
  const [localValue, setLocalValue] = useState(value || "");
  
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const clearValue = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400temp w-3 h-3" />

      <Input
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-7 pr-7 h-8 text-xs"
        onClick={(e) => e.stopPropagation()}
      />

      {localValue && (
        <X
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400temp w-3 h-3 cursor-pointer hover:text-gray-600temp"
          onClick={clearValue}
        />
      )}
    </div>
  );
}
