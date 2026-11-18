
import { useEffect, useState } from "react";
import {
  Database,
  Users,
  UserRound,
  Activity,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ScrollText,
} from "lucide-react";

import { apiFetch } from "./api";

// Convert UTC timestamps to Indian Standard Time
function formatTimestamp(timestamp) {
  if (!timestamp) return "—";

  let value = String(timestamp).trim().replace(" ", "T");

  // SQLite CURRENT_TIMESTAMP is stored in UTC
  if (!/[Zz]$|[+-]\d{2}:\d{2}$/.test(value)) {
    value += "Z";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

const severityColors = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
  Info: "bg-blue-100 text-blue-700",
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logSummary, setLogSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch protected dashboard data
  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all([
        apiFetch("/api/database/summary"),
        apiFetch("/api/logs?limit=5"),
        apiFetch("/api/logs/summary"),
      ]);

      if (responses.some((response) => !response.ok)) {
        throw new Error("Unable to load dashboard data");
      }

      const [databaseData, logsData, statsData] =
        await Promise.all(
          responses.map((response) => response.json())
        );

      setSummary(databaseData);

      setLogs(
        Array.isArray(logsData)
          ? logsData
          : Array.isArray(logsData?.logs)
          ? logsData.logs
          : []
      );

      setLogSummary(statsData);
    } catch (err) {
      setError(
        err.message || "Unable to connect to backend"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Dashboard summary cards
  const cards = [
    {
      title: "Database Tables",
      value: summary?.tables ?? 0,
      icon: Database,
      color: "text-blue-600",
    },
    {
      title: "Customers",
      value: summary?.customers ?? 0,
      icon: Users,
      color: "text-indigo-600",
    },
    {
      title: "Employees",
      value: summary?.employees ?? 0,
      icon: UserRound,
      color: "text-purple-600",
    },
    {
      title: "Audit Events",
      value: summary?.audit_events ?? 0,
      icon: Activity,
      color: "text-green-600",
    },
  ];

  const highRisk = logSummary
    ? Number(
        logSummary.high_risk_events ??
        logSummary.high_risk ??
        0
      )
    : 0;

  const successful = logSummary
    ? Number(
        logSummary.successful_events ??
        logSummary.success ??
        0
      )
    : 0;

  return (
    <div className="space-y-6">

      {/* Dashboard Header */}
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Security Dashboard
          </h2>

          <p className="text-slate-500 mt-2">
            Monitor your database security and privacy activities.
          </p>

          <p className="text-xs text-blue-600 mt-2">
            Connected to SQLite via FastAPI
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600
                     text-white px-4 py-2 rounded-xl
                     hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-50 border border-red-200
                     text-red-700 p-4 rounded-xl"
          role="alert"
        >
          {error}. Check that FastAPI is running and
          your session is valid.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2
                      xl:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white border border-slate-200
                         rounded-2xl p-6 shadow-sm"
            >
              <Icon className={card.color} size={23} />

              <p className="text-sm text-slate-500 mt-4">
                {card.title}
              </p>

              <h3
                className="text-3xl font-bold mt-2
                           text-slate-800"
              >
                {loading && !summary ? "..." : card.value}
              </h3>
            </div>
          );
        })}
      </div>

      {/* Risk and Success Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* High Risk Events */}
        <div
          className="bg-white rounded-2xl border
                     border-slate-200 p-6"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-500" />

            <h3 className="font-semibold">
              High Risk Events
            </h3>
          </div>

          <p className="text-3xl font-bold mt-5">
            {highRisk}
          </p>

          <p className="text-sm text-slate-500 mt-2">
            High and critical severity audit events
          </p>
        </div>

        {/* Successful Operations */}
        <div
          className="bg-white rounded-2xl border
                     border-slate-200 p-6"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-green-600" />

            <h3 className="font-semibold">
              Successful Operations
            </h3>
          </div>

          <p className="text-3xl font-bold mt-5">
            {successful}
          </p>

          <p className="text-sm text-slate-500 mt-2">
            Successfully completed security activities
          </p>
        </div>
      </div>

      {/* Recent Security Activity */}
      <div
        className="bg-white rounded-2xl border
                   border-slate-200 p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-5">
          <ScrollText className="text-blue-600" />

          <h3 className="text-lg font-semibold">
            Recent Security Activity
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">

            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Timestamp (IST)</th>
                <th className="p-4">Action</th>
                <th className="p-4">Details</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-slate-100
                             hover:bg-slate-50"
                >
                  {/* IST Timestamp */}
                  <td
                    className="p-4 whitespace-nowrap
                               text-slate-600"
                  >
                    {formatTimestamp(log.timestamp)}
                  </td>

                  {/* Action */}
                  <td className="p-4 font-medium">
                    {log.action}
                  </td>

                  {/* Details */}
                  <td className="p-4 text-slate-600">
                    {log.details}
                  </td>

                  {/* Severity */}
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full
                        text-xs font-semibold ${
                          severityColors[log.severity] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                    >
                      {log.severity}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full
                        text-xs font-semibold ${
                          String(log.status).toLowerCase() ===
                          "success"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && logs.length === 0 && (
            <p className="text-center text-slate-400 py-8">
              No security activity recorded yet.
            </p>
          )}

          {loading && logs.length === 0 && (
            <p className="text-center text-slate-400 py-8">
              Loading recent activity...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
