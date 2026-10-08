import React from "react";
import DatePicker from "react-datepicker";
import { X } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

// Parse YYYY-MM-DD as LOCAL date to avoid timezone issues
const parseLocalDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Handle YYYY-MM-DD
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      return new Date(year, month - 1, day);
    }
  }

  // Handle MM/DD/YYYY
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [month, day, year] = parts;
      return new Date(year, month - 1, day);
    }
  }

  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const CustomDatePicker = ({
  id,
  value,
  minDate,
  maxDate,
  onChange,
  className = "",
  portalId,
}) => {
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <DatePicker
          id={id}
          portalId={portalId}
          selected={parseLocalDate(value)}
          onChange={(date) => {
            if (date) {
              onChange(formatDate(date));
            } else {
              onChange("");
            }
          }}
          minDate={parseLocalDate(minDate)}
          maxDate={parseLocalDate(maxDate)}
          placeholderText="Select a date"
          wrapperClassName="w-full"
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 ${className}`}
          dateFormat="MM/dd/yyyy"
          autoComplete="off"
          
          name={`${id}-no-autofill`}
          popperClassName="z-[9999]"
          showPopperArrow={false}
          isClearable
        />

        {/* {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
            title="Clear date"
          >
            <X className="w-4 h-4" />
          </button>
        )} */}
      </div>
    </div>
  );
};

export default CustomDatePicker;