import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        "Invalid email or password"
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-20">
      <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-lg">

        <h2 className="text-2xl font-semibold text-white">
          Sign in to HomesWork
        </h2>

        <form onSubmit={handleLogin} className="mt-6 space-y-5">

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div>
            <label className="block text-sm text-gray-300">
              Email
            </label>
            <input
              className="mt-1 w-full rounded-md bg-gray-800 border border-gray-700 p-2 text-white"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">
              Password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-md bg-gray-800 border border-gray-700 p-2 text-white"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-md bg-brand-800 text-white font-medium hover:opacity-90"
          >
            Sign in
          </button>

          <div className="text-sm text-gray-400 text-center">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="text-brand-accent hover:underline"
            >
              Sign up
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}
