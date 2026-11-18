
import { useState } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const endpoint = isRegister
        ? "/api/auth/register"
        : "/api/auth/login";

      const payload = isRegister
        ? {
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : {
            username: form.username.trim(),
            password: form.password,
          };

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
            ? data.detail
                .map((item) => item.msg)
                .join(", ")
            : "Authentication failed. Please try again.";

        throw new Error(message);
      }

      if (isRegister) {
        setSuccess(
          "Account created successfully! Please log in."
        );

        setIsRegister(false);
        setForm((previous) => ({
          ...previous,
          password: "",
        }));
      } else {
        if (!data.access_token || !data.user) {
          throw new Error("Invalid login response from server.");
        }

        onLogin(data.access_token, data.user);
      }
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister((previous) => !previous);
    setError("");
    setSuccess("");
    setShowPassword(false);
    setForm((previous) => ({
      ...previous,
      password: "",
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-100">
            <ShieldCheck
              size={34}
              className="text-white"
            />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mt-5">
            PrivacyShield
          </h1>

          <p className="text-slate-500 mt-2 text-sm">
            Database Security & Privacy Platform
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-800">
              {isRegister
                ? "Create Account"
                : "Welcome Back"}
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              {isRegister
                ? "Register to access your secure workspace."
                : "Sign in to access your security dashboard."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-5"
            >
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div
              role="status"
              className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl mb-5"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Username
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="username"
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  minLength={isRegister ? 3 : undefined}
                  maxLength={isRegister ? 40 : undefined}
                  autoComplete="username"
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email - Registration Only */}
            {isRegister && (
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={isRegister ? 12 : undefined}
                  maxLength={isRegister ? 128 : undefined}
                  autoComplete={
                    isRegister
                      ? "new-password"
                      : "current-password"
                  }
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              {isRegister && (
                <p className="text-xs text-slate-400 mt-2">
                  Password must contain at least 12 characters.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
            >
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create Account"
                : "Sign In"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Switch Login / Register */}
          <div className="text-center mt-7">
            <p className="text-sm text-slate-500">
              {isRegister
                ? "Already have an account?"
                : "Don't have an account?"}
            </p>

            <button
              type="button"
              onClick={switchMode}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm mt-2"
            >
              {isRegister
                ? "Sign In"
                : "Create an Account"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <LockKeyhole size={14} />
          Protected by PrivacyShield Authentication
        </div>
      </div>
    </div>
  );
}
