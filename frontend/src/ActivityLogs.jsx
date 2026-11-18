
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Download,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import { apiFetch } from "./api";
const PAGE_SIZE = 10;


function formatTimestamp(timestamp) {
  if (!timestamp) return "—";

  // SQLite timestamps may use a space instead of T
  let value = String(timestamp).trim().replace(" ", "T");

  // Treat timestamps without a timezone as UTC
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


export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLogs = useCallback(async (signal) => {
    try {
      const [logsResponse, summaryResponse] = await Promise.all([
        apiFetch("/api/logs?limit=1000", { signal }),
        apiFetch("/api/logs/summary", { signal }),
      ]);

      if (!logsResponse.ok || !summaryResponse.ok) {
        throw new Error("Unable to fetch activity logs");
      }

      const logsData = await logsResponse.json();
      const summaryData = await summaryResponse.json();

      if (!Array.isArray(logsData.logs)) {
        throw new Error("Invalid logs API response");
      }

      if (signal?.aborted) return;

      setLogs(logsData.logs);
      setSummary(summaryData);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      if (err.name !== "AbortError" && !signal?.aborted) {
        setError(err.message || "Backend connection failed");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchLogs(controller.signal);

    const interval = setInterval(() => {
      fetchLogs(controller.signal);
    }, 30000);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const text = [
        log.action,
        log.actor,
        log.details,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(query);

      const matchesSeverity =
        severity === "All" ||
        String(log.severity ?? "").toLowerCase() ===
          severity.toLowerCase();

      const matchesStatus =
        status === "All" ||
        String(log.status ?? "").toLowerCase() ===
          status.toLowerCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [logs, search, severity, status]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const failedOperations =
    summary?.failed_events ??
    logs.filter(
      (log) => String(log.status).toLowerCase() === "failed"
    ).length;

  const cards = [
    {
      title: "Total Audit Events",
      value: summary?.total_events ?? 0,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Successful Operations",
      value: summary?.successful_events ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "High Risk Events",
      value: summary?.high_risk_events ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Failed Operations",
      value: failedOperations,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  function severityColor(value) {
    switch (String(value).toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-green-100 text-green-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  }

  function statusColor(value) {
    switch (String(value).toLowerCase()) {
      case "success":
        return "bg-green-100 text-green-700";
      case "failed":
      case "failure":
      case "error":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function exportCSV() {
    const headers = [
      "ID",
      "Timestamp (IST)",
      "Actor",
      "Action",
      "Details",
      "Severity",
      "Status",
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      formatTimestamp(log.timestamp),
      log.actor,
      log.action,
      log.details,
      log.severity,
      log.status,
    ]);

    const escapeCSV = (value) => {
      const text = String(value ?? "");

      // Prevent spreadsheet formula execution.
      const safe = /^[\s]*[=+\-@]/.test(text)
        ? "'" + text
        : text;

      return `"${safe.replace(/"/g, '""')}"`;
    };

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "privacyshield_activity_logs.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Activity Logs
          </h1>

          <p className="text-slate-500 mt-2">
            Monitor database security events and system activity.
          </p>

          <p className="text-sm text-blue-600 mt-2">
            Connected to SQLite via FastAPI
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setLoading(true);
              fetchLogs();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className={`w-fit p-3 rounded-xl ${card.bg}`}>
                <Icon size={22} className={card.color} />
              </div>

              <p className="text-sm text-slate-500 mt-4">
                {card.title}
              </p>

              <h3 className="text-3xl font-bold text-slate-800 mt-2">
                {card.value}
              </h3>
            </div>
          );
        })}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="font-semibold text-lg text-slate-800">
              Security Audit Trail
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Review recorded security operations.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock3 size={15} />
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })}`
              : "Not refreshed yet"}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-xl px-4 py-2.5 bg-white"
          >
            <option value="All">All Severities</option>
            <option value="Info">Info</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-xl px-4 py-2.5 bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
            <option value="Error">Error</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Timestamp (IST)",
                  "Actor",
                  "Action",
                  "Details",
                  "Severity",
                  "Status",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                    {formatTimestamp(log.timestamp)}
                  </td>

                  <td className="px-4 py-4 font-medium">
                    {log.actor || "System"}
                  </td>

                  <td className="px-4 py-4 font-medium">
                    {log.action}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {log.details}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${severityColor(log.severity)}`}
                    >
                      {log.severity}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(log.status)}`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && paginatedLogs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <ShieldCheck
                size={32}
                className="mx-auto mb-3 text-blue-500"
              />
              No activity logs found.
            </div>
          )}

          {loading && logs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              Loading activity logs...
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
          <p className="text-sm text-slate-500">
            Showing {paginatedLogs.length} of{" "}
            {filteredLogs.length} loaded matching events
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setPage(Math.max(1, currentPage - 1))
              }
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() =>
                setPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <ShieldCheck
          size={22}
          className="text-blue-600 shrink-0"
        />

        <div>
          <h3 className="font-semibold text-slate-800">
            Audit Logging Enabled
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            PrivacyShield stores security activity in SQLite.
            The latest 1,000 events are available in this view.
            Events are refreshed automatically every 30 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
