import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import allocraftLogo from "@/assets/allocraft_logo-transparent-preview.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      login(data.access_token, data.user);
      navigate("/");
    } catch (err) {
      setError("Login failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <img
          src={allocraftLogo}
          alt="Allocraft Logo"
          className="w-24 h-24 mb-4 object-contain"
        />
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Sign in to Allocraft
        </h2>
        <p className="text-slate-500 mb-6">Portfolio Tracker</p>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label
              className="block text-slate-700 font-medium mb-1"
              htmlFor="username"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
              autoFocus
            />
          </div>
          <div>
            <label
              className="block text-slate-700 font-medium mb-1"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm rounded bg-red-50 px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 transition-colors"
          >
            Sign In
          </button>
        </form>
        <div className="mt-6 text-sm text-slate-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}