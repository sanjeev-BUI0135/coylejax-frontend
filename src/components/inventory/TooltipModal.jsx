import React, { useState } from "react";
import { MapPin, Info, X } from "lucide-react";

export default function TooltipModal({ icon = "info", text }) {
  const [open, setOpen] = useState(false);

  if (!text) return null;

  const IconComponent = icon === "location" ? MapPin : Info;

  return (
    <div
      className="flex items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <IconComponent
        className="w-4 h-4 text-blue-500 cursor-pointer hover:text-blue-600 flex-shrink-0"
        onClick={() => setOpen(true)}
      />

      {open && (
        <div
          className="fixed inset-0 bg-black/40  flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-gray-900 text-white text-sm rounded-lg p-4 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-white/60 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="whitespace-normal break-words text-center">
              {text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
