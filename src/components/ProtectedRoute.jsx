import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowGuest = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (allowGuest) {
    return children;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


