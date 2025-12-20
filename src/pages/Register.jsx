import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error creating account");
        return;
      }

      alert("Account created! Please login.");
      navigate("/login");
    } catch (err) {
      setError("Network error. Backend may be down.");
    }
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-900">
      <form onSubmit={handleRegister} className="bg-gray-800 p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-2xl mb-4 font-semibold text-white">Create Account</h2>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <input
          className="w-full bg-gray-700 text-white border border-gray-600 px-3 py-2 mb-3 rounded"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full bg-gray-700 text-white border border-gray-600 px-3 py-2 mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full bg-gray-700 text-white border border-gray-600 px-3 py-2 mb-3 rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-brand-800 text-white py-2 rounded mb-4 hover:opacity-90">
          Create Account
        </button>

        <p className="text-center text-gray-400">
          Already have an account?{" "}
          <Link className="text-brand-accent font-semibold" to="/login">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
