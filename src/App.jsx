import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import RoomPage from "./pages/RoomPage";
import MyRooms from "./pages/myRooms";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-b from-brand-900 to-brand-800 text-gray-100">

      {/* Navbar ALWAYS visible */}
      <Navbar />

      <main className={user ? "pt-20 flex justify-center" : "flex justify-center"}>
        <div className="w-full max-w-7xl px-6">
          <Routes>

            {/* PUBLIC */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <Home />
                </PublicRoute>
              }
            />

            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* PROTECTED */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/create-room"
              element={
                <ProtectedRoute>
                  <CreateRoom />
                </ProtectedRoute>
              }
            />

            <Route
              path="/join-room"
              element={
                <ProtectedRoute>
                  <JoinRoom />
                </ProtectedRoute>
              }
            />

            <Route
              path="/room/:roomId"
              element={
                <ProtectedRoute>
                  <RoomPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/myRooms"
              element={
                <ProtectedRoute>
                  <MyRooms />
                </ProtectedRoute>
              }
            />

          </Routes>
        </div>
      </main>
    </div>
  );
}
