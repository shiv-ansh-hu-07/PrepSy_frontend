import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

export default function ProtectedRoute({ children, allowGuest = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (allowGuest) {
    return children;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


