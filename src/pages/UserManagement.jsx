import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, ShieldAlert, Users, PlusCircle, Trash, MoreVertical } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import UserForm from "../components/users/UserForm";
import UserRolesAndPermissions from "../components/users/UserRolesAndPermissions";
import { UserService } from "../services/userservice";
import Swal from "sweetalert2";
import clientService from "../services/clientAddService";
import localApi from "../services/localApi";
import Pagination from "../components/shared/Pagination";
import TablePageSkeleton from "../components/ui/tableskeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import "../App.css";

const roleColors = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  "field employee": "bg-green-100 text-green-800"
};

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const created_by_user = currentUser?.role_type === "admin" ? currentUser?._id : currentUser?.created_by
  const [allData, setAllData] = useState([]);
  const [displayUsers, setDisplayUsers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activePage, setActivePage] = useState("users");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [me, setMe] = useState([])

  // Permissions for Projects
  const modules = user.permissions || [];
  const canView = modules.find(m => m.module === 'User Management')?.canView;
  const canAdd = modules.find(m => m.module === 'User Management')?.canAdd;
  const canUpdate = modules.find(m => m.module === 'User Management')?.canUpdate;
  const canDelete = modules.find(m => m.module === 'User Management')?.canDelete;

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe()
        setMe(res)
      } catch (error) {
        console.log(error)
      }
    }
    fetchMe()
  }, [])
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 340);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (canView) {
      loadData();
    }
  }, [canView, currentPage, itemsPerPage, debouncedSearchTerm]);

  useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 500); // 500ms debounce

  return () => clearTimeout(timer);
}, [searchTerm]);

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      let currentUserInfo = currentUser;

      if (!currentUserInfo) {
        currentUserInfo = await UserService.me();
        setCurrentUser(currentUserInfo);
      }

      // FETCH ALL USERS
      const userRes = await UserService.list({
        sort: "-createdAt",
        limit: 1000,
        page: 1,
      });

      const usersData = Array.isArray(userRes)
        ? userRes
        : (userRes.data || []);

      // FETCH CLIENTS
      const clientsData = await clientService.getClients();

      // MERGE
      let merged = [...usersData, ...clientsData];

      const actingUser = currentUserInfo || user;

      // ROLE FILTER
      if (actingUser.role_type === "super admin") {
        merged = merged;
      } else if (actingUser.role_type === "admin") {
        merged = merged.filter(
          (f) =>
            f._id === actingUser.id ||
            f.id === actingUser.id ||
            f.created_by === actingUser.id ||
            f.created_by === actingUser._id
        );
      } else {
        merged = merged.filter(
          (f) =>
            f._id === actingUser.id ||
            f.id === actingUser.id ||
            f.created_by === actingUser.created_by
        );
      }

      // SEARCH
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();

        merged = merged.filter(
          (u) =>
            u.full_name?.toLowerCase().includes(searchLower) ||
            u.email?.toLowerCase().includes(searchLower)
        );
      }

      // SORT
      merged.sort((a, b) => {
        if (a.role_type === "admin" && b.role_type !== "admin") return -1;
        if (a.role_type !== "admin" && b.role_type === "admin") return 1;
        return 0;
      });

      // TOTAL
      setTotalCount(merged.length);

      // PAGINATION
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      setDisplayUsers(merged.slice(startIndex, endIndex));

    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleUpdateUser = async (userId, data) => {
    if (!userId && !canAdd) {
      return Swal.fire("Access Denied", "You do not have permission to add users.", "error");
    }
    if (userId && !canUpdate) {
      return Swal.fire("Access Denied", "You do not have permission to edit users.", "error");
    }

    try {
      if (userId) {
        await UserService.update(userId, data);
        await Swal.fire({
          title: "Updated!",
          text: "User updated successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        await UserService.create(data);
        await Swal.fire({
          title: "Created!",
          text: "User created successfully.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false
        });
      }

      setShowForm(false);
      setEditingUser(null);
      loadData(); // Reload data

    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Something went wrong. Please try again!";
      Swal.fire({
        title: "Error!",
        text: msg,
        icon: "error",
        confirmButtonText: "OK"
      });
    }
  };

  const handleDelete = async (userId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d3",
      confirmButtonText: "Yes, delete it!"
    });

    if (!result.isConfirmed) return;

    try {
      await UserService.remove(userId);
      await Swal.fire({
        title: "Deleted!",
        text: "User has been deleted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      loadData(); // Reload data

    } catch (error) {
      console.error("Error deleting user:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to delete user. Please try again.",
        icon: "error",
        confirmButtonText: "OK"
      });
    }
  };

  if (!canView) {
    return (
      <div className="p-3 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
        <p className="text-gray-300 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  if (loading && !displayUsers.length && !searchTerm) {
    return <TablePageSkeleton />;
  }

  if (error) return (
    <div className="p-3 text-center">
      <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-red-700">Error</h2>
      <p className="text-gray-300temp mt-2">{error}</p>
    </div>
  );

  return (
    <div>
      {activePage === "users" && (
        <>
          <AnimatePresence>
            {showForm && (
              <UserForm
                user={editingUser}
                onSubmit={handleUpdateUser}
                onCancel={() => setShowForm(false)}
                created_by={created_by_user}
                role={currentUser?.role_type}
              />
            )}
          </AnimatePresence>

          <div className="mb-8 flex justify-between items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
              <p className="text-gray-300 mt-1">
                View and manage user roles, division, and rates.
              </p>
            </div>

            <div className="flex items-center gap-3">

              {/* Desktop Buttons */}
              {!isMobile && (
                <>
                  <Button variant="outline" onClick={() => setActivePage("roles")}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    User Roles and Permissions
                  </Button>

                  {canAdd && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingUser(null);
                        setShowForm(true);
                      }}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add New
                    </Button>
                  )}
                </>
              )}

              {/* Mobile Dropdown */}
              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">

                    <DropdownMenuItem onClick={() => setActivePage("roles")}>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      User Roles & Permissions
                    </DropdownMenuItem>

                    {canAdd && (
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingUser(null);
                          setShowForm(true);
                        }}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add New
                      </DropdownMenuItem>
                    )}

                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            </div>
          </div>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">

            <Table className="rsp-table w-full">

              <Thead className="bg-gray-50 dark:bg-[#111827]">
                <Tr>
                  <Th className="px-3 py-4 text-left font-medium text-muted-foreground text-sm">Full Name</Th>
                  <Th className="px-3 py-4 text-left font-medium text-muted-foreground text-sm">Email</Th>
                  <Th className="px-3 py-4 text-left font-medium text-muted-foreground text-sm">Role Type</Th>
                  <Th className="px-3 py-4 text-left font-medium text-muted-foreground text-sm">Division Type</Th>
                  <Th className="px-3 py-4 text-left font-medium text-muted-foreground text-sm">Hourly Rate</Th>
                  <Th className="px-3 py-4 text-right font-medium text-muted-foreground text-sm">Actions</Th>
                </Tr>
              </Thead>

              <Tbody>

                {displayUsers.length > 0 ? (
                  displayUsers
                    .sort((a, b) => {
                      if (a.role_type === "admin" && b.role_type !== "admin") return -1;
                      if (a.role_type !== "admin" && b.role_type === "admin") return 1;
                      return 0;
                    })
                    .map((user, index) => {
                      const id = user._id || user.id;
                      return (
                        <Tr key={id} className={index % 2 === 0 ? "bg-blue-50 md:bg-white border-b dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white border-b dark:bg-[#303a42] md:dark:bg-[#1f2937]"}>

                          <Td data-label="Full Name" className="px-2 py-3 md:py-4 md:px-3">
                            {user.full_name || `${user.firstName || ''} ${user.lastName || ''}`}
                          </Td>
                          <Td data-label="Email" className="px-2 py-3 md:py-4 md:px-3 break-all">
                            {user.email}
                          </Td>
                          <Td data-label="Role Type" className="px-2 py-3 md:py-4 md:px-3">
                            <Badge className={`${roleColors[user.role_type] || "bg-black text-white"}`}>
                              {user.role_type?.replace(/_/g, " ")}
                            </Badge>
                          </Td>
                          <Td data-label="Division Type" className="px-2 py-3 md:py-4 md:px-3">
                            {Array.isArray(user?.project_type_name) && user?.project_type_name.length > 0
                              ? user?.project_type_name.join(", ")
                              : Array.isArray(user?.project_type)
                                ? user?.project_type.join(", ")
                                : "N/A"}
                          </Td>
                          <Td data-label="Hourly Rate" className="px-3 py-4">
                            {user.hourly_rate ? `$${user.hourly_rate.toFixed(2)}` : "N/A"}
                          </Td>

                          {user.role_type === "admin" ? (
                            <Td />
                          ) : (
                            <Td data-label="Actions" className="text-right text-sm px-2 py-3 md:py-4 md:px-3">

                              <div className="flex gap-2 justify-end">

                                {canUpdate && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEdit(user)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}

                                {canDelete && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(id)}
                                    className="text-red-500"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </Button>
                                )}

                              </div>

                            </Td>
                          )}

                        </Tr>
                      );
                    })
                ) : (
                  <Tr>
                    <Td colSpan={12} className="text-center py-12">
                      No users found
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      {activePage === "roles" && (
        <UserRolesAndPermissions onBack={() => setActivePage("users")} onAddNew={() => setActivePage("addRole")} />
      )}
    </div>
  );
}
