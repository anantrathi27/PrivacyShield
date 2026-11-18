
import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Database,
  EyeOff,
  ScrollText,
  Settings,
  Search,
  Bell,
  LockKeyhole,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import Dashboard from "./Dashboard";
import DatabaseScanner from "./DatabaseScanner";
import DataMasking from "./DataMasking";
import ActivityLogs from "./ActivityLogs";
import SettingsPage from "./SettingsPage";
import Login from "./Login";

import { setAccessToken } from "./api";

import "./App.css";

// Sidebar navigation
const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Database Scanner", icon: Database },
  { name: "Data Masking", icon: EyeOff },
  { name: "Activity Logs", icon: ScrollText },
  { name: "Settings", icon: Settings },
];

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Current authenticated user
  const [auth, setAuth] = useState(null);

  // Called after successful login
  const handleLogin = (token, user) => {
    setAccessToken(token);
    setAuth(user);
    setActivePage("Dashboard");
    setSidebarOpen(false);
  };

  // Clear authentication
  const handleLogout = useCallback(() => {
    setAccessToken(null);
    setAuth(null);
    setActivePage("Dashboard");
    setSidebarOpen(false);
  }, []);

  // Automatically log out if JWT expires or becomes invalid
  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };

    window.addEventListener(
      "privacyshield:unauthorized",
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        "privacyshield:unauthorized",
        handleUnauthorized
      );
    };
  }, [handleLogout]);

  // Handle sidebar navigation
  const handleNavigation = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  // Render selected page
  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard />;

      case "Database Scanner":
        return <DatabaseScanner />;

      case "Data Masking":
        return <DataMasking />;

      case "Activity Logs":
        return <ActivityLogs />;

      case "Settings":
        return <SettingsPage />;

      default:
        return <Dashboard />;
    }
  };

  // Show login page until user authenticates
  if (!auth) {
    return <Login onLogin={handleLogin} />;
  }

  const username = auth.username || "User";

  const initials = username
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-slate-200
          flex flex-col transition-transform duration-300
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >

        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShieldCheck
                size={23}
                className="text-white"
              />
            </div>

            <div>
              <h1 className="font-bold text-lg text-slate-900">
                PrivacyShield
              </h1>

              <p className="text-xs text-slate-400">
                Security Platform
              </p>
            </div>
          </div>

          {/* Close Sidebar */}
          <button
            type="button"
            className="lg:hidden text-slate-500"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">

          <p className="text-xs uppercase tracking-wider text-slate-400 mb-5 px-3">
            Workspace
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = activePage === item.name;

              return (
                <button
                  type="button"
                  key={item.name}
                  onClick={() =>
                    handleNavigation(item.name)
                  }
                  aria-current={
                    selected ? "page" : undefined
                  }
                  className={`
                    w-full flex items-center gap-3
                    px-4 py-3 rounded-xl text-sm
                    font-medium transition-colors
                    ${
                      selected
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }
                  `}
                >
                  <Icon size={18} />

                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-3">

          {/* Security Card */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <LockKeyhole
              size={21}
              className="text-blue-600 mb-3"
            />

            <h3 className="font-semibold text-sm text-slate-800">
              Privacy First
            </h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Protect sensitive information with smarter security.
            </p>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-medium text-sm transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-5 lg:px-8 shrink-0">

          {/* Page Title */}
          <div className="flex items-center gap-4">

            {/* Mobile Menu */}
            <button
              type="button"
              className="lg:hidden text-slate-600"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-xs text-slate-400">
                Workspace / {activePage}
              </p>

              <h2 className="font-semibold text-slate-800 mt-1">
                {activePage}
              </h2>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-5">

            {/* Search Activity Logs */}
            <button
              type="button"
              className="text-slate-400 hover:text-blue-600"
              title="Search activity logs"
              onClick={() =>
                handleNavigation("Activity Logs")
              }
              aria-label="Search activity logs"
            >
              <Search size={19} />
            </button>

            {/* Notifications */}
            <button
              type="button"
              className="text-slate-400 hover:text-blue-600"
              title="Activity notifications"
              onClick={() =>
                handleNavigation("Activity Logs")
              }
              aria-label="View activity notifications"
            >
              <Bell size={19} />
            </button>

            {/* Logged-in User */}
            <div
              className="flex items-center gap-2"
              title={`Logged in as ${username}`}
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                {initials}
              </div>

              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800">
                  {username}
                </p>

                <p className="text-xs text-slate-400">
                  Signed in
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
