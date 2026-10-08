import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Mail } from 'lucide-react';
import apiService from '../services/localApi';
import Logo from '../assets/images/coyle-logo.webp';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/index.ts';
import Swal from 'sweetalert2';

const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
});

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);

        try {
            const { message } = await apiService.forgotPassword({ email });

            toast.fire({
                icon: "success",
                title: message,
            });

            setTimeout(() => {
                navigate(createPageUrl("Login"), {
                    state: { success: message },
                });
            }, 2500);
        } catch (err) {
            toast.fire({
                icon: "error",
                title: err?.message || "Something went wrong",
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
                        Forgot Password
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
                                <Label htmlFor="email">Email address</Label>
                                <div className="relative mt-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? "Sending link..." : "Send Reset Link"}
                            </Button>

                            <div className="flex justify-end">
                                <Link
                                    to={createPageUrl("Login")}
                                    className="text-sm font-medium text-[rgb(13_85_170)] hover:underline"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
