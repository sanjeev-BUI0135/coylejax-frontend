import { Controller, useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";
import clientService from "../../services/clientAddService";
import { fetchRolesInSignUp } from "@/services/roleApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import toast from "react-hot-toast";
import InputMask from "react-input-mask";
const labelBase = " text-xs md:text-sm  font-medium text-gray-700temp";
const errorText = "text-xs text-red-500 mt-1";

const AddNewClientForm = ({ client = null, loadPage, onSubmit: parentOnSubmit, onCancel }) => {
  const { register, formState: { errors }, reset, watch, control, handleSubmit, setValue, setError } = useForm({
    defaultValues: {
      role_type: "admin",
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
    }
  });
  ;
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [logoPreview, setLogoPreview] = useState(null);
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const originalProjectConfigRef = useRef(null);
  useEffect(() => {
    fetchRolesInSignUp()
      .then(res => setRoles(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!client) { reset(); setLogoPreview(null); originalProjectConfigRef.current = null; return; } Object.keys(client).forEach((key) => {
      if (!["password", "confirmPassword", "logo", "role_type"].includes(key)) { setValue(key, client[key]); }
    });
    if (client.project_number_config) {
      originalProjectConfigRef.current = JSON.stringify(
        client.project_number_config
      );
    }
    if (client.logo) {
      setLogoPreview(client.logo);
      setValue("logo", null);
    }

    if (roles.length > 0 && client.role_type) {
      const matchedRole = roles.find(r => r.name === client.role_type);
      if (matchedRole) {
        setValue("role_type", matchedRole.name);

      }
    }
  },
    [client, roles, setValue, reset]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setValue("logo", file, { shouldDirty: true });
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        project_number_config: JSON.stringify(data.project_number_config),
        logo: data.logo || undefined,
      };
      // if (client && !data.logo?.length) delete data.logo;

      if (client) {
        await clientService.updateClient(client._id, payload);
        toast.success("Client updated successfully!");
      } else {
        await clientService.createClient({ created_by: user.id, ...payload });
        toast.success("Client created successfully!");
      }
      if (loadPage) await loadPage();
      reset();
      setLogoPreview(null);
      if (parentOnSubmit) parentOnSubmit()
    } catch (error) {
      console.error(error);

      // Check backend error message
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Something went wrong. Please try again!";

      if (msg === "New Project Prefix already exists") {
        setError("project_number_config.new_project.prefix", { type: "manual", message: msg });
      } else if (msg === "Service Project Prefix already exists") {
        setError("project_number_config.service_project.prefix", { type: "manual", message: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };
  const watchedProjectConfig = watch("project_number_config");

  const validatePrefix = async (value, type) => {
    if (!value) return;
    try {
      const result = await clientService.checkPrefix(value, type, client?._id || null);
      if (result.exists) {
        const fieldName = type === "new"
          ? "project_number_config.new_project.prefix"
          : "project_number_config.service_project.prefix";
        setError(fieldName, { type: "manual", message: result.message });
      }
    } catch (e) {
      // silently ignore network errors during blur check
    }
  };
  const isProjectNumberChanged = () => {
    if (!client || !originalProjectConfigRef.current || !watchedProjectConfig) {
      return false;
    }

    const currentConfig = JSON.stringify(watchedProjectConfig);
    return currentConfig !== originalProjectConfigRef.current;
  };

  return (
    <div className="max-w-6xl mx-auto md:p-8">
      <div className="table-listrow-divstyle rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-semibold text-gray-800temp mb-6">{client ? "Edit Client" : "Add New Client"}</h2>

        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
          }
        }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <label className={labelBase}>First Name *</label>
            <Input type="text" {...register("firstName", { required: "First name is required" })} />
            {errors.firstName && <p className={errorText}>{errors.firstName.message}</p>}
          </div>

          <div className="flex flex-col">
            <label className={labelBase}>Last Name *</label>
            <Input type="text" {...register("lastName", { required: "Last name is required" })} />
            {errors.lastName && <p className={errorText}>{errors.lastName.message}</p>}
          </div>

          <div className="flex flex-col">
            <label className={labelBase}>Email Address *</label>
            <Input type="email" {...register("email", { required: "Email is required" })} />
            {errors.email && <p className={errorText}>{errors.email.message}</p>}
          </div>

          <div className="flex flex-col">
            <label className={labelBase}>Company Name *</label>
            <Input type="text" {...register("companyName", { required: "Company name is required" })} />
            {errors.companyName && <p className={errorText}>{errors.companyName.message}</p>}
          </div>

          {(
            <div className="flex flex-col">
              <label className={labelBase}>Password *</label>
              <Input
                type="password"
                {...register("password", { required: !client?._id ? "Password is required" : false })}
              />
              {errors.password && <p className={errorText}>{errors.password.message}</p>}
            </div>
          )}

          {(
            <div className="flex flex-col">
              <label className={labelBase}>Confirm Password *</label>
              <Input
                type="password"
                {...register("confirmPassword", {
                  validate: value => value === watch("password") || "Passwords do not match",
                })}
              />
              {errors.confirmPassword && <p className={errorText}>{errors.confirmPassword.message}</p>}
            </div>
          )}


          <div className="flex flex-col md:col-span-2">
            <label className={labelBase}>Company Address *</label>
            <Input type="text" {...register("address", { required: "Company address is required" })} />
            {errors.address && <p className={errorText}>{errors.address.message}</p>}
          </div>

          <div className="flex flex-col">
            <label className={labelBase}>Company Phone *</label>
            <Controller
              name="companyPhone"
              control={control}
              rules={{
                required: "Phone is required",
                pattern: {
                  value: /^[0-9() -]*$/,
                  message: "Enter valid phone number",
                },
              }}
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

            {errors.companyPhone && (
              <p className={errorText}>{errors.companyPhone.message}</p>
            )}
          </div>

          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* NEW PROJECT */}
            <div className="border rounded-lg p-4 bg-white">
              <h4 className={labelBase}>New Project Number</h4>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelBase}>Prefix</label>
                  <Input
                    {...register("project_number_config.new_project.prefix", { required: "Prefix is required" })}
                    onChange={(e) =>
                      setValue(
                        "project_number_config.new_project.prefix",
                        e.target.value.toUpperCase()
                      )
                    }
                    onBlur={(e) => validatePrefix(e.target.value.toUpperCase(), "new")}
                  />
                  {errors?.project_number_config?.new_project?.prefix && (
                    <p className={errorText}>
                      {errors.project_number_config.new_project.prefix.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelBase}>Year (YY)</label>
                  <Input
                    maxLength={2}
                    {...register("project_number_config.new_project.year", { required: "Year is required" })}
                  />
                  {errors?.project_number_config?.new_project?.year && (
                    <p className={errorText}>
                      {errors.project_number_config.new_project.year.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelBase}>Start No</label>
                  <Input
                    type="number"
                    min={1}
                    {...register("project_number_config.new_project.start_number", { required: "Start number is required" })}
                  />
                  {errors?.project_number_config?.new_project?.start_number && (
                    <p className={errorText}>
                      {errors.project_number_config.new_project.start_number.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SERVICE PROJECT */}
            <div className="border rounded-lg p-4 bg-white">
              <h4 className={labelBase}>Service Project Number</h4>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelBase}>Prefix</label>
                  <Input
                    {...register("project_number_config.service_project.prefix", { required: "Prefix is required" })}
                    onChange={(e) =>
                      setValue(
                        "project_number_config.service_project.prefix",
                        e.target.value.toUpperCase()
                      )
                    }
                    onBlur={(e) => validatePrefix(e.target.value.toUpperCase(), "service")}
                  />
                  {errors?.project_number_config?.service_project?.prefix && (
                    <p className={errorText}>
                      {errors.project_number_config.service_project.prefix.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelBase}>Year (YY)</label>
                  <Input
                    maxLength={2}
                    {...register("project_number_config.service_project.year", { required: "Year is required" })}
                  />
                  {errors?.project_number_config?.service_project?.year && (
                    <p className={errorText}>
                      {errors.project_number_config.service_project.year.message}
                    </p>)}
                </div>

                <div>
                  <label className={labelBase}>Start No</label>
                  <Input
                    type="number"
                    min={1}
                    {...register("project_number_config.service_project.start_number", { required: "Start number is required" })}
                  />
                  {errors?.project_number_config?.service_project?.start_number && (
                    <p className={errorText}>
                      {errors.project_number_config.service_project.start_number.message}
                    </p>)}
                </div>

              </div>
            </div>
            {client && isProjectNumberChanged() && (
              <div className="md:col-span-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                ⚠️ <strong>Note:</strong> Project numbers for existing projects will remain unchanged.
                The updated sequence will apply only to newly created projects.
              </div>
            )}
          </div>
          <Controller
            name="timezone"
            control={control}
            rules={{ required: "Timezone is required" }}
            render={({ field }) => (
              <div className="flex flex-col">
                <label className={labelBase}>Timezone *</label>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={` !px-3`}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC-05:00">(UTC-05:00) Eastern Time</SelectItem>
                    <SelectItem value="UTC+05:30">(UTC+05:30) India Standard Time</SelectItem>
                  </SelectContent>
                </Select>
                {errors.timezone && <p className={errorText}>{errors.timezone.message}</p>}
              </div>
            )}
          />

          <Controller
            name="status"
            control={control}
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <div className="flex flex-col">
                <label className={labelBase}>Status *</label>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={` !px-3`}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className={errorText}>{errors.status.message}</p>}
              </div>
            )}
          />

          <div className="flex flex-col md:col-span-3">
            <label className={labelBase}>Company Picture {client ? "(leave blank to keep current)" : "*"}</label>
            <Input type="file" className="mt-1 text-sm" accept="image/*" onChange={handleLogoChange} />
            {logoPreview && (
              <img
                src={
                  logoPreview
                    ? logoPreview.startsWith("blob:")
                      ? logoPreview
                      : import.meta.env.VITE_IMG + logoPreview
                    : null
                }
                alt="Logo Preview"
                className="mt-2 w-32 h-32 object-cover rounded-lg border"
              />
            )}
            {errors.logo && <p className={errorText}>{errors.logo.message}</p>}
          </div>

          <div className="md:col-span-3 flex gap-4 mt-4">
            <Button
              type="submit"
              className="flex-1  bg-blue-600 py-3 text-white font-semibold shadow-lg hover:bg-blue-700 transition"
            >
              {loading ? "Saving…" : client ? "Update Client" : "Add Client"}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1 py-3">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewClientForm;
