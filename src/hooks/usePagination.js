import { useState, useMemo, useEffect } from 'react';

export default function usePagination(items = [], storageKey = 'projectsItemsPerPage', defaultItemsPerPage = 25) {
  const initial = parseInt(localStorage.getItem(storageKey), 10) || defaultItemsPerPage;
  const [itemsPerPage, setItemsPerPage] = useState(initial);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    localStorage.setItem(storageKey, itemsPerPage);
  }, [itemsPerPage, storageKey]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((items?.length || 0) / itemsPerPage));
  }, [items, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return (items || []).slice(startIndex, startIndex + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  return {
    paginatedItems,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems: items?.length || 0
  };
}
