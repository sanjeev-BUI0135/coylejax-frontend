import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdvancedFilters({ isOpen, onToggle, children, activeCount }) {
  const panelRef = useRef(null);

 useEffect(() => {
  const handleOutsideClick = (event) => {
    const isInsidePanel = panelRef.current?.contains(event.target);

    const isInsideDropdown =
      event.target.closest("[data-radix-popper-content-wrapper]") ||
      event.target.closest("[role='listbox']");

    const isToggleButton = event.target.closest("[data-filter-toggle]");

    if (!isInsidePanel && !isInsideDropdown && !isToggleButton) {
      onToggle();
    }
  };

  if (isOpen) {
    document.addEventListener("mousedown", handleOutsideClick);
  }

  return () => {
    document.removeEventListener("mousedown", handleOutsideClick);
  };
}, [isOpen, onToggle]);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        data-filter-toggle
        className="gap-2 py-4 relative"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {isOpen ? "Hide Filters" : "Show Filters"}
        {activeCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
            {activeCount}
          </span>
        )}
      </Button>

      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 z-50"
          >
            <Card className="w-[90vw] sm:w-[420px] shadow-lg">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Advanced Filters
                  </h3>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {children}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}