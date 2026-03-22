// src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateRoom = lazy(() => import("./pages/CreateRoom"));
const JoinRoom = lazy(() => import("./pages/JoinRoom"));
const RoomPage = lazy(() => import("./pages/RoomPage"));
const MyRooms = lazy(() => import("./pages/myRooms"));
const Features = lazy(() => import("./pages/feature"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));

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
      <main>
        <Suspense fallback={<RouteFallback />}>
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

          <Route
            path="/HowItWorks"
            element={
              <PublicRoute>
                <HowItWorks />
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
            path="/feature"
            element={<Features />}
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
              <ProtectedRoute allowGuest>
                <JoinRoom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute allowGuest>
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
        </Suspense>
      </main>
    </div>
  );
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 76px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#5f6fa3",
        fontSize: "15px",
      }}
    >
      Loading...
    </div>
  );
}
