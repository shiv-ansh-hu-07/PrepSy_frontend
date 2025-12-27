// src/App.jsx
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

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(
            900px 500px at 70% 40%,
            rgba(138,155,214,0.18),
            transparent 60%
          ),
          linear-gradient(
            to bottom,
            #F4F5FA 0%,
            #EEF0F8 45%,
            #F4F5FA 100%
          )
        `,
        color: "#2f3b63",
      }}
    >
      {/* Navbar always visible */}
      <Navbar />

      {/* Page content */}
      <main >
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
      </main>
    </div>
  );
}
