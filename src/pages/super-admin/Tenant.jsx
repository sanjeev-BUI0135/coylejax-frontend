import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, ShieldAlert, Users, PlusCircle, Trash } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import UserRolesAndPermissions from "../../components/users/UserRolesAndPermissions";
import { UserService } from "../../services/userservice";
import Swal from "sweetalert2";
import clientService from "../../services/clientAddService";
import AddNewClientForm from "../../components/add-client-form";
import { motion } from "framer-motion";
import TablePageSkeleton from "../../components/ui/tableskeleton";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import "../../App.css";


export default function Tenant() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activePage, setActivePage] = useState("users");

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const modules = user.permissions || [];
  const allowedModules = ["", "Tenant"];
  const relevantModules = modules.filter(m => allowedModules.includes(m.module));
  const canView = relevantModules.some(m => m.canView);
  const canAdd = relevantModules.some(m => m.canAdd);
  const canUpdate = relevantModules.some(m => m.canUpdate);
  const canDelete = relevantModules.some(m => m.canDelete);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await clientService.getClients();
      setAllUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);


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

      const usersData = await UserService.list('-created_date');
      setAllUsers(usersData);
    } catch (error) {
      console.error("Error updating user:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to save user. Please try again.",
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
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (!result.isConfirmed) return;

    try {
      await clientService.deleteClient(userId);
      await Swal.fire({
        title: "Deleted!",
        text: "User has been deleted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      const usersData = await clientService.getClients()
      setAllUsers(usersData);
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
      <div className="p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
        <p className="text-gray-600temp mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const filteredUsers = allUsers
  .filter(p => p.created_by === user.id)
  .filter(u => {
    const fullName = `${u?.firstName || ""} ${u?.lastName || ""}`.toLowerCase();
    const email = u?.email?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();

    return fullName.includes(search) || email.includes(search);
  });

  if (loading) {
    return <TablePageSkeleton />;
  }

  if (error) return (
    <div className="p-6 text-center">
      <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-red-700">Error</h2>
      <p className="text-gray-600temp mt-2">{error}</p>
    </div>
  );

  return (
    <div>
      {activePage === "users" && (
        <>
          {editingUser || showForm ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto justify-center"
            >
              <div className="flex items-center justify-center min-h-screen p-4">
                <AnimatePresence>
                  {showForm && (
                    <AddNewClientForm
                      client={editingUser}
                      loadPage={loadUsers}
                      onSubmit={() => {
                        setShowForm(false);
                        setEditingUser(null);
                      }}
                      onCancel={() => {
                        setShowForm(false);
                        setEditingUser(null);
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}

          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900temp">User Management</h1>
              <p className="text-gray-600temp mt-1">View and manage user roles, division, and rates.</p>
            </div>
            <div className="flex gap-2">
              {user.role_type === "Superadmin" ? null : <Button variant="outline" onClick={() => setActivePage("roles")}>
                <PlusCircle className="w-4 h-4 mr-2" /> User Roles and Permissions
              </Button>}

              <Button
                variant="outline"
                onClick={() => {
                  if (!canAdd) {
                    Swal.fire("Access Denied", "You do not have permission to add users.", "error");
                    return;
                  }
                  setEditingUser(null);
                  setShowForm(true);
                }}
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Add New
              </Button>
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

          <div className="table-listrow-divstyle rounded-lg shadow overflow-hidden">
            <Table>
              <Thead >
                <Tr className="text-left border-b border-gray-200">
                  <Th className='font-medium text-muted-foreground text-sm px-2 py-4'>Company Logo</Th>
                  <Th className='font-medium text-muted-foreground text-sm px-2'>Company Name</Th>
                  <Th className='font-medium text-muted-foreground text-sm px-2'>First Name</Th>
                  <Th className='font-medium text-muted-foreground text-sm px-2'>Last Name</Th>
                  <Th className='font-medium text-muted-foreground text-sm px-2'>Address</Th>
                  <Th className='font-medium text-muted-foreground text-sm px-2'>Company Phone</Th>
                  <Th className='font-medium text-muted-foreground text-sm px-2'>Email</Th>
                  <Th className="text-right font-medium text-muted-foreground text-sm px-2">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredUsers.map((user , index) => (
                  <Tr key={user._id} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0"><img src={import.meta.env.VITE_IMG + user.logo || `https://staging.coylejax.app${user.logo}`} alt="" width={50} height={50} className="object-contain" /></Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">{`${user.companyName}`}</Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">{`${user.firstName}`}</Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">{`${user.lastName}`}</Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">{`${user.address}`}</Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">{`${user.companyPhone}`}</Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">{user.email}</Td>
                    <Td className="text-right flex justify-end gap-2 text-sm px-2 py-3 md:py-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (!canUpdate) {
                            Swal.fire("Access Denied", "You do not have permission to edit users.", "error");
                            return;
                          }
                          handleEdit(user);
                        }}
                        className="p-2"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (!canDelete) {
                            Swal.fire("Access Denied", "You do not have permission to delete users.", "error");
                            return;
                          }
                          handleDelete(user._id);
                        }}
                        className="p-2 text-red-600 hover:text-black-700"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900temp">No users found</h3>
                <p className="text-gray-500temp mt-2">No users match your search criteria.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activePage === "roles" && (
        <UserRolesAndPermissions onBack={() => setActivePage("users")} onAddNew={() => setActivePage("addRole")} />
      )}
    </div>
  );
}
