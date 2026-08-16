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
const Community = lazy(() => import("./pages/Community"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Profile = lazy(() => import("./pages/Profile"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const CohortPage = lazy(() => import("./pages/CohortPage"));
const Discover = lazy(() => import("./pages/Discover"));
const Friends = lazy(() => import("./pages/Friends"));
const Messages = lazy(() => import("./pages/Messages"));
const People = lazy(() => import("./pages/People"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Mastery = lazy(() => import("./pages/Mastery"));
const MyCohorts = lazy(() => import("./pages/MyCohorts"));

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
        color: "var(--text-primary)",
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
              <ProtectedRoute allowGuest>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/feature"
            element={<Features />}
          />

          <Route
            path="/community"
            element={
              <ProtectedRoute allowGuest>
                <Community />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
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

          <Route
            path="/learn"
            element={
              <ProtectedRoute>
                <LearnPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cohorts"
            element={
              <ProtectedRoute>
                <MyCohorts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cohort/:id"
            element={
              <ProtectedRoute>
                <CohortPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/people"
            element={
              <ProtectedRoute>
                <People />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mastery"
            element={
              <ProtectedRoute>
                <Mastery />
              </ProtectedRoute>
            }
          />

          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />

          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages/:userId"
            element={
              <ProtectedRoute>
                <Messages />
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
        color: "var(--text-secondary)",
        fontSize: "15px",
      }}
    >
      Loading...
    </div>
  );
}
