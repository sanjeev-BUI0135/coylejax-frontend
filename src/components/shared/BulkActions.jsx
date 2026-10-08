import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

export default function BulkActions({ selectedCount, onDelete, onClear }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom">
      <span className="font-medium">{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          className="bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="text-white hover:bg-blue-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}