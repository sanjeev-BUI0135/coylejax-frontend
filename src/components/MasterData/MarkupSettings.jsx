import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Select as SelectUi,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import Select from "react-select";
import masterDataService from "../../services/masterDataService";
import { fetchRoles } from "../../services/roleApi";
import { UserService } from "../../services/userservice";
import localApi from "../../services/localApi";
import Swal from "sweetalert2";

const MarkupSettings = ({ canUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [markupId, setMarkupId] = useState(null);

  const [initialData, setInitialData] = useState({
    markupText: "",
    markupPercentage: "",
    userRoleType: "",
    selectedUsers: [],
    estimateAmount: "",
    materialRoleType: "",
    materialUsers: [],
    paymentRoleType: "",
    paymentUsers: []
  });

  const [formData, setFormData] = useState({
    markupText: "",
    markupPercentage: "",
    userRoleType: "",
    selectedUsers: [],
    estimateAmount: "",
    materialRoleType: "",
    materialUsers: [],
    paymentRoleType: "",
    paymentUsers: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [markupRes, rolesRes, usersRes, me] = await Promise.all([
          masterDataService.getAll("markup"),
          fetchRoles(),
          UserService.list(),
          localApi.getMe(),
        ]);
        /* ROLES */

        const rolesData = Array.isArray(rolesRes)
          ? rolesRes
          : rolesRes.data || [];

        setRoles(rolesData);

        /* USERS */

        const usersData = Array.isArray(usersRes)
          ? usersRes
          : usersRes.data || [];

        const mappedUsers = usersData.map((u) => {
          let roleName = u.role_type || "";
          if (u.roleId && typeof u.roleId === "object" && u.roleId.name) {
            roleName = u.roleId.name;
          } else if (u.roleId && Array.isArray(rolesData)) {
            const foundRole = rolesData.find(
              (r) => String(r._id) === String(u.roleId)
            );
            if (foundRole) roleName = foundRole.name;
          }
          return {
            label: u.full_name,
            value: u._id,
            role: roleName,
            role_type: u.role_type || "",
          };
        });

        setUsers(mappedUsers);

        const markups = Array.isArray(markupRes)
          ? markupRes
          : markupRes.data || [];

        if (markups.length > 0) {
          const entry =
            markups.find((m) => String(m.created_by) === String(me._id)) ||
            markups.find((m) => String(m.created_by) === String(me.created_by));

          if (entry) {
            setMarkupId(entry._id);
            const data = {
              markupText: entry.value || "",
              markupPercentage: entry.markup_line_item || "",
              userRoleType: entry.low_markup_role || "",
              selectedUsers: entry.low_markup_users || [],
              estimateAmount: entry.estimate_amount || "",
              materialRoleType: entry.material_approval_role || "",
              materialUsers: entry.material_approval_users || [],
              paymentRoleType: entry.payment_alert_role || "",
              paymentUsers: entry.payment_alert_users || []
            };
            setFormData(data);
            setInitialData(data);
          }
        }
      } catch (err) {
        console.error("Error fetching markup settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* SAVE SETTINGS */

  const handleSave = async () => {
    try {
      const payload = {
        type: "markup",
        display_name: "Markup Settings",
        value: formData.markupText,
        markup_line_item: Number(formData.markupPercentage),

        low_markup_role: formData.userRoleType,
        low_markup_users: formData.selectedUsers,

        estimate_amount: Number(formData.estimateAmount),

        material_approval_role: formData.materialRoleType,
        material_approval_users: formData.materialUsers,

        payment_alert_role: formData.paymentRoleType,
        payment_alert_users: formData.paymentUsers
      };

      if (markupId) {
        await masterDataService.update(markupId, payload);
      } else {
        await masterDataService.create("markup", payload);
      }

      Swal.fire("Success", "Settings saved successfully", "success");
    } catch (err) {
      console.error("Error saving settings:", err);
      Swal.fire("Error", "Could not save settings", "error");
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading settings...</div>;
  }

  const filteredUsers = users.filter(
    (u) =>
      !formData.userRoleType ||
      String(u.role).toLowerCase() === String(formData.userRoleType).toLowerCase()
  );

  const selectedUserOptions = filteredUsers.filter((u) =>
    formData.selectedUsers.includes(u.value)
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-lg font-bold text-gray-900 dark:text-white">
              Markup Text
            </label>

            <Input
              value={formData.markupText}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  markupText: e.target.value,
                })
              }
              disabled={!canUpdate}
              className="h-10 text-base"
            />
          </div>


        </div>

        {/* LOW MARKUP ALERT */}

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Low Material Markup Alert
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* ROLE SELECT */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Line Items Markup %
              </label>

              <Input
                value={formData.markupPercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    markupPercentage: e.target.value,
                  })
                }
                disabled={!canUpdate}
                className="h-10 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                User Role Type
              </label>

              <SelectUi
                value={formData.userRoleType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    userRoleType: val,
                    selectedUsers: [],
                  })
                }
                disabled={!canUpdate}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>

                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectUi>
            </div>

            {/* USERS */}

            {formData.userRoleType && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Users
                </label>

                <Select
                  isMulti
                  isDisabled={!canUpdate}
                  options={filteredUsers}
                  value={selectedUserOptions}
                  onChange={(selected) =>
                    setFormData({
                      ...formData,
                      selectedUsers: selected
                        ? selected.map((o) => o.value)
                        : [],
                    })
                  }
                  classNamePrefix="select"
                  placeholder="Select Users"
                />
              </div>
            )}

          </div>
        </div>

        {/* MATERIAL ORDER APPROVAL */}

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Material Order Approval
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Estimate Amount
              </label>

              <div className="relative">
                <Input
                  value={formData.estimateAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimateAmount: e.target.value,
                    })
                  }
                  disabled={!canUpdate}
                  className="h-10 text-base pl-8"
                />

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
              </div>
            </div>
            {/* ROLE */}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                User Role Type
              </label>

              <SelectUi
                value={formData.materialRoleType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    materialRoleType: val,
                    materialUsers: []
                  })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>

                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectUi>
            </div>


            {/* USERS */}

            {formData.materialRoleType && (
              <div className="space-y-2">

                <label className="text-sm font-medium">
                  Users
                </label>

                <Select
                  isMulti
                  options={users.filter(
                    u =>
                      String(u.role).toLowerCase() ===
                      String(formData.materialRoleType).toLowerCase()
                  )}
                  value={users.filter(u =>
                    formData.materialUsers.includes(u.value)
                  )}
                  onChange={(selected) =>
                    setFormData({
                      ...formData,
                      materialUsers: selected
                        ? selected.map(o => o.value)
                        : []
                    })
                  }
                  classNamePrefix="select"
                  placeholder="Select Users"
                  className="h-12"
                />

              </div>
            )}

          </div>
        </div>

        {/* CUSTOMER PAYMENT ALERT */}

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Customer Payment Alert
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ROLE */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                User Role Type
              </label>

              <SelectUi
                value={formData.paymentRoleType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    paymentRoleType: val,
                    paymentUsers: []
                  })
                }
                disabled={!canUpdate}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>

                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectUi>
            </div>

            {/* USERS */}
            {formData.paymentRoleType && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Users
                </label>

                <Select
                  isMulti
                  isDisabled={!canUpdate}
                  options={users.filter(
                    (u) =>
                      String(u.role).toLowerCase() ===
                        String(formData.paymentRoleType).toLowerCase() ||
                      String(u.role_type).toLowerCase() ===
                        String(formData.paymentRoleType).toLowerCase()
                  )}
                  value={users.filter((u) =>
                    formData.paymentUsers.includes(u.value)
                  )}
                  onChange={(selected) =>
                    setFormData({
                      ...formData,
                      paymentUsers: selected
                        ? selected.map((o) => o.value)
                        : []
                    })
                  }
                  classNamePrefix="select"
                  placeholder="Select Users"
                  className="h-12"
                />
              </div>
            )}
          </div>
        </div>

        <hr />

        {/* ACTION BUTTONS */}

        <div className="flex items-center justify-between pt-2">

          <Button
            variant="outline"
            onClick={() => setFormData(initialData)}
            className="flex items-center gap-2"
          >
            <X size={18} />
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={!canUpdate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check size={18} />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarkupSettings;