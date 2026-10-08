import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Save } from "lucide-react";
import Swal from "sweetalert2";
import Select from "react-select";
import InputMask from "react-input-mask";
import { fetchRoles } from "@/services/roleApi";
import masterDataService from "../../services/masterDataService";
import localApi from "../../services/localApi";
export default function UserForm({ user, onSubmit, onCancel, created_by, role }) {
  const isEdit = Boolean(user?._id);
  const [roles, setRoles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const users = JSON.parse(localStorage.getItem("user") || "{}");
  const [me, setMe] = useState([]);
  const originalProjectConfigRef = useRef(
    isEdit ? JSON.stringify(user?.project_number_config || {}) : null
  );
  // Get current year's last two digits
  const currentYear = new Date().getFullYear().toString().slice(-2);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    password: "",
    phone: user?.phone || "",
    role_type: user?.role_type || "",
    hourly_rate: user?.hourly_rate || 0,
    leads_assigned: user?.leads_assigned || false,
    project_type: Array.isArray(user?.project_type)
      ? user.project_type
      : [],
    project_type_name: Array.isArray(user?.project_type_name)
      ? user.project_type_name
      : [],
    project_number_config: {
      new_project: {
        prefix: user?.project_number_config?.new_project?.prefix || "",
        year: currentYear,
        start_number:
          user?.project_number_config?.new_project?.start_number ?? ""
      },
      service_project: {
        prefix: user?.project_number_config?.service_project?.prefix || "",
        year: currentYear,
        start_number:
          user?.project_number_config?.service_project?.start_number ?? ""
      }
    }
  });

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


  const filterDivisions = divisions.filter((d => d.created_by === users.id || d.created_by === me.created_by && users.project_type?.includes(d.value)))
  const divisionOptions = filterDivisions.map(d => ({
    value: d.value,
    label: d.display_name,
  }));

  useEffect(() => {
    fetchRoles()
      .then(res => {
        setRoles(res.data);
        if (!isEdit && res.data.length > 0) {
          setFormData(prev => ({ ...prev, role_type: res.data[0].name }));
        }
      })
      .catch(err => console.error("Failed to fetch roles:", err));

    masterDataService.getAll("divisions")
      .then(res => {
        const activeDivisions = (res.data || res || [])
          .filter(div => div.status === 'active')
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setDivisions(activeDivisions);
      })
      .catch((err) => {
        console.error("Failed to fetch divisions:", err);
      });
  }, [isEdit]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProjectConfigChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      project_number_config: {
        ...prev.project_number_config,
        [type]: {
          ...prev.project_number_config[type],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      return Swal.fire({ icon: "error", title: "Oops...", text: "Full Name is required!" });
    }

    if (!isEdit) {
      if (!formData.email.trim()) {
        return Swal.fire({ icon: "error", title: "Oops...", text: "Email is required!" });
      }
      if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        return Swal.fire({ icon: "error", title: "Oops...", text: "Please enter a valid email address!" });
      }
    }

    if ((!isEdit && (!formData.password || formData.password.length < 6)) ||
      (isEdit && formData.password && formData.password.length < 6)) {
      return Swal.fire({ icon: "error", title: "Oops...", text: "Password must be at least 6 characters!" });
    }

    if (!formData.role_type) {
      return Swal.fire({ icon: "error", title: "Oops...", text: "Role Type is required!" });
    }

    if (!formData.project_type) {
      return Swal.fire({ icon: "error", title: "Oops...", text: "Division Type is required!" });
    }

    if (formData.hourly_rate < 0) {
      return Swal.fire({ icon: "error", title: "Oops...", text: "Hourly Rate cannot be negative!" });
    }

    const payload = {
      ...formData,
      hourly_rate: parseFloat(formData.hourly_rate),
      project_type: formData.project_type,
      project_type_name: formData.project_type_name,
      created_by: created_by,
      project_number_config: {
        new_project: {
          prefix: formData.project_number_config.new_project.prefix,
          year: formData.project_number_config.new_project.year,
          start_number: Number(
            formData.project_number_config.new_project.start_number
          )
        },
        service_project: {
          prefix: formData.project_number_config.service_project.prefix,
          year: formData.project_number_config.service_project.year,
          start_number: Number(
            formData.project_number_config.service_project.start_number
          )
        }
      }
    };


    if (isEdit && !formData.password) delete payload.password;
    onSubmit(isEdit ? user._id : null, payload);
  };
  const isAdmin = role?.toLowerCase() === "superadmin";

  const filteredRoles = roles.filter(r => {
    const roleName = r.name.toLowerCase();
    if (roleName === "bid user") return false;

    if (isAdmin && ["admin", "superadmin"].includes(roleName)) {
      return false;
    }
    if (r.status === "inactive" && r.name !== formData.role_type) {
      return false;
    }
    return true;
  });

  const roleOptions = filteredRoles.map(r => ({
    value: r.name,
    label: r.status === "inactive" ? `${r.name} (Inactive)` : r.name,
    isDisabled: r.status === "inactive" && r.name !== formData.role_type
  }));


  const isProjectNumberChanged = () => {
    if (!isEdit) return false;

    const currentConfig = JSON.stringify(formData.project_number_config);
    return currentConfig !== originalProjectConfigRef.current;
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between bg-blue-200 dark:bg-gray-900 rounded-t-xl">
          <CardTitle>{isEdit ? "Edit User Details" : "Add New User"}</CardTitle>
          <Button variant="ghost" size="xsm" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="max-h-[80vh] overflow-y-auto mt-4 flex flex-col gap-5">
          <form onSubmit={handleSubmit} onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {isEdit ? (
                <p className="text-sm p-2 bg-gray-100 rounded-md dark:bg-gray-900">{user.email}</p>
              ) : (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password {isEdit && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Leave blank to keep current)</span>}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required={!isEdit}
                placeholder={isEdit ? "Set new password (optional)" : "Enter password"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <InputMask
                mask="(999) 999-9999"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("Text");
                  const digits = pasted.replace(/\D/g, "").slice(0, 10);
                  let formatted = digits;
                  if (digits.length > 6) {
                    formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                  } else if (digits.length > 3) {
                    formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                  } else {
                    formatted = digits;
                  }
                  handleInputChange("phone", formatted);
                }}
              >
                {(inputProps) => (
                  <Input
                    {...inputProps}
                    id="phone"
                    type="tel"
                    placeholder="(999) 999-9999"
                  />
                )}
              </InputMask>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type">Division Type</Label>

              <Select
                isMulti
                options={divisionOptions}

                value={divisionOptions.filter(opt =>
                  formData.project_type.includes(opt.value)
                )}

                onChange={(selected) => {
                  setFormData(prev => ({
                    ...prev,
                    project_type: selected ? selected.map(s => s.value) : [],
                    project_type_name: selected ? selected.map(s => s.label) : []
                  }));
                }}

                placeholder="Select division(s)"
                menuPlacement="auto"
                menuPosition="fixed"
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                menuPortalTarget={document.body}
                classNamePrefix="react-select"
                isSearchable
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT – NEW PROJECT */}
              <div className="border rounded-md p-4 space-y-2">
                <Label htmlFor="new_project">New Project Number</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Year (YY)"
                    maxLength={2}
                    disabled={true}
                    value={formData.project_number_config.new_project.year}
                    onChange={e =>
                      handleProjectConfigChange("new_project", "year", e.target.value)
                    }
                    required
                  />

                  {
                    isAdmin && <Input
                      type="number"
                      min="1"
                      disabled={!isAdmin}
                      placeholder="Start Number"
                      value={formData.project_number_config.new_project.start_number}
                      onChange={e =>
                        handleProjectConfigChange(
                          "new_project",
                          "start_number",
                          e.target.value
                        )
                      }
                      required
                    />
                  }
                  <Input
                    placeholder="Prefix"
                    maxLength={2}
                    value={formData.project_number_config.new_project.prefix}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^A-Za-z]/g, "");
                      handleProjectConfigChange(
                        "new_project",
                        "prefix",
                        value.toUpperCase()
                      );
                    }}
                    required
                  />
                </div>
              </div>

              {/* RIGHT – SERVICE PROJECT */}
              <div className="border rounded-md p-4 space-y-2">
                <Label htmlFor="service_project">Service Project Number</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Year (YY)"
                    maxLength={2}
                    disabled={true}
                    value={formData.project_number_config.service_project.year}
                    onChange={e =>
                      handleProjectConfigChange("service_project", "year", e.target.value)
                    }
                    required
                  />

                  {
                    isAdmin && <Input
                      type="number"
                      min="1"
                      disabled={!isAdmin}
                      placeholder="Start Number"
                      value={formData.project_number_config.service_project.start_number}
                      onChange={e =>
                        handleProjectConfigChange(
                          "service_project",
                          "start_number",
                          e.target.value
                        )
                      }
                      required
                    />
                  }
                  <Input
                    placeholder="Prefix"
                    maxLength={2}
                    value={formData.project_number_config.service_project.prefix}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^A-Za-z]/g, "");
                      handleProjectConfigChange(
                        "service_project",
                        "prefix",
                        value.toUpperCase()
                      );
                    }}
                    required
                  />
                </div>
              </div>
              {isEdit && isProjectNumberChanged() && (
                <div className="md:col-span-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                  ⚠️ <strong>Note:</strong> Existing project numbers will not change; the updated sequence applies only to new projects.
                </div>
              )}
              {!isAdmin && (
                <div className="md:col-span-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800">
                  ℹ️ <strong>Info:</strong> You can only change the prefix. Year is auto-selected (current year) and start number is managed by the admin.
                </div>
              )}
            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role_type">Role Type</Label>
                <Select
                  value={roleOptions.find(opt => opt.value === formData.role_type) || null}
                  onChange={(selected) => handleInputChange("role_type", selected?.value)}
                  options={roleOptions}
                  menuPlacement="auto"
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                  placeholder="Select role"
                  classNamePrefix="react-select"
                  isSearchable
                />

              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange("hourly_rate", e.target.value)}
                  placeholder="e.g., 25.50"
                />
              </div>

            </div>
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="leads_assigned"
                  checked={formData.leads_assigned}
                  onChange={(e) =>
                    handleInputChange("leads_assigned", e.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <Label
                    htmlFor="leads_assigned"
                    className="font-medium cursor-pointer"
                  >
                    Leads Assigned
                  </Label>

                  <p className="text-sm text-gray-500 mt-1">
                    Users marked as Leads Assigned will appear in the Leads Assign dropdown.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? "Save Changes" : "Create User"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
