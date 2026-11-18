
import { useState, useEffect, useCallback } from "react";
import {
  Database,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Lock,
  AlertCircle,
} from "lucide-react";

import { apiFetch } from "./api";

const TABLE_COLUMNS = {
  customers: ["id", "full_name", "email", "phone", "card_number"],
  employees: ["id", "full_name", "email", "phone", "salary"],
};

const SENSITIVE_FIELDS = {
  customers: ["full_name", "email", "phone", "card_number"],
  employees: ["full_name", "email", "phone", "salary"],
};

const COLUMN_LABELS = {
  id: "ID",
  full_name: "Full Name",
  email: "Email",
  phone: "Phone",
  card_number: "Card Number",
  salary: "Salary",
};

// Supports different FastAPI response structures
function normalizeResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid masking API response");
  }

  const possibleRecords = [
    payload.records,
    payload.masked_data,
    payload.data,
    payload.rows,
    payload.masked_records,
    payload.result?.records,
    payload.result?.data,
  ];

  const records = possibleRecords.find(Array.isArray);

  if (!records) {
    throw new Error(
      payload.detail ||
        payload.message ||
        "Invalid masking API response"
    );
  }

  return records;
}

export default function DataMasking() {
  const [selectedTable, setSelectedTable] = useState("employees");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [maskingStatus, setMaskingStatus] = useState("Loading");

  const columns = TABLE_COLUMNS[selectedTable];

  const fetchMaskedData = useCallback(async () => {
    setLoading(true);
    setError("");
    setMaskingStatus("Loading");

    try {
      const response = await apiFetch(
        `/api/masking/${selectedTable}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        let message = `API error: ${response.status}`;

        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          // Keep the HTTP error message
        }

        throw new Error(message);
      }

      const payload = await response.json();


      const maskedRecords = normalizeResponse(payload);

      if (!maskedRecords.every(
        (record) =>
          record !== null &&
          typeof record === "object" &&
          !Array.isArray(record)
      )) {
        throw new Error("Invalid record format");
      }

      // Only display records that the backend identifies as masked.
      // This frontend does not mask raw sensitive data itself.
      const safeRecords = maskedRecords.map((record) => {
        const result = { ...record };

        for (const field of SENSITIVE_FIELDS[selectedTable]) {
          const value = result[field];

          if (
            value !== null &&
            value !== undefined &&
            value !== ""
          ) {
            const text = String(value);
            if (text === "[Hidden]") {
              continue;
            }              

            // Reject obviously unmasked demo data.
            // This is a basic safeguard, not a security guarantee.
            if (field === "salary") {
              if (!text.includes("*")) {
                throw new Error(
                  "Backend returned an unmasked salary"
                );
              }
            } else if (
              field === "card_number" &&
              /\d{12,}/.test(text.replace(/[\s-]/g, ""))
            ) {
              throw new Error(
                "Backend returned an unmasked card number"
              );
            } else if (
              field === "phone" &&
              /^\+?[\d\s()-]{10,}$/.test(text)
            ) {
              throw new Error(
                "Backend returned an unmasked phone number"
              );
            } else if (
              field === "email" &&
              /^[^\s@*]+@[^\s@]+\.[^\s@]+$/.test(text)
            ) {
              throw new Error(
                "Backend returned an unmasked email"
              );
            } else if (
              field === "full_name" &&
              !text.includes("*")
            ) {
              throw new Error(
                "Backend returned an unmasked name"
              );
            }
          }
        }

        return result;
      });

      setRecords(safeRecords);
      setMaskingStatus("Protected");
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Masking error:", err);

      setRecords([]);
      setMaskingStatus("Error");
      setError(
        err.message || "Unable to fetch masked data"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    fetchMaskedData();
  }, [fetchMaskedData]);

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Data Masking
        </h2>

        <p className="text-slate-500 mt-2">
          Protect sensitive database information using
          secure masking previews.
        </p>

        <p className="text-xs text-blue-600 mt-2">
          Connected to SQLite via FastAPI
        </p>
      </div>

      {/* Database Masking Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-3 rounded-xl">
            <Database className="text-blue-600" size={22} />
          </div>

          <div>
            <h3 className="font-semibold text-slate-800">
              Database Masking Configuration
            </h3>

            <p className="text-sm text-slate-500">
              Select a database table to preview masked information.
            </p>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Database Table
        </label>

        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="w-full max-w-xs border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:border-blue-500"
        >
          <option value="employees">Employees</option>
          <option value="customers">Customers</option>
        </select>

        <div className="mt-5">
          <button
            onClick={fetchMaskedData}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-3 rounded-xl text-sm font-medium"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />

            {loading
              ? "Loading Masked Data..."
              : "Refresh Masked Data"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <Database className="text-blue-600 mb-3" />

          <p className="text-sm text-slate-500">
            Records Protected
          </p>

          <h3 className="text-3xl font-bold mt-2 text-slate-800">
            {maskingStatus === "Protected"
              ? records.length
              : "—"}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <EyeOff className="text-orange-500 mb-3" />

          <p className="text-sm text-slate-500">
            Sensitive Fields
          </p>

          <h3 className="text-3xl font-bold mt-2 text-slate-800">
            {SENSITIVE_FIELDS[selectedTable].length}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <ShieldCheck className="text-green-600 mb-3" />

          <p className="text-sm text-slate-500">
            Masking Status
          </p>

          <h3
            className={`text-xl font-bold mt-2 ${
              maskingStatus === "Error"
                ? "text-red-600"
                : maskingStatus === "Protected"
                ? "text-green-600"
                : "text-slate-800"
            }`}
          >
            {maskingStatus}
          </h3>
        </div>
      </div>

      {/* Masked Data Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <EyeOff className="text-blue-600" />

          <div>
            <h3 className="font-semibold text-slate-800">
              Masked Data Preview
            </h3>

            <p className="text-sm text-slate-500">
              Sensitive values are masked before being
              returned by the API.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-5 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="p-4 font-semibold whitespace-nowrap"
                  >
                    {COLUMN_LABELS[column]}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {records.map((record, index) => (
                <tr
                  key={record.id ?? index}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="p-4 text-slate-700 whitespace-nowrap"
                    >
                      {record[column] === null ||
                      record[column] === undefined
                        ? "—"
                        : String(record[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !error && records.length === 0 && (
            <p className="text-center text-slate-400 py-10">
              No records found in this table.
            </p>
          )}

          {loading && (
            <p className="text-center text-blue-600 py-10">
              Fetching masked records...
            </p>
          )}
        </div>

        {lastRefreshed && (
          <p className="text-xs text-slate-400 mt-5">
            Last refreshed: {lastRefreshed.toLocaleString()}
          </p>
        )}
      </div>

      {/* Privacy Information */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Lock className="text-blue-600 mt-1" size={20} />

          <div>
            <h3 className="font-semibold text-slate-800">
              Privacy Protection Enabled
            </h3>

            <p className="text-sm text-slate-600 mt-2">
              Original database records remain unchanged.
              Sensitive values should be masked by the
              backend before being displayed in the interface.
              Successful masking previews can be recorded
              in the Activity Logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
