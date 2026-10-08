import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import Logo from "../assets/images/pm-logo.png"
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Lock, Mail, User } from "lucide-react";
import { UserService } from "../services/userservice";
import { fetchRolesInSignUp } from "@/services/roleApi";

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role_type: "",
    project_type: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await UserService.create(registerData);
      if (response.token) {
        localStorage.setItem("token", response.token);

        // Store user data including project_type in localStorage
        const userData = {
          full_name: registerData.full_name,
          email: registerData.email,
          role_type: registerData.role_type,
          project_type: registerData.project_type,
          ...response.user // Include any additional user data from the response
        };
        localStorage.setItem("user", JSON.stringify(userData));

        window.location.href = "/";
      }
      else {
        window.location.href = "/login";
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  useEffect(() => {
    fetchRolesInSignUp()
      .then(res => setRoles(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-700/80 py-12 px-4 sm:px-6 lg:px-8 login-page">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-3 bg-white p-3 rounded">
              <img
                src={Logo}
                className="w-48 rounded-lg"
              />
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-white">
            Create your account
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
              }
            }} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>


              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your email"
                  />
                </div>
              </div>


              <div>
                <Label htmlFor="role_type">Role</Label>
                <Select
                  value={formData.role_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, role_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <SelectItem key={role._id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem disabled value="no-roles">
                          No roles available
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>


              <div>
                <Label htmlFor="project_type">Division</Label>
                <Select
                  value={formData.project_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, project_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="division_10">Division 10</SelectItem>
                    <SelectItem value="division_8">Division 8</SelectItem>
                    <SelectItem value="division_32">Division 32</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your password"
                    minLength={6}
                  />
                </div>
              </div>


              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>


              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create account"}
              </Button>


              <div className="text-center">
                <p className="text-sm text-gray-600temp">
                  Already have an account?{" "}
                  <a
                    href="/login"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Sign in
                  </a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}