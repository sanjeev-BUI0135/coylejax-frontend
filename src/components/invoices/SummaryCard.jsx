import React from "react";
import { formatCurrency } from "@/lib/utils";

export default function SummaryCard({ icon: Icon, label, value, isDate }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex gap-4 items-center dark:bg-[#1f2937]">
      <Icon className="text-blue-500" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold">
          {isDate ? value : formatCurrency(value)}
        </p>
      </div>
    </div>
  );
}
