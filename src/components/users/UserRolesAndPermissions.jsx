import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { Pencil, Trash, PlusCircle, ShieldAlert, MoreVertical } from "lucide-react";
import Swal from "sweetalert2";
import AddUserRoleForm from "./AddUserRoleForm";
import { fetchRoles, createRole, updateRole, deleteRole } from "@/services/roleApi";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const UserRolesAndPermissions = ({ onBack }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

  const modules = user.permissions || [];

  const allowedModules = ["User Management", "Tenant"];

  const relevantModules = modules.filter(m => allowedModules.includes(m.module));

  const canView = relevantModules.some(m => m.canView);
  const canAdd = relevantModules.some(m => m.canAdd);
  const canUpdate = relevantModules.some(m => m.canUpdate);
  const canDelete = relevantModules.some(m => m.canDelete);

  useEffect(() => {
    loadRoles();
  }, []);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetchRoles();
      setRoles(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Failed to load roles.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (roleData) => {
    try {
      const formattedPermissions = roleData.permissions;

      let res;
      if (editingRole) {
        res = await updateRole(editingRole._id, {
          ...roleData,
          permissions: formattedPermissions
        });

        setRoles((prev) =>
          prev.map((r) => (r._id === res.data._id ? res.data : r))
        );

        Swal.fire({
          icon: "success",
          title: "Role Updated",
          text: "The role has been updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });

      } else {
        res = await createRole({
           ...roleData,
          permissions: formattedPermissions,
        });
        setRoles((prev) => [...prev, res.data]);

        Swal.fire({
          icon: "success",
          title: "Role Created",
          text: "New role has been added successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setShowAddRoleForm(false);
      setEditingRole(null);

    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to save role. Please try again.";
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: errorMessage,
      });
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowAddRoleForm(true);
  };

  const handleDeleteRole = async (role) => {
    const result = await Swal.fire({
      title: `Delete "${role.name}"?`,
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteRole(role._id);
      setRoles((prev) => prev.filter((r) => r._id !== role._id));

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: `"${role.name}" has been deleted.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Failed to delete role. Please try again.",
      });
    }
  };

  if (showAddRoleForm) {
    return (
      <AddUserRoleForm
        onCancel={() => {
          setShowAddRoleForm(false);
          setEditingRole(null);
        }}
        onSave={handleSaveRole}
        existingRole={editingRole}
      />
    );
  }

  if (!canView) {
    return (
      <div className="p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
        <p className="text-gray-600temp mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const isSuperAdmin = user.role?.toLowerCase() === "superadmin";

  const visibleRoles = roles.filter(role => {
    const roleName = role.name.toLowerCase();
    if (roleName === "bid user") return false;
    if (!isSuperAdmin && role.name.toLowerCase() === "superadmin") {
      return false;
    }
    return true;
  });

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900temp">
            User Roles and Permissions
          </h1>
          <p className="text-gray-600temp mt-1">
            View and manage user roles and permissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Desktop Buttons */}
          {!isMobile && (
            <>
              <Button variant="outline" onClick={onBack}>
                <PlusCircle className="w-4 h-4 mr-2" />
                User Management
              </Button>

              {canAdd && (
                <Button
                  variant="outline"
                  onClick={() => setShowAddRoleForm(true)}
                >
                  Add Role
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

                <DropdownMenuItem onClick={onBack}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  User Management
                </DropdownMenuItem>

                {canAdd && (
                  <DropdownMenuItem onClick={() => setShowAddRoleForm(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Role
                  </DropdownMenuItem>
                )}

              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="table-listrow-divstyle">

          <Table className="rsp-table w-full">

            <Thead className="bg-gray50-temp">
              <Tr>
                <Th className="px-6 py-4 text-left">User Type</Th>
                <Th className="px-6 py-4 text-left">Status</Th>
                <Th className="px-6 py-4 text-right">Actions</Th>
              </Tr>
            </Thead>

            <Tbody>

              {visibleRoles.map((role, index) => (
                <Tr
                  key={role._id}
                  className={index % 2 === 0 ? "bg-blue-50 md:bg-white border-b dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white border-b dark:bg-[#303a42] md:dark:bg-[#1f2937]"}
                >

                  <Td data-label="User Type" className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${role.color || "bg-gray-100 text-gray-600temp"}`}>
                      {role.name}
                    </span>
                  </Td>

                  <Td data-label="Status" className="px-6 py-4 capitalize">
                    {role.status || "active"}
                  </Td>

                  <Td data-label="Actions" className="px-6 py-4 text-right">

                    <div className="flex gap-3 justify-end">

                      {role.name.toLowerCase() !== "admin" && (
                        <>
                          {canUpdate && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditRole(role)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteRole(role)}
                            >
                              <Trash className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </>
                      )}

                    </div>

                  </Td>

                </Tr>
              ))}

            </Tbody>

          </Table>

        </div>
      )}
    </div>
  );
};

export default UserRolesAndPermissions;