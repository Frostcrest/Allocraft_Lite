import React, { useState, useEffect } from "react";
import { useDashboardData } from "@/api/enhancedClient";
import { API_BASE } from "@/api/fastapiClient";
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
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const { stocks, options, wheels, snapshot, isLoading, error } = useDashboardData();

  const calculateTotalValue = () => {
    let total = 0;
    // Stocks: shares * current_price
    stocks.forEach((stock) => {
      if (stock.status === "Open") {
        const price = typeof stock.current_price === "number" ? stock.current_price : stock.cost_basis;
        total += (stock.shares || 0) * (price || 0);
      }
    });
    // Options: current_price * contracts * 100
    options.forEach((option) => {
      if (option.status === "Open") {
        const px = typeof option.market_price_per_contract === "number" ? option.market_price_per_contract : option.cost_basis;
        total += (option.contracts || 0) * (px || 0) * 100;
      }
    });
    return total;
  };

  const calculateTotalPL = () => {
    let totalPL = 0;
    // Stocks: (shares * market_price) - (shares * cost_basis)
    stocks.forEach((stock) => {
      if (stock.status === "Open" && typeof stock.current_price === "number") {
        const marketValue = (stock.shares || 0) * stock.current_price;
        const costValue = (stock.shares || 0) * (stock.cost_basis || 0);
        totalPL += marketValue - costValue;
      }
    });
    // Options: (current_price * contracts * 100) - (cost_basis * contracts * 100)
    options.forEach((option) => {
      if (option.status === "Open" && typeof option.market_price_per_contract === "number") {
        const netLiquidity = (option.contracts || 0) * option.market_price_per_contract * 100;
        const totalCost = (option.contracts || 0) * (option.cost_basis || 0) * 100;
        totalPL += netLiquidity - totalCost;
      }
    });
    return totalPL;
  };

  const assetTypes = [
    {
      name: "Stocks",
      count: stocks.filter((s) => s.status === "Open").length,
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
      link: createPageUrl("Stocks"),
    },
    {
      name: "Options",
      count: options.filter((o) => o.status === "Open").length,
      icon: Target,
      gradient: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      link: createPageUrl("Options"),
    },
    {
      name: "Wheels",
      count: (snapshot?.wheels?.open_tickers ?? new Set(wheels.filter((c) => (c.status || "Open") === "Open").map((c) => c.ticker)).size),
      icon: RotateCcw,
      gradient: "bg-gradient-to-br from-orange-500 to-orange-600",
      link: createPageUrl("Wheels"),
    },
  ];

  // Helper functions to get total value for stocks and options
  const getStocksTotalValue = () => {
    return stocks
      .filter((s) => s.status === "Open")
      .reduce((sum, s) => sum + (s.shares || 0) * (typeof s.current_price === "number" ? s.current_price : (s.cost_basis || 0)), 0);
  };

  const getOptionsTotalValue = () => {
    return options
      .filter((o) => o.status === "Open")
      .reduce((sum, o) => sum + (o.contracts || 0) * (typeof o.market_price_per_contract === "number" ? o.market_price_per_contract : (o.cost_basis || 0)) * 100, 0);
  };

  if (isLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-600">{error.message || 'Failed to load portfolio data'}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = snapshot?.portfolio?.total_value ?? calculateTotalValue();
  const totalPL = snapshot?.portfolio?.total_pl ?? calculateTotalPL();
  const investedBasis = snapshot?.stocks?.invested_basis !== undefined || snapshot?.options?.invested_basis !== undefined
    ? (snapshot?.stocks?.invested_basis || 0) + (snapshot?.options?.invested_basis || 0)
    : (
      stocks.filter(s => s.status === "Open").reduce((sum, s) => sum + (s.shares || 0) * (s.cost_basis || 0), 0) +
      options.filter(o => o.status === "Open").reduce((sum, o) => sum + (o.contracts || 0) * (o.cost_basis || 0) * 100, 0)
    );
  const plPct = investedBasis > 0 ? ((totalPL / investedBasis) * 100) : null;

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
            change={plPct === null ? "—" : `${plPct >= 0 ? "+" : ""}${plPct.toFixed(1)}%`}
            changeType={totalPL >= 0 ? "positive" : "negative"}
            icon={Activity}
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Active Positions"
            value={snapshot?.portfolio?.active_positions ?? (
              stocks.filter((s) => s.status === "Open").length +
              options.filter((o) => o.status === "Open").length +
              new Set(wheels.filter((c) => (c.status || "Open") === "Open").map((c) => c.ticker)).size
            )}
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
              totalValue = snapshot?.stocks?.total_value ?? getStocksTotalValue();
            } else if (asset.name === "Options") {
              totalValue = snapshot?.options?.total_value ?? getOptionsTotalValue();
            } else if (asset.name === "Wheels") {
              wheelsCollateral = true; // TODO: replace with real collateral metric from backend
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
                        <span className="font-medium">{formatCurrency(snapshot?.wheels?.total_collateral || 0)}</span>
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
              {[...stocks.slice(0, 3), ...options.slice(0, 2)].map(
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
              {stocks.length === 0 &&
                options.length === 0 && (
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
        {/* <AdminUsers /> */}
      </div>
    </div>
  );
}

/*
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });
  const base = API_BASE;

  async function load() {
    setError("");
    try {
      const token = sessionStorage.getItem("allocraft_token");
      const res = await fetch(`${base}/users/`, {
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
    const res = await fetch(`${base}/users/${u.id}`, {
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
        {/* Add User */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser(p => ({ ...p, username: e.target.value }))} />
          <input className="border rounded px-2 py-1" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} />
          <input className="border rounded px-2 py-1" type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} />
          <button className="px-3 py-1 bg-slate-900 text-white rounded" onClick={async () => {
            try {
              const token = sessionStorage.getItem("allocraft_token");
              const res = await fetch(`${base}/users/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(newUser) });
              if (!res.ok) throw new Error(await res.text());
              setNewUser({ username: "", email: "", password: "" });
              load();
            } catch (e) { setError(String(e)); }
          }}>Add User</button>
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
      {/* Add User */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="border rounded px-2 py-1" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser(p => ({ ...p, username: e.target.value }))} />
        <input className="border rounded px-2 py-1" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} />
        <input className="border rounded px-2 py-1" type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} />
        <div className="flex items-center text-xs text-slate-500">New users get roles="user" and can be edited below.</div>
        <button className="px-3 py-1 bg-slate-900 text-white rounded" onClick={async () => {
          try {
            const token = sessionStorage.getItem("allocraft_token");
            const res = await fetch(`${base}/users/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(newUser) });
            if (!res.ok) throw new Error(await res.text());
            setNewUser({ username: "", email: "", password: "" });
            load();
          } catch (e) { setError(String(e)); }
        }}>Add User</button>
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