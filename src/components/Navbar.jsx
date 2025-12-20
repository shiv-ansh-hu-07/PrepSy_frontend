// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="w-full bg-brand-800/85 backdrop-blur-sm border-b border-gray-800 fixed top-0 z-50">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-7xl px-6 md:px-12 py-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-linear-to-br from-brand-900 to-brand-700 flex items-center justify-center text-white font-semibold">
              PS
            </div>
            <Link to="/" className="text-2xl font-semibold text-white">
              PrepSy
            </Link>
          </div>

          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-gray-300 hover:text-white">Features</a>
            <a href="/dashboard" className="text-gray-300 hover:text-white">Home</a>

            {!loading && !user && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-gray-200"
              >
                Sign in
              </Link>
            )}

            {!loading && user && (
              <div className="flex items-center gap-4">
                <span className="text-gray-200">Hi, {user.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
}
