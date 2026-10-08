import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, } from "@/components/ui/dropdown-menu";
import { Check, Move, Search, Columns, RefreshCw  } from "lucide-react";

export default function ColumnSelectMenu({
  columns,
  visibleColumnKeys,
  onVisibleColumnKeysChange,
  onReset,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedKey, setDraggedKey] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const [columnOrder, setColumnOrder] = useState(() => columns.map(c => c.key));

  useEffect(() => {
    setColumnOrder((prev) => {
      const currentKeys = columns.map(c => c.key);
      if (prev.length !== currentKeys.length || !currentKeys.every(k => prev.includes(k))) {
        return currentKeys;
      }
      return prev;
    });
  }, [columns]);

  useEffect(() => {
    setColumnOrder((prev) => {
      const visibleSet = new Set(visibleColumnKeys);
      const currentVisibleInOrder = prev.filter(k => visibleSet.has(k));

      const isMatch = currentVisibleInOrder.length === visibleColumnKeys.length &&
        currentVisibleInOrder.every((k, i) => k === visibleColumnKeys[i]);

      if (!isMatch) {
        const hiddenKeys = prev.filter(k => !visibleSet.has(k));
        return [...visibleColumnKeys, ...hiddenKeys];
      }
      return prev;
    });
  }, [visibleColumnKeys]);

  const orderedColumns = useMemo(() => {
    const byKey = new Map(columns.map((column) => [column.key, column]));
    return columnOrder.map(key => byKey.get(key)).filter(Boolean);
  }, [columns, columnOrder]);

  const filteredColumns = orderedColumns.filter((column) =>
    column.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleColumn = (columnKey) => {
    onVisibleColumnKeysChange((prev) => {
      if (prev.includes(columnKey)) {
        return prev.length === 1 ? prev : prev.filter((key) => key !== columnKey);
      }

      const next = columnOrder.filter(k => prev.includes(k) || k === columnKey);
      return next;
    });
  };

  const moveVisibleColumn = (targetKey) => {
    if (!draggedKey || draggedKey === targetKey) return;

    setColumnOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggedKey);
      const toIndex = next.indexOf(targetKey);

      if (fromIndex === -1 || toIndex === -1) return prev;

      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      const newVisible = next.filter(k => visibleColumnKeys.includes(k));
      onVisibleColumnKeysChange(newVisible);

      return next;
    });
  };

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={isOpen ? "default" : "outline"} 
          size="sm" 
          className={`h-10 px-3 ${isOpen ? "border-2 border-transparent" : ""}`}
        >
          <Columns className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Search columns..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            const allSelected =
              visibleColumnKeys.length === columns.length;
            if (allSelected) {
              onVisibleColumnKeysChange([
                columns[0]?.key,
              ]);
            } else {
              onVisibleColumnKeysChange(
                columns.map((col) => col.key)
              );
            }
          }}
          className="gap-2"
        >
          <div
            className={`h-4 w-4 rounded border flex items-center justify-center ${visibleColumnKeys.length === columns.length
              ? "bg-blue-600 border-blue-600 text-white"
              : "border-gray-300"
              }`}
          >
            {visibleColumnKeys.length === columns.length && (
              <Check className="h-3 w-3" />
            )}
          </div>
          <span>Select All</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="max-h-72 overflow-y-auto">
          {filteredColumns.map((column) => {
            const isSelected = visibleColumnKeys.includes(column.key);

            return (
              <DropdownMenuItem
                key={column.key}
                draggable={isSelected}
                onDragStart={() => setDraggedKey(column.key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveVisibleColumn(column.key)}
                onDragEnd={() => setDraggedKey(null)}
                onSelect={(event) => {
                  event.preventDefault();
                  toggleColumn(column.key);
                }}
                className="gap-2"
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 bg-white"
                    }`}
                >
                  {isSelected && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate">{column.label}</span>
                <Move className={`h-4 w-4 text-gray-400 ${isSelected ? "" : "opacity-30"}`} />
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onReset?.();
          }}
          className="gap-2"
        >
          <RefreshCw  className="h-4 w-4" />
          <span>Reset to Default</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
