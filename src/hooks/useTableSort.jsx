import { useState, useMemo, useEffect } from "react";

export function useTableSort(
  data,
  defaultKey = "",
  defaultDirection = "asc",
  customGetters = {},
  externalSortConfig = null,
  onExternalSort = null
) {
  const [sortConfig, setSortConfig] = useState({
    key: defaultKey,
    direction: defaultDirection,
  });

  useEffect(() => {
    if (externalSortConfig && externalSortConfig.key) {
      setSortConfig(externalSortConfig);
    }
  }, [externalSortConfig]);

  const handleSort = (key) => {
    const nextDirection =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({
      key,
      direction: nextDirection,
    });
    if (onExternalSort) {
      onExternalSort({ key, direction: nextDirection });
    }
  };

  const sortedData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return data;
    if (!sortConfig.key) return data;
    if (onExternalSort) return data;

    return [...data].sort((a, b) => {
      let aVal = customGetters && customGetters[sortConfig.key]
        ? customGetters[sortConfig.key](a)
        : a[sortConfig.key];
      let bVal = customGetters && customGetters[sortConfig.key]
        ? customGetters[sortConfig.key](b)
        : b[sortConfig.key];

      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      const isDate = (val) => {
        if (val instanceof Date) return true;
        if (typeof val === "string" && val.length > 5) {
          const parsed = Date.parse(val);
          return !isNaN(parsed) && isNaN(Number(val));
        }
        return false;
      };

      if (isDate(aVal) && isDate(bVal)) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" });
        return sortConfig.direction === "asc" ? cmp : -cmp;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, customGetters, onExternalSort]);

  return { sortedData, sortConfig, handleSort };
}
