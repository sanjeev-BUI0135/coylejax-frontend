import { useEffect, useState, useCallback } from "react";
import { Edit, X, Trash2, Plus, Package } from "lucide-react";
import Swal from "sweetalert2";

import api from "../../services/masterDataService.js";
import localApi from "../../services/localApi.js";

import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { Input } from "../ui/input.jsx";
import { Button } from "../ui/button.jsx";
import { cn } from "@/lib/utils";
import Pagination from "../shared/Pagination.jsx";
import MasterDataFormModal from "./MasterDataFormModal";
import { validateMasterDataForm } from "../../utils/projectValidation.js";
import TablePageSkeleton from "../ui/tableskeleton.jsx";
import "../../App.css";

const MasterDataTable = ({
  type,
  title,
  columns,
  showHourlyRate = false,
  canView = true,
  canAdd = true,
  canUpdate = true,
  canDelete = true,
}) => {
  const [items, setItems] = useState([]);
  const [filterUsers, setFilterUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(
    () =>
      parseInt(localStorage.getItem(`masterData_${type}_itemsPerPage`)) || 25
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [sortKey, setSortKey] = useState("sort_order");
  const [sortDir, setSortDir] = useState("desc");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [me, setMe] = useState({});
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    display_name: "",
    value: "",
    sort_order: 0,
    status: "active",
    hourly_rate: undefined,
    terms_and_conditions: "",
    tax_added: false,
    show_all_division_data: false,
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  /* ---------------- FETCH CURRENT USER ---------------- */
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe();
        setMe(res);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMe();
  }, []);

  /* ---------------- FILTER DATA ---------------- */
  useEffect(() => {
    setItems(filterUsers);
    if (type === "markup" && filteredData.length > 0) {
      setFormData((prev) => ({
        ...prev,
        value: filteredData[0].value || ""
      }));
    }
  }, [filterUsers, user.id, me.id, type]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 1000);

    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [type, search, itemsPerPage]);

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    }
    try {
      const res = await api.getAll(type, {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch,
        sortKey,
        sortDir,
      });

      const data = Array.isArray(res) ? res : res.data ?? res;
      setFilterUsers(data);
      const serverTotal = (res && typeof res.total === 'number') ? res.total : data.length;
      setTotal(serverTotal);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not fetch data", "error");
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  }, [type, currentPage, itemsPerPage, debouncedSearch, sortKey, sortDir]);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    localStorage.setItem(
      `masterData_${type}_itemsPerPage`,
      itemsPerPage
    );
  }, [itemsPerPage, type]);

  const openAdd = () => {
    if (type === "markup" && items.length > 0) {
      openEdit(items[0]);
      return;
    }

    setEditingItem(null);
    setFormData({
      display_name: "",
      value: "",
      sort_order: 0,
      status: "active",
      hourly_rate: showHourlyRate ? 0 : undefined,
      terms_and_conditions: "",
      tax_added: false,
      show_all_division_data: false,
    });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      display_name: item.display_name ?? "",
      value: item.value ?? "",
      sort_order: item.sort_order ?? 0,
      status: item.status ?? "active",
      hourly_rate: item.hourly_rate ?? undefined,
      terms_and_conditions: item.terms_and_conditions ?? "",
      tax_added: item.tax_added ?? false,
      show_all_division_data: item.show_all_division_data ?? false,
    });
    setErrors({});
    setShowModal(true);
  };

  /* ---------------- SAVE ---------------- */
  const PROJECT_CREATION_VALUES = ["new_project", "service_work_order"];

  const save = async () => {
    try {
      if (
        type !== "project_creation_type" &&
        PROJECT_CREATION_VALUES.includes(formData.value)
      ) {
        Swal.fire(
          "Invalid value",
          `"${formData.value}" is allowed only for Project Creation Type`,
          "error"
        );
        return;
      }

      if (
        type === "project_creation_type" &&
        !PROJECT_CREATION_VALUES.includes(formData.value)
      ) {
        Swal.fire(
          "Invalid value",
          "Only new_project or service_work_order are allowed",
          "error"
        );
        return;
      }

      if (type !== "markup") {
        const newErrors = validateMasterDataForm({
          formData,
          items,
          editingItem,
          showHourlyRate,
        });

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }
      }

      const payload =
        type === "markup"
          ? {
            value: formData.value.trim(),
            created_by: user.id,
          }
          : {
            ...formData,
            display_name: formData.display_name.trim(),
            value: formData.value.trim(),
            created_by: user.id,
          };

      if (type === "markup") {
        const existingMarkup = items[0];

        if (existingMarkup) {
          await api.update(existingMarkup._id, payload);
          Swal.fire("Updated", "Markup updated successfully", "success");
        } else {
          await api.create(type, payload);
          Swal.fire("Created", "Markup created successfully", "success");
        }
      } else {
        if (editingItem) {
          await api.update(editingItem._id, payload);
          Swal.fire("Updated", "Item updated successfully", "success");
        } else {
          await api.create(type, payload);
          Swal.fire("Created", "Item created successfully", "success");
        }
      }

      setShowModal(false);
      setEditingItem(null);
      setErrors({});
      load();

    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not save", "error");
    }
  };


  /* ---------------- DELETE ---------------- */
  const confirmDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete item?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await api.remove(id);
      Swal.fire("Deleted", "Item removed", "success");

      setShowModal(false);
      setEditingItem(null);
      setErrors({});
      load();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Could not delete", "error");
    }
  };

  /* ---------------- STATUS TOGGLE ---------------- */
  const toggleStatus = async (id) => {
    try {
      await api.toggleStatus(id);
      load(false);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Could not toggle status", "error");
    }
  };

  const changeSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (!canView) {
    return (
      <div className="p-6 text-center bg-card rounded-xl border shadow">
        <Package className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-700">Access Denied</h3>
        <p className="text-gray-600temp mt-2">
          You do not have permission to view {title}.
        </p>
      </div>
    );
  }

  /* ---------------- UI (UNCHANGED) ---------------- */
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow p-5 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md md:text-xl font-semibold">{title}</h2>

        <div className="flex items-center gap-3">
          {type === "markup" ? null : (
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          {type !== "markup" && canAdd && (
            <Button
              onClick={openAdd}
              variant="primary"
              className="top-8 right-8 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> Add New
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {type === "markup" ? (
          <div className="p-6 w-full">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter markup value"
                  value={formData.value}
                  required
                  readOnly={!canUpdate}
                  onChange={(e) =>
                    setFormData({ value: e.target.value })
                  }
                  className={cn(!canUpdate && "bg-gray-100 cursor-not-allowed")}

                />
              </div>

              {canUpdate && (
                <Button
                  onClick={save}
                  className="bg-gray-900 text-white hover:bg-gray-800 h-9"
                >
                  Save Markup
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Table className="rsp-table w-full text-sm">

            <Thead className="border-b border-gray-200 bg-gray-50 dark:bg-[#111827]">
              <Tr>

                {columns.map((col) => (
                  <Th key={col.key} className="px-6 py-4 text-left">
                    <div
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => changeSort(col.sortField)}
                    >
                      <span>{col.label}</span>

                      <span className="ml-2 text-xs text-gray-400">
                        {sortKey === col.sortField
                          ? sortDir === "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </span>

                    </div>
                  </Th>
                ))}
                {showHourlyRate && (
                  <Th className="px-6 py-4 text-left">
                    Hourly Rate
                  </Th>
                )}
                {type === "lead_status" && (
                  <Th className="px-6 py-4 text-left">
                    Default
                  </Th>
                )}
                <Th className="px-6 py-4 text-left">
                  Status
                </Th>
                <Th className="px-6 py-4 text-right">
                  Actions
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan="100%" className="py-8 text-center">
                    <TablePageSkeleton />
                  </Td>
                </Tr>
              ) : items.length === 0 ? (
                <Tr>
                  <Td colSpan="100%" className="py-8 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    No items found
                  </Td>
                </Tr>
              ) : (
                items.map((item, index) => (
                  <Tr
                    key={item._id}
                    className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}
                  >
                    <Td data-label="Display Name" className="px-6 py-4">
                      {item.display_name}
                    </Td>
                    <Td data-label="Value" className="px-6 py-4 font-mono break-all">
                      {item.value}
                    </Td>
                    <Td data-label="Sort Order" className="px-6 py-4">
                      {item.sort_order}
                    </Td>
                    {showHourlyRate && (
                      <Td data-label="Hourly Rate" className="px-6 py-4">
                        {item.hourly_rate !== undefined
                          ? `$${Number(item.hourly_rate).toFixed(2)}`
                          : "-"}
                      </Td>
                    )}
                    {type === "lead_status" && (
                      <Td data-label="Default" className="px-6 py-4">
                        {item.is_default ? (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Default
                          </span>
                        ) : (
                          "-"
                        )}
                      </Td>
                    )}
                    <Td data-label="Status" className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-medium",
                          {
                            "bg-green-100 text-green-800": item.status === "active",
                            "bg-gray-100 text-gray-800": item.status !== "active",
                          }
                        )}
                      >
                        {item.status}
                      </span>
                    </Td>
                    <Td data-label="Actions" className="px-6 py-4 text-right">

                      {type === "project_creation_type" &&
                        item.value === "new_project" ? (
                        <div className="text-gray-400 text-xs italic">
                          System Default
                        </div>
                      ) : (
                        <div className="flex gap-0 md:gap-2 justify-end">
                          {canUpdate && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEdit(item)}
                            >
                              <Edit size={18} />
                            </Button>
                          )}
                          {canUpdate && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleStatus(item._id)}
                            >
                              <X size={18} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => confirmDelete(item._id)}
                            >
                              <Trash2 size={18} />
                            </Button>
                          )}
                          {!canUpdate && !canDelete && (
                            <span className="text-gray-400 text-xs italic">
                              View Only
                            </span>
                          )}
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </div>

      {total > 0 && type !== "markup" && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
        />
      )}

      <MasterDataFormModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSave={save}
        title={editingItem ? `Edit ${title}` : `Add ${title}`}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        setErrors={setErrors}
        showHourlyRate={showHourlyRate}
        editingItem={editingItem}
        type={type}
      />
    </div>
  );
};

export default MasterDataTable;
