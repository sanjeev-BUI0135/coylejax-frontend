import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import axios from "axios";

const SuperAdminProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: { full_name: "", email: "", password: "" },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE}/users/me`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        setProfile(res.data);
        reset({
          full_name: res.data.full_name || "",
          email: res.data.email || "",
          password: "",
        });
      } catch (err) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const onSubmit = async (data) => {
    try {
      if (!data.password) delete data.password;

      await axios.put(
        `${import.meta.env.VITE_API_BASE}/users/${profile._id}`,
        data,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      toast.success("Profile updated successfully!");
      setProfile({ ...profile, ...data });
      setEditMode(false);
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  if (loading)
    return <div className="p-6 text-gray-600temp">Loading profile...</div>;

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray50-temp text-gray-900temp">
      {/* HEADER */}
      <div className="relative py-16 px-10 shadow-md table-listrow-divstyle">
        <div className="flex items-start gap-4">

          <div className="flex-shrink-0 w-16 h-16 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 text-white flex items-center justify-center text-xl md:text-5xl font-extrabold shadow-lg">
            {initials}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl md:text-4xl font-bold text-blue-700">
              {profile.full_name}
            </h1>

            <p className="capitalize font-semibold text-gray-700temp">
              Role: {profile.role_type}
            </p>

            {!editMode && (
              <Button
                onClick={() => setEditMode(true)}
                className="w-fit text-blue-700 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm px-6 py-2 font-semibold"
              >
                Edit Profile
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* PROFILE FORM */}
      <div className="md:px-10 py-6 md:py-12 max-w-4xl mx-auto space-y-10">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 "
        >
          {/* FULL NAME */}
          <div className="table-listrow-divstyle rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
            <label className="text-gray-700temp font-medium mb-2 block">
              Full Name
            </label>
            {editMode ? (
              <Controller
                name="full_name"
                control={control}
                rules={{ required: "Full name is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      className="table-listrow-divstyle border border-gray-300 focus:border-blue-600 focus:ring-blue-600 text-gray-900temp transition duration-300 rounded-md"
                    />
                    {fieldState.error && (
                      <p className="text-red-500 text-sm mt-1">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            ) : (
              <p className="text-gray-900temp text-lg">{profile.full_name}</p>
            )}
          </div>

          {/* EMAIL */}
          <div className="table-listrow-divstyle rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
            <label className="text-gray-700temp font-medium mb-2 block">Email</label>
            {editMode ? (
              <Controller
                name="email"
                control={control}
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email address",
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      className="table-listrow-divstyle border border-gray-300 focus:border-blue-600 focus:ring-blue-600 text-gray-900temp transition duration-300 rounded-md"
                    />
                    {fieldState.error && (
                      <p className="text-red-500 text-sm mt-1">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            ) : (
              <p className="text-gray-900temp text-lg">{profile.email}</p>
            )}
          </div>

          {/* PASSWORD */}
          {editMode && (
            <div className="md:col-span-2 table-listrow-divstyle rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
              <label className="text-gray-700temp font-medium mb-2 block">
                New Password
              </label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="password"
                    placeholder="Enter new password"
                    className="table-listrow-divstyle border border-gray-300 focus:border-blue-600 focus:ring-blue-600 text-gray-900temp transition duration-300 rounded-md"
                  />
                )}
              />
              <p className="text-gray-500temp text-sm mt-1">
                Leave blank to keep the current password.
              </p>
            </div>
          )}

          {/* SAVE / CANCEL BUTTONS */}
          {editMode && (
            <div className="md:col-span-2 flex space-x-4 mt-4">
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1 font-semibold py-3 rounded-lg shadow-md transition-transform transform hover:scale-105"
              >
                Save Changes
              </Button>
              <Button
                type="button"
                onClick={() => setEditMode(false)}
                className="bg-white border border-gray-300 text-blue-600 flex-1 font-semibold py-3 rounded-lg shadow-sm hover:bg-gray50-temp transition-transform transform hover:scale-105"
              >
                Cancel
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SuperAdminProfile;
