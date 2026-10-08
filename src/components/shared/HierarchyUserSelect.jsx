import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HierarchyUserSelect({
  users = [],
  value = "",
  onChange = () => { },
  label = "All Users"
}) {
  const displayUsers = [...users];
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = storedUser._id || storedUser.id;

  // Cache loaded users to sessionStorage to prevent delays on navigation
  React.useEffect(() => {
    if (users && users.length > 0) {
      const cache = JSON.parse(sessionStorage.getItem("hierarchyUserCache") || "{}");
      let updated = false;
      users.forEach(u => {
        if (u._id && u.full_name && cache[u._id] !== u.full_name) {
          cache[u._id] = u.full_name;
          updated = true;
        }
      });
      if (updated) {
        sessionStorage.setItem("hierarchyUserCache", JSON.stringify(cache));
      }
    }
  }, [users]);

  if (value && value !== "all" && !users.some(u => u._id === value)) {
    let userName = null;
    
    // Check if it's the logged-in user
    if (value === currentUserId) {
      userName = storedUser.full_name || storedUser.name || `${storedUser.firstName || ""} ${storedUser.lastName || ""}`.trim() || storedUser.email || "—";
    } else {
      // Check if it's another user we've already cached
      const cache = JSON.parse(sessionStorage.getItem("hierarchyUserCache") || "{}");
      if (cache[value]) {
        userName = cache[value];
      }
    }

    if (userName) {
      displayUsers.unshift({ _id: value, full_name: userName });
    }
  }

  return (
    <div>
      <Select
        value={value || "all"}
        onValueChange={(val) => onChange(val)}
      >
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder={label} />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">{label}</SelectItem>
          {label === "Assigned To" && (
            <SelectItem value="unassigned">
              Unassigned
            </SelectItem>
          )}

          {displayUsers.map((user) => (
            <SelectItem key={user._id} value={user._id}>
              {user.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
