import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../services/localApi';
import Logo from '../assets/images/coyle-logo.webp';
import Swal from 'sweetalert2';
import { Eye, EyeOff } from "lucide-react"

const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
});

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const [form, setForm] = useState({
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            return toast.fire({
                icon: "error",
                title: "Invalid or missing reset token",
            });
        }

        if (form.password !== form.confirmPassword) {
            return toast.fire({
                icon: "error",
                title: "Passwords do not match",
            });
        }

        setLoading(true);

        try {
            const { message } = await apiService.resetPassword({
                token,
                password: form.password,
            });

            toast.fire({
                icon: "success",
                title: message || "Password reset successful",
            });

            setTimeout(() => navigate("/login"), 2500);
        } catch (err) {
            toast.fire({
                icon: "error",
                title:
                    err?.response?.data?.message ||
                    "Reset password failed",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-blue-700/80 px-4 sm:px-6 lg:px-8 login-page overflow-hidden">
            <div className="max-w-md w-full space-y-8 z-10">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="bg-white p-3 rounded">
                            <img src={Logo} className="w-48 rounded-lg" />
                        </div>
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-white">
                        Reset Password
                    </h2>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} onKeyDown={(e) => {
                            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                                e.preventDefault();
                            }
                        }} className="space-y-6">
                            <div>
                                <Label className="mb-2 block">New Password</Label>

                                <div className="relative">
                                    <Input
                                        type={showNewPassword ? "text" : "password"}
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                        className="pr-10"
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute inset-y-0 right-2 flex items-center h-full px-2 text-gray-400 hover:bg-transparent"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>


                            {/* Confirm Password */}
                            <div>
                                <Label className="mb-2 block">Confirm Password</Label>

                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="pr-10"
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-2 flex items-center h-full px-2 text-gray-400 hover:bg-transparent"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
