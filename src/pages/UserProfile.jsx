import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import Select from "react-select";
import { Camera } from "lucide-react";
import Swal from "sweetalert2";
import avatar from "../assets/images/avatar.jpg";
import { fetchRoles } from "../services/roleApi";
import masterDataService from "../services/masterDataService";
import { UserService } from "../services/userservice";
import clientService from "../services/clientAddService";
import InputMask from "react-input-mask";

const BRAND_BLUE = "rgb(13 85 170)";
const IMG_URL = import.meta.env.VITE_IMG;

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.role_type?.toLowerCase() === "admin";

  const [roles, setRoles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [profileData, setProfileData] = useState(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [adminLogo, setAdminLogo] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTextNotifOpen, setIsTextNotifOpen] = useState(false);
  const [textNotifConsent, setTextNotifConsent] = useState(false);
  const originalProjectConfigRef = useRef(null);
  const {
    control,
    setValue,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      role_type: "",
      project_type_name: [],
      hourly_rate: "",
      password: "",
      firstName: "",
      lastName: "",
      companyName: "",
      address: "",
      companyPhone: "",
      project_number_config: {
        new_project: {
          prefix: "",
          year: "",
          start_number: ""
        },
        service_project: {
          prefix: "",
          year: "",
          start_number: ""
        }
      }
    },
  });

  const getProfileImage = () => {
    if (isAdmin) {
      return profileData?.logo
        ? `${IMG_URL}${profileData.logo}`
        : adminLogo || avatar;
    }

    return profileData?.avatar
      ? `${IMG_URL}${profileData.avatar}`
      : adminLogo || avatar;
  };

  const getProfileInitial = () => {
    if (!profileData) return "";
    if (isAdmin) {
      return `${profileData.firstName?.[0] || ""}${profileData.lastName?.[0] || ""}`.toUpperCase();
    }
    return profileData.full_name?.[0]?.toUpperCase() || "";
  };

  useEffect(() => {
    if (!id) return;

    const loadProfile = async () => {
      try {
        let data;

        if (isAdmin) {
          data = await clientService.getClientById(id);
          if (data?.logo) {
            const logo = `${IMG_URL}${data.logo}`;
            setAdminLogo(logo);
            setImagePreview(logo);
          }
        } else {
          data = await UserService.get(id);

          if (data?.created_by) {
            try {
              const admin = await clientService.getClientById(data.created_by);
              if (admin?.logo) setAdminLogo(`${IMG_URL}${admin.logo}`);
            } catch { }
          }
        }

        setProfileData(data);
        originalProjectConfigRef.current = JSON.stringify(
          data?.project_number_config || {}
        );

        // Get current year's last two digits
        const currentYear = new Date().getFullYear().toString().slice(-2);

        reset({
          ...data,
          password: "",
          project_type_name: data?.project_type_name || [],
          project_number_config: {
            new_project: {
              prefix: data?.project_number_config?.new_project?.prefix || "",
              year: data?.project_number_config?.new_project?.year || currentYear,
              start_number:
                data?.project_number_config?.new_project?.start_number ?? ""
            },
            service_project: {
              prefix: data?.project_number_config?.service_project?.prefix || "",
              year: data?.project_number_config?.service_project?.year || currentYear,
              start_number:
                data?.project_number_config?.service_project?.start_number ?? ""
            }
          },
        });
        
        setTextNotifConsent(data?.text_notifications || false);
      } catch {
        Swal.fire({ icon: "error", title: "Failed to load profile" });
      }
    };

    loadProfile();
  }, [id, isAdmin, reset, isEditOpen]);

  useEffect(() => {
    if (isAdmin) return;

    fetchRoles().then((res) => setRoles(res.data || []));
    masterDataService.getAll("divisions").then((res) => {
      const list = res?.data || res || [];
      setDivisions(list.filter((d) => d.status === "active"));
    });
  }, [isAdmin]);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.name, label: r.name })),
    [roles]
  );

  const divisionOptions = useMemo(
    () =>
      divisions.map((d) => ({
        value: d.display_name,
        label: d.display_name,
      })),
    [divisions]
  );

  const onSubmit = async (data) => {
    try {
      if (!data.password) delete data.password;

      const payload = {
        ...data,
        project_number_config: JSON.stringify(data.project_number_config),
        logo: imageFile ? imageFile : undefined,
      };

      let updatedUser;

      if (isAdmin) {
        updatedUser = await clientService.updateClient(id, payload);
      } else {
        updatedUser = await UserService.update(id, data);
      }

      setProfileData({
        ...updatedUser,
        password: undefined
      });
      reset({
        ...updatedUser,
        password: "",
      });

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
        })
      );

      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        confirmButtonColor: BRAND_BLUE,
      });

      setIsEditOpen(false);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Something went wrong",
      });
    }
  };

  const handleTextNotifSubmit = async () => {
    try {
      let updatedUser;
      if (isAdmin) {
        updatedUser = await clientService.updateClient(id, { text_notifications: textNotifConsent });
      } else {
        updatedUser = await UserService.update(id, { text_notifications: textNotifConsent });
      }
      setProfileData(prev => ({ ...prev, text_notifications: updatedUser.text_notifications }));
      Swal.fire({
        icon: "success",
        title: "Text notifications updated",
        confirmButtonColor: BRAND_BLUE,
      });
      setIsTextNotifOpen(false);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err?.response?.data?.message || err?.response?.data?.error || "Something went wrong",
      });
    }
  };

  const projectPrefixRule = {
    required: "Prefix is required",
    minLength: {
      value: 2,
      message: "Prefix must be at least 2 characters",
    },
    pattern: {
      value: /^[A-Z]+$/,
      message: "Prefix must be uppercase letters only",
    },
  };

  const projectYearRule = {
    required: "Year is required",
    pattern: {
      value: /^[0-9]{2}$/,
      message: "Enter 2 digit year (YY)",
    },
  };

  const projectStartNumberRule = {
    required: "Start number is required",
    valueAsNumber: true,
    min: {
      value: 1,
      message: "Start number must be greater than 0",
    },
  };

  const buildProjectNumber = (cfg) => {
    if (!cfg?.prefix || !cfg?.year || cfg?.start_number == null) return "-";

    const padded = String(cfg.start_number).padStart(4, "0");
    return `${cfg.year}${padded}${cfg.prefix}`;
  };

  const isProjectNumberChanged = () => {
    if (!originalProjectConfigRef.current) return false;

    const currentConfig = JSON.stringify(
      control._formValues.project_number_config
    );

    return currentConfig !== originalProjectConfigRef.current;
  };

  const openEditModal = () => {
    if (profileData) {
      reset({
        ...profileData,
        password: "",
        project_type_name: profileData?.project_type_name || [],
        project_number_config: profileData?.project_number_config || {}
      });
    }
    setIsEditOpen(true);
  };

  return (
    <div className="min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow border p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-500">
            {getProfileImage() ? (
              <img
                src={getProfileImage()}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getProfileInitial()}</span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold">
              {isAdmin
                ? `${profileData?.firstName || ""} ${profileData?.lastName || ""}`
                : profileData?.full_name}
            </h2>
            <p className="text-gray-500">{profileData?.email}</p>
            <span className="inline-block mt-1 px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-600">
              {profileData?.role_type}
            </span>
          </div>
        </div>

        <button
          onClick={openEditModal}
          className="bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-600"
        >
          Edit Profile
        </button>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-[90vw] md:w-full max-w-5xl rounded-xl shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-gray-500"
            >
              ✕
            </button>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div
                className="h-24 rounded-t-xl"
                style={{ background: BRAND_BLUE }}
              />

              <div className="relative flex items-center -mt-12 px-8">
                <div className="relative group">
                  <img
                    src={
                      imagePreview ||
                      (isAdmin
                        ? adminLogo || avatar
                        : profileData?.avatar
                          ? `${import.meta.env.VITE_IMG}${profileData.avatar}`
                          : adminLogo || avatar)
                    }
                    className="w-28 h-28 rounded-full border-4 border-white object-cover"
                    alt="profile"
                  />

                  {isAdmin && (
                    <>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center
                                opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Camera className="text-white" />
                      </div>

                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }}
                      />
                    </>
                  )}
                </div>

                <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-extrabold text-white tracking-wide leading-tight mb-24">
                  {isAdmin
                    ? `${profileData?.firstName || ""} ${profileData?.lastName || ""}`
                    : profileData?.full_name}
                </h2>
              </div>

              <div className="px-8 py-10 grid grid-cols-1 md:grid-cols-12 gap-6">
                {isAdmin && (
                  <>
                    <div className="md:col-span-6">
                      <Input
                        label="First Name"
                        {...register("firstName", { required: "Required" })}
                        error={errors.firstName?.message}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <Input
                        label="Last Name"
                        {...register("lastName", { required: "Required" })}
                        error={errors.lastName?.message}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <Input
                        label="Company Name"
                        {...register("companyName", { required: "Required" })}
                        error={errors.companyName?.message}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <Input label="Email"  {...register("email")} />
                    </div>
                    <div className="md:col-span-12">
                      <Input label="Address" {...register("address")} />
                    </div>
                    <div className="md:col-span-6">
                      <label className="label">Phone</label>
                      <Controller
                        name="companyPhone"
                        control={control}
                        render={({ field }) => (
                          <InputMask
                            mask="(999) 999-9999"
                            value={field.value}
                            onChange={field.onChange}
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

                              field.onChange(formatted);
                            }}
                          >
                            {(inputProps) => (
                              <Input
                                {...inputProps}
                                type="tel"
                                placeholder="(999) 999-9999"
                              />
                            )}
                          </InputMask>
                        )}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <Input
                        label="Password"
                        type="password"
                        helper="(Leave as empty, if you do not change password)"
                        helperClass="text-red-500"
                        {...register("password")}
                      />
                    </div>
                  </>
                )}

                {!isAdmin && (
                  <>
                    <div className="md:col-span-6">
                      <Input
                        label="Full Name"
                        {...register("full_name", { required: "Required" })}
                        error={errors.full_name?.message}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <Input label="Email"  {...register("email")} />
                    </div>
                    <div className="md:col-span-6">
                      <label className="label">Phone Number</label>
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <InputMask
                            mask="(999) 999-9999"
                            value={field.value}
                            onChange={field.onChange}
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
                              field.onChange(formatted);
                            }}
                          >
                            {(inputProps) => (
                              <Input
                                {...inputProps}
                                type="tel"
                                placeholder="(999) 999-9999"
                              />
                            )}
                          </InputMask>
                        )}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <label className="label">Role Type</label>
                      <Controller
                        name="role_type"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            options={roleOptions}
                            value={roleOptions.find(
                              (o) => o.value === field.value
                            )}
                            isDisabled
                          />
                        )}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <label className="label">Division Type</label>
                      <Controller
                        name="project_type_name"
                        control={control}
                        render={({ field }) => (
                          <Select
                            isMulti
                            options={divisionOptions}
                            value={divisionOptions.filter((o) =>
                              field.value?.includes(o.label)
                            )}
                            onChange={(vals) =>
                              field.onChange(
                                vals ? vals.map((v) => v.label) : []
                              )
                            }
                            isDisabled
                          />
                        )}
                      />
                    </div>

                    <div className="md:col-span-6">
                      <Input
                        label="Hourly Rate"
                        disabled
                        {...register("hourly_rate")}
                      />
                    </div>
                    <div className="md:col-span-6">
                      <Input
                        label="Password"
                        type="password"
                        helper="(Leave as empty, if you do not change password)"
                        helperClass="text-red-500"
                        {...register("password")}
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-12">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* NEW PROJECT */}
                    <div className="border rounded-md p-4">
                      <h4 className="mb-4">New Project</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                        <Input
                          label="Year (YY)"
                          maxLength={2}
                          disabled={true}
                          {...register("project_number_config.new_project.year", projectYearRule)}
                          error={errors?.project_number_config?.new_project?.year?.message}
                        />

                        {
                          isAdmin && <Input
                            label="Start Number"
                            type="number"
                            min="1"
                            disabled={!isAdmin}
                            {...register("project_number_config.new_project.start_number", projectStartNumberRule)}
                            error={errors?.project_number_config?.new_project?.start_number?.message}
                          />
                        }
                        <Input
                          maxLength={2}
                          label="Prefix"
                          {...register(
                            "project_number_config.new_project.prefix",
                            projectPrefixRule
                          )}
                          error={
                            errors?.project_number_config?.new_project?.prefix?.message
                          }
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/[^a-zA-Z]/g, "")
                              .toUpperCase();

                            setValue(
                              "project_number_config.new_project.prefix",
                              value,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              }
                            );
                          }}
                        />
                      </div>
                    </div>

                    {/* SERVICE PROJECT */}
                    <div className="border rounded-md p-4">
                      <h4 className="mb-4">Service Project</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">


                        <Input
                          label="Year (YY)"
                          maxLength={2}
                          disabled={true}
                          {...register("project_number_config.service_project.year", projectYearRule)}
                          error={errors?.project_number_config?.service_project?.year?.message}
                        />

                        {
                          isAdmin && <Input
                            label="Start Number"
                            type="number"
                            min="1"
                            disabled={!isAdmin}
                            {...register("project_number_config.service_project.start_number", projectStartNumberRule)}
                            error={errors?.project_number_config?.service_project?.start_number?.message}
                          />
                        }
                        <Input
                          label="Prefix"
                          maxLength={2}
                          {...register(
                            "project_number_config.service_project.prefix",
                            projectPrefixRule
                          )}
                          error={
                            errors?.project_number_config?.service_project?.prefix?.message
                          }
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/[^a-zA-Z]/g, "")
                              .toUpperCase();

                            setValue(
                              "project_number_config.service_project.prefix",
                              value,
                              {
                                shouldDirty: true,
                                shouldValidate: true,
                              }
                            );
                          }}

                        />
                      </div>
                    </div>
                    {isProjectNumberChanged() && (
                      <div className="md:col-span-2 mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                        ⚠️ <strong>Note:</strong> Project numbers for existing projects will remain unchanged.
                        The updated sequence will apply only to newly created projects.
                      </div>
                    )}
                    {!isAdmin && (
                      <div className="md:col-span-2 mt-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800">
                        ℹ️ <strong>Info:</strong> You can only change the prefix. Year is auto-selected (current year) and start number is managed by the admin.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 px-8 pb-8">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2 rounded-lg text-white font-semibold"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  {isSubmitting ? "Updating..." : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (profileData) {
                      reset({
                        ...profileData,
                        password: "",
                        project_type_name: profileData?.project_type_name || [],
                        project_number_config: profileData?.project_number_config || {}
                      });
                    }
                    setIsEditOpen(false);
                  }}
                  className="px-8 py-2 rounded-lg font-semibold border"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isTextNotifOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-[90vw] md:w-[400px] rounded-xl shadow-lg relative p-6">
            <h3 className="text-xl font-bold mb-4">Text Message Notifications</h3>
            <div className="flex items-start gap-3 mt-4">
              <input
                type="checkbox"
                id="text_notifications"
                className="mt-1 w-5 h-5 cursor-pointer"
                checked={textNotifConsent}
                onChange={(e) => setTextNotifConsent(e.target.checked)}
              />
              <label htmlFor="text_notifications" className="text-sm cursor-pointer text-gray-700 dark:text-gray-300">
                I agree to receive text messages from CoyleJax about my projects, payments, appointments, service updates, and communications from my CoyleJax project team.
              </label>
            </div>
            
            <div className="mt-6 text-sm text-gray-700 dark:text-gray-300">
              <p>
                Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for assistance. Consent is not a condition of purchasing services or using CoyleJax.
              </p>
              <p className="mt-4">
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a> | <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Terms and Condition</a>
              </p>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setTextNotifConsent(profileData?.text_notifications || false);
                  setIsTextNotifOpen(false);
                }}
                className="px-4 py-2 rounded-lg font-semibold border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTextNotifSubmit}
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {profileData && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow border p-6">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>

            {!isAdmin ? (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{profileData?.full_name || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{profileData?.email || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{profileData?.phone || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium">{profileData?.role_type || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Divisions</p>
                  <p className="font-medium">
                    {(profileData?.project_type_name || []).join(", ") || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Hourly Rate</p>
                  <p className="font-medium">{profileData?.hourly_rate || "-"}</p>
                </div>

              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">First Name</p>
                  <p className="font-medium">{profileData?.firstName || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Last Name</p>
                  <p className="font-medium">{profileData?.lastName || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="font-medium">{profileData?.companyName || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{profileData?.email || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{profileData?.companyPhone || profileData?.phone || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{profileData?.address || "-"}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">New Project Number</p>
              <p className="font-semibold">
                {buildProjectNumber(
                  profileData?.project_number_config?.new_project
                )}
              </p>
            </div>

            {/* 🔹 SERVICE PROJECT NUMBER */}
            <div>
              <p className="text-sm text-gray-500">Service Project Number</p>
              <p className="font-semibold">
                {buildProjectNumber(
                  profileData?.project_number_config?.service_project
                )}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow border p-6 flex flex-col items-center">
            <div className="w-full mb-6">
              <button
                onClick={() => setIsTextNotifOpen(true)}
                className="w-full border rounded-lg py-2 font-medium bg-white hover:bg-gray-50 dark:bg-gray-900"
              >
                Text Notifications
              </button>
            </div>
            <div className="w-full">
              <h3 className="text-lg font-semibold mb-4 text-left">Security</h3>
              <button
                onClick={openEditModal}
                className="w-full mb-3 border rounded-lg py-2 font-medium bg-white hover:bg-gray-50 dark:bg-gray-900"
              >
                Change Password
              </button>
              <button
                onClick={() => { localStorage.clear(); sessionStorage.clear(); navigate("/login") }}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const Input = React.forwardRef(
  ({ label, helper, helperClass, error, ...props }, ref) => (
    <div>
      <label className="label">{label}</label>
      <input
        ref={ref}
        {...props}
        className={`w-full rounded-lg px-4 py-3 border focus:ring-2 focus:outline-none ${error ? "border-red-500" : "border-gray-300"
          }`}
        style={{ "--tw-ring-color": BRAND_BLUE }}
      />
      {helper && (
        <p className={`text-xs mt-1 ${helperClass || "text-gray-400"}`}>
          {helper}
        </p>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";
