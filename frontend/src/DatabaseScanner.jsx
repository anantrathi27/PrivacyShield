
import { useState } from "react";
import {
  Database,
  ScanSearch,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Clock3,
  RefreshCw,
} from "lucide-react";

import { apiFetch } from "./api";

// Risk level colors
const riskColors = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};

const riskBarColors = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
};

// Convert backend UTC timestamps to IST
function formatTimestamp(timestamp) {
  if (!timestamp) return "—";

  let value = String(timestamp).trim().replace(" ", "T");

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

export default function DatabaseScanner() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Run authenticated database scan
  async function runScan() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/api/scan", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Session expired. Please log in again."
            : `Database scan failed (${response.status})`
        );
      }

      const data = await response.json();

      if (
        !data ||
        !Array.isArray(data.findings) ||
        typeof data.tables_analyzed !== "number" ||
        typeof data.sensitive_fields !== "number"
      ) {
        throw new Error("Invalid database scan response");
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message || "Unable to connect to backend"
      );
    } finally {
      setLoading(false);
    }
  }

  const riskSummary = result?.risk_summary || {
    critical: 0,
    high: 0,
    medium: 0,
  };

  const riskScore =
    typeof result?.risk_score === "number"
      ? result.risk_score
      : null;

  const riskStatus = result?.risk_status || "Unknown";

  const summaryCards = [
    {
      title: "Tables Analyzed",
      value: result?.tables_analyzed ?? "—",
      icon: Database,
      color: "text-blue-600",
    },
    {
      title: "Sensitive Fields",
      value: result?.sensitive_fields ?? "—",
      icon: ShieldAlert,
      color: "text-orange-600",
    },
    {
      title: "Risk Score",
      value: riskScore !== null ? `${riskScore}%` : "—",
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Scan Status",
      value: result?.scan_status || "Not Started",
      icon: CheckCircle2,
      color: "text-green-600",
    },
  ];

  const severityData = [
    { label: "Critical", count: riskSummary.critical },
    { label: "High", count: riskSummary.high },
    { label: "Medium", count: riskSummary.medium },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Database Scanner
        </h1>

        <p className="text-slate-500 mt-2">
          Discover sensitive information and identify potential
          privacy risks.
        </p>

        <p className="text-sm text-blue-600 mt-2">
          Connected to SQLite via FastAPI — schema-based detection
        </p>
      </div>

      {/* Scan Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Database size={24} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-800">
              PrivacyShield Database
            </h2>

            <p className="text-sm text-slate-500">
              Scan the local SQLite database for sensitive fields
            </p>
          </div>
        </div>

        <button
          onClick={runScan}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-3 rounded-xl transition"
        >
          {loading ? (
            <RefreshCw size={20} className="animate-spin" />
          ) : (
            <ScanSearch size={20} />
          )}

          {loading ? "Scanning Database..." : "Run Database Scan"}
        </button>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {result?.scanned_at && (
          <p className="text-xs text-slate-400 mt-4 flex items-center gap-2">
            <Clock3 size={14} />
            Last scanned: {formatTimestamp(result.scanned_at)} IST
          </p>
        )}
      </div>

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
                >
                  <Icon className={card.color} size={24} />

                  <p className="text-sm text-slate-500 mt-4">
                    {card.title}
                  </p>

                  <h3 className="text-2xl font-bold text-slate-800 mt-2">
                    {card.value}
                  </h3>
                </div>
              );
            })}
          </div>

          {/* Risk Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Risk Score */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <ShieldAlert className="text-orange-600" size={21} />

                <h2 className="font-semibold text-slate-800">
                  Risk Assessment
                </h2>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Sensitive Data Risk Indicator
                  </p>

                  <h3 className="text-4xl font-bold text-slate-800 mt-2">
                    {riskScore !== null ? `${riskScore}%` : "N/A"}
                  </h3>
                </div>

                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    riskColors[riskStatus] ||
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {riskStatus}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    riskScore >= 75
                      ? "bg-red-500"
                      : riskScore >= 50
                      ? "bg-orange-500"
                      : riskScore >= 25
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, riskScore ?? 0)
                    )}%`,
                  }}
                />
              </div>

              <p className="text-xs text-slate-500 mt-4">
                This indicator reflects the sensitivity of detected
                database columns. It does not measure confirmed
                vulnerabilities or breaches.
              </p>
            </div>

            {/* Severity Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="text-blue-600" size={21} />

                <h2 className="font-semibold text-slate-800">
                  Severity Breakdown
                </h2>
              </div>

              <div className="space-y-5">
                {severityData.map((item) => {
                  const percentage = result.sensitive_fields
                    ? (item.count / result.sensitive_fields) * 100
                    : 0;

                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {item.label}
                        </span>

                        <span className="text-sm font-semibold text-slate-800">
                          {item.count}
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            riskBarColors[item.label]
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, percentage)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sensitive Data Findings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Database className="text-blue-600" size={21} />

              <h2 className="text-lg font-semibold text-slate-800">
                Sensitive Data Findings
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {[
                      "Table",
                      "Column",
                      "Data Type",
                      "Category",
                      "Risk Level",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-4 font-semibold"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {result.findings.map((item, index) => (
                    <tr
                      key={`${item.table}-${item.column}-${index}`}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        {item.table}
                      </td>

                      <td className="px-4 py-4 font-medium">
                        {item.column}
                      </td>

                      <td className="px-4 py-4">
                        {item.data_type}
                      </td>

                      <td className="px-4 py-4">
                        {item.category || "Not Classified"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            riskColors[item.risk_level] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {result.findings.length === 0 && (
                <p className="text-center text-slate-400 py-10">
                  No sensitive columns detected.
                </p>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-5">
              Detection is based on database column names.
              Findings indicate potential sensitivity, not
              confirmed security vulnerabilities.
            </p>
          </div>

          {/* Scan Information */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="text-blue-600 shrink-0 mt-0.5"
                size={20}
              />

              <div>
                <h3 className="font-semibold text-slate-800">
                  Database Scan Completed
                </h3>

                <p className="text-sm text-slate-600 mt-2">
                  The scanner analyzed {result.tables_analyzed}{" "}
                  database tables and identified{" "}
                  {result.sensitive_fields} potentially sensitive
                  columns. This scan is recorded in the Activity
                  Logs when backend audit logging is enabled.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
