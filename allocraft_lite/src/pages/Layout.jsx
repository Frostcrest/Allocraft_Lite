import React, { useEffect, useState } from "react";
import { isDevBackend, API_BASE } from "@/api/fastapiClient";
import BrandedLoader from "@/components/ui/BrandedLoader";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  RotateCcw,
  PieChart
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import allocraftLogo from "@/assets/allocraft_logo-transparent-preview.png";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Stocks",
    url: createPageUrl("Stocks"),
    icon: TrendingUp,
  },
  {
    title: "Options",
    url: createPageUrl("Options"),
    icon: Target,
  },
  {
    title: "Wheels",
    url: createPageUrl("Wheels"),
    icon: RotateCcw,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);

  // Show loader immediately after login until initial user data loads or a fallback timeout
  useEffect(() => {
    const shouldShow = sessionStorage.getItem('allocraft_post_login_loading') === '1';
    if (shouldShow) {
      setShowLoader(true);
      // Fallback: hide after a few seconds even if user fetch fails
      const t = setTimeout(() => setShowLoader(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Sidebar className="border-r border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="border-b border-slate-200/60 p-6">
            <div className="flex items-center gap-6">
              {/* Large logo, no tagline */}
              <img
                src={allocraftLogo}
                alt="Allocraft Logo"
                className="w-32 h-32 object-contain"
              />
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Portfolio
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`group transition-all duration-200 rounded-xl ${location.pathname === item.url
                          ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg'
                          : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                          }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className={`w-5 h-5 transition-colors ${location.pathname === item.url ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                            }`} />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4 md:hidden">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-slate-900">Allocraft</h1>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              {/*
                  Beginner note:
                  This pill shows up only when the app detects you're talking to a locally
                  running backend (http://localhost:8000). It's a gentle reminder that data
                  and auth are local and safe to experiment with.
                */}
              {isDevBackend() && (
                <span title={`DEV backend: ${API_BASE}`} className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  DEV API
                </span>
              )}
              <UserMenu onUserLoaded={() => {
                try { sessionStorage.removeItem('allocraft_post_login_loading'); } catch { }
                setTimeout(() => setShowLoader(false), 150);
              }} />
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      <BrandedLoader show={showLoader} />
    </SidebarProvider>
  );
}

function UserMenu({ onUserLoaded }) {
  const [username, setUsername] = useState("");
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('allocraft_token') : null;
  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const me = await res.json();
          setUsername(me?.username || "");
          // Notify parent that initial user data has loaded
          if (typeof onUserLoaded === 'function') onUserLoaded();
        }
      } catch { }
    }
    load();
  }, [token]);
  function doLogout() {
    try { sessionStorage.removeItem('allocraft_token'); } catch { }
    window.location.href = '/login';
  }
  return (
    <div className="flex items-center gap-3 ml-auto">
      <Link to="/Profile" className="text-sm text-slate-700 hover:underline flex items-center gap-2">
        <span className="inline-block w-6 h-6 rounded-full bg-slate-900 text-white text-center leading-6">
          {username ? username[0].toUpperCase() : 'U'}
        </span>
        <span>{username || 'Profile'}</span>
      </Link>
      {token && (
        <button onClick={doLogout} className="text-sm px-3 py-1 bg-slate-900 text-white rounded">Logout</button>
      )}
    </div>
  );
}
