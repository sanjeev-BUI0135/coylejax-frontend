import { useEffect, useState } from "react";
import { UserService } from "../services/userservice.js";

export const useCreatedByUsers = (data = []) => {
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

    const fetchUsers = async () => {
      const ids = [
        ...new Set(
          data
            .flatMap((i) => {
              const u1 = typeof i.created_by_user === 'object' && i.created_by_user ? (i.created_by_user._id || i.created_by_user.id) : i.created_by_user;
              const u2 = typeof i.created_by === 'object' && i.created_by ? (i.created_by._id || i.created_by.id) : i.created_by;
              return [u1, u2];
            })
            .filter((id) => typeof id === 'string' && isValidId(id))
        ),
      ];

      let allUsers = [];
      try {
        const res = await UserService.list();
        allUsers = Array.isArray(res) ? res : res.users || res.data || [];
      } catch {
        // ignore
      }

      const listMap = {};
      allUsers.forEach((u) => {
        const uid = u._id || u.id;
        listMap[uid] =
          u.full_name ||
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          u.email ||
          "—";
      });

      const results = await Promise.all(
        ids.map(async (id) => {
          if (listMap[id]) return { id, name: listMap[id] };
          try {
            const user = await UserService.get(id);
            const name =
              user?.full_name ||
              `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
              user?.companyName ||
              user?.email ||
              "—";
            return { id, name };
          } catch {
            return { id, name: "—" };
          }
        })
      );

      const map = {};
      results.forEach((r) => {
        map[r.id] = r.name;
      });
      setUserMap(map);
    };

    if (data.length) fetchUsers();
  }, [data]);

  return userMap;
};