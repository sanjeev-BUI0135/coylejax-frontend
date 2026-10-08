import { useEffect, useState } from "react";
import localApi from "../services/localApi";

export function useHierarchyUsers(currentUser) {
  const [users, setUsers] = useState([]);
  const rootAdminId =
    currentUser?.role_type === "admin"
      ? currentUser.id
      : currentUser?.created_by;

  useEffect(() => {
    if (!rootAdminId) return;

    const loadUsers = async () => {
      try {
        const allUsers = await localApi.request("/users");
        const allClients = await localApi.request("/clients");

        const rootAdmin = allClients.find(
          c => c._id === rootAdminId
        );

        const adminObject = rootAdmin
          ? {
              _id: rootAdmin._id,
              full_name: `${rootAdmin.firstName} ${rootAdmin.lastName}`
            }
          : null;

        const filteredUsers = allUsers
          .filter(u => u.created_by === rootAdminId)
          .map(u => ({
            _id: u._id,
            full_name: u.full_name,
            project_type: u.project_type || [],
            leads_assigned: u.leads_assigned || false 
          }));

        const canSeeAll = currentUser?.role_type === "admin" || Boolean(currentUser?.all_data_visible);
        const currentUserDivisions = Array.isArray(currentUser?.project_type) ? currentUser.project_type : [];

        let finalUsers = [
          ...(adminObject ? [adminObject] : []),
          ...filteredUsers
        ];

        if (!canSeeAll) {
          if (currentUserDivisions.length > 0) {
            finalUsers = finalUsers.filter(u => {
              if (u._id === currentUser._id || u._id === currentUser.id) return true;
              if (adminObject && u._id === adminObject._id) return true;
              const userDivisions = Array.isArray(u.project_type) ? u.project_type : [];
              return userDivisions.some(d => currentUserDivisions.includes(d));
            });
          } else {
            finalUsers = finalUsers.filter(u => u._id === currentUser._id || u._id === currentUser.id || (adminObject && u._id === adminObject._id));
          }
        }

        setUsers(finalUsers);

      } catch (err) {
        console.error("Hierarchy users load error:", err);
      }
    };

    loadUsers();
  }, [rootAdminId]);

  return users;
}
