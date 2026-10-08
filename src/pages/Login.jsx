import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowRight, Building2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import apiService from '../services/localApi';
import { useNavigate } from 'react-router-dom';
import Logo from "../assets/images/coyle-logo.webp";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils/index.ts";

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiService.login(formData);

      localStorage.setItem("token", response.token);
      localStorage.setItem(
        "user",
        JSON.stringify(response.user || response.client)
      );
      window.dispatchEvent(new Event("userUpdated"));

      const user = JSON.parse(localStorage.getItem("user"));

      if (user?.role_type === "Superadmin") {
        navigate("/super-admin/dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please try again.";

      setError(errorMessage);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark";

    document.documentElement.classList.remove("dark");

    return () => {
      if (isDark) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);



  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="h-screen flex items-center justify-center bg-blue-700/80 py-12 px-4 sm:px-6 lg:px-8 login-page overflow-hidden">
      <div className="max-w-md w-full space-y-8 z-10">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-3 bg-white p-3 rounded">
              <img src={Logo} className='w-48 rounded-lg' />
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">
            Sign in to your account
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-2 flex items-center h-full px-2 text-gray-400 hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-2 flex justify-end">
                  <Link to={createPageUrl('ForgotPassword')}>
                    <a className="text-sm font-medium text-[rgb(13_85_170)] hover:underline">
                      Forgot password?
                    </a>
                  </Link>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            {/* <p className="mt-4 text-center text-sm text-gray-600temp">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:underline font-medium"
              >
                Signup here
              </button>
            </p> */}

            {/* Terms & Privacy */}
            <p className="mt-5 text-center text-xs text-gray-500 leading-relaxed">
              By continuing, you agree to our{' '}
              <Link
                to="/terms"
                id="login-terms-link"
                className="font-semibold text-[rgb(13_85_170)] underline underline-offset-2 hover:text-blue-800 transition-colors"
              >
                Terms &amp; Conditions
              </Link>
              ,{' '}
              <Link
                to="/privacy"
                id="login-privacy-link"
                className="font-semibold text-[rgb(13_85_170)] underline underline-offset-2 hover:text-blue-800 transition-colors"
              >
                Privacy Policy
              </Link>
              , and{' '}
              <Link
                to="/sms-policy"
                id="login-sms-link"
                className="font-semibold text-[rgb(13_85_170)] underline underline-offset-2 hover:text-blue-800 transition-colors"
              >
                SMS Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}