"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/auth/login", { method: "POST", body: { email, password } });
      router.push("/inquiries");
    } catch (err) {
      setError(err.status === 401 ? "Email or password is incorrect." : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="font-semibold text-gray-900 text-center">
            Inquiry Management System
          </span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Staff sign in</h1>
            <p className="text-sm text-gray-500 mt-1">
              Use your work account to see and handle customer inquiries.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-100 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <label className="block text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-normal"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Password
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-3 pr-16 py-2 text-gray-900 font-normal"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs text-gray-600 hover:text-gray-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 rounded-lg disabled:opacity-60 transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}