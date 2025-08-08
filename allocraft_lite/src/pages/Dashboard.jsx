import React, { useState, useEffect } from "react";
import { fetchFromAPI } from "@/api/fastapiClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TrendingUp,
  Target,
  RotateCcw,
  Plus,
  DollarSign,
  PieChart,
  Activity,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "../components/portfolio/StatCard";
import { formatCurrency } from "@/lib/utils"; // <-- Add this import

export default function Dashboard() {
  const [portfolioData, setPortfolioData] = useState({
    stocks: [],
    options: [],
    wheels: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [stocks, options, wheels] = await Promise.all([
          fetchFromAPI("/stocks/"),
          fetchFromAPI("/options/"),
          fetchFromAPI("/wheels/"),
        ]);
        setPortfolioData({ stocks, options, wheels });
        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const calculateTotalValue = () => {
    let total = 0;
    // Stocks: shares * current_price
    portfolioData.stocks.forEach((stock) => {
      if (stock.current_price && stock.status === "Open") {
        total += stock.shares * stock.current_price;
      }
    });
    // Options: current_price * contracts * 100
    portfolioData.options.forEach((option) => {
      if (option.current_price && option.status === "Open") {
        total += option.contracts * option.current_price * 100;
      }
    });
    return total;
  };

  const calculateTotalPL = () => {
    let totalPL = 0;
    // Stocks: (shares * market_price) - (shares * cost_basis)
    portfolioData.stocks.forEach((stock) => {
      if (stock.market_price && stock.status === "Open") {
        const marketValue = stock.shares * stock.market_price;
        const costValue = stock.shares * stock.cost_basis;
        totalPL += marketValue - costValue;
      }
    });
    // Options: (current_price * contracts * 100) - (cost_basis * contracts * 100)
    portfolioData.options.forEach((option) => {
      if (option.current_price && option.status === "Open") {
        const netLiquidity = option.contracts * option.current_price * 100;
        const totalCost = option.contracts * option.cost_basis * 100;
        totalPL += netLiquidity - totalCost;
      }
    });
    return totalPL;
  };

  const assetTypes = [
    {
      name: "Stocks",
      count: portfolioData.stocks.filter((s) => s.status === "Open").length,
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
      link: createPageUrl("Stocks"),
    },
    {
      name: "Options",
      count: portfolioData.options.filter((o) => o.status === "Open").length,
      icon: Target,
      gradient: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      link: createPageUrl("Options"),
    },
    {
      name: "Wheels",
      count: [
        ...new Set(
          portfolioData.wheels.filter((w) => w.status === "Active").map(
            (w) => w.wheel_id
          )
        ),
      ].length,
      icon: RotateCcw,
      gradient: "bg-gradient-to-br from-orange-500 to-orange-600",
      link: createPageUrl("Wheels"),
    },
  ];

  // Helper functions to get total value for stocks and options
  const getStocksTotalValue = () => {
    return portfolioData.stocks
      .filter((s) => s.status === "Open")
      .reduce((sum, s) => sum + s.shares * s.current_price, 0);
  };

  const getOptionsTotalValue = () => {
    return portfolioData.options
      .filter((o) => o.status === "Open")
      .reduce((sum, o) => sum + o.contracts * o.current_price * 100, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = calculateTotalValue();
  const totalPL = calculateTotalPL();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              Portfolio Dashboard
            </h1>
            <p className="text-slate-600 mt-2">
              Track your investments across all asset classes
            </p>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Portfolio Value"
            value={formatCurrency(totalValue)}
            icon={DollarSign}
            gradient="bg-gradient-to-br from-slate-800 to-slate-900"
          />
          <StatCard
            title="Total P/L"
            value={formatCurrency(totalPL)}
            change={
              totalPL >= 0
                ? "+" +
                ((totalPL / (totalValue - totalPL)) * 100).toFixed(1) +
                "%"
                : ((totalPL / (totalValue - totalPL)) * 100).toFixed(1) + "%"
            }
            changeType={totalPL >= 0 ? "positive" : "negative"}
            icon={Activity}
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Active Positions"
            value={
              portfolioData.stocks.filter((s) => s.status === "Open").length +
              portfolioData.options.filter((o) => o.status === "Open").length +
              [
                ...new Set(
                  portfolioData.wheels.filter((w) => w.status === "Active").map(
                    (w) => w.wheel_id
                  )
                ),
              ].length
            }
            icon={PieChart}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
        </div>

        {/* Asset Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assetTypes.map((asset) => {
            // Add total value for Stocks and Options
            let totalValue = null;
            let wheelsCollateral = null;
            if (asset.name === "Stocks") {
              totalValue = getStocksTotalValue();
            } else if (asset.name === "Options") {
              totalValue = getOptionsTotalValue();
            } else if (asset.name === "Wheels") {
              wheelsCollateral = true; // Placeholder flag
            }

            return (
              <Link key={asset.name} to={asset.link}>
                <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-xl overflow-hidden">
                  <div
                    className={`absolute inset-0 opacity-5 ${asset.gradient}`}
                  />
                  <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${asset.gradient} bg-opacity-10`}>
                        <asset.icon className="w-6 h-6 text-white" /> {/* Make icon white */}
                      </div>
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {asset.name}
                    </h3>
                    <p className="text-2xl font-bold text-slate-800">
                      {asset.count}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Active positions
                    </p>
                    {totalValue !== null && (
                      <p className="text-xs text-slate-400 mt-2">
                        Total value:{" "}
                        <span className="font-medium">
                          {formatCurrency(totalValue)}
                        </span>
                      </p>
                    )}
                    {wheelsCollateral && (
                      <p className="text-xs text-slate-400 mt-2">
                        Total Collateral:{" "}
                        <span className="font-medium">—</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {[...portfolioData.stocks.slice(0, 3), ...portfolioData.options.slice(0, 2)].map(
                (item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.ticker}</p>
                      <p className="text-sm text-slate-500">
                        {item.shares
                          ? `${item.shares} shares`
                          : `${item.contracts} contracts`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(
                          item.shares
                            ? item.shares * item.cost_basis
                            : item.contracts * item.cost_basis * 100
                        )}
                      </p>
                      <p className="text-sm text-slate-500">Cost basis</p>
                    </div>
                  </div>
                )
              )}
              {portfolioData.stocks.length === 0 &&
                portfolioData.options.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-500">
                      No positions yet. Start by adding your first investment!
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Admin: Users management */}
        <AdminUsers />
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  async function load() {
    setError("");
    try {
      const token = sessionStorage.getItem("allocraft_token");
      const res = await fetch(`${API_BASE}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(u) {
    const token = sessionStorage.getItem("allocraft_token");
    const body = {
      username: u.username,
      email: u.email,
      roles: u.roles,
      is_active: u.is_active,
      ...(u._password ? { password: u._password } : {}),
    };
    const res = await fetch(`${API_BASE}/users/${u.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      alert(await res.text());
    } else {
      load();
    }
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl border-0 shadow-lg rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Admin: Users</h2>
          <button className="text-sm underline" onClick={load}>
            Refresh
          </button>
        </div>
        <div className="text-slate-500 text-sm mt-2">
          {error ? error : "No users found or insufficient permissions."}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl border-0 shadow-lg rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Admin: Users</h2>
        <button className="text-sm underline" onClick={load}>
          Refresh
        </button>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      <div className="overflow-auto mt-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">ID</th>
              <th className="px-2 py-1">Username</th>
              <th className="px-2 py-1">Email</th>
              <th className="px-2 py-1">Roles</th>
              <th className="px-2 py-1">Active</th>
              <th className="px-2 py-1">New Password</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-2 py-1">{u.id}</td>
                <td className="px-2 py-1">
                  <input
                    className="border rounded px-2 py-1"
                    defaultValue={u.username}
                    onChange={(e) => (u.username = e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="border rounded px-2 py-1"
                    defaultValue={u.email}
                    onChange={(e) => (u.email = e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="border rounded px-2 py-1"
                    defaultValue={u.roles}
                    onChange={(e) => (u.roles = e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="checkbox"
                    defaultChecked={u.is_active}
                    onChange={(e) => (u.is_active = e.target.checked)}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="password"
                    placeholder="••••••"
                    className="border rounded px-2 py-1"
                    onChange={(e) => (u._password = e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <button
                    className="px-3 py-1 bg-slate-900 text-white rounded"
                    onClick={() => save(u)}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}