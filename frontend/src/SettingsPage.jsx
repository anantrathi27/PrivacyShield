
import { useEffect, useState } from "react";

import {
  ShieldCheck,
  Database,
  EyeOff,
  Bell,
  Save,
  RotateCcw,
} from "lucide-react";

import { apiFetch } from "./api";

const groups = [
  {
    title: "Database Security",
    icon: Database,
    subtitle: "Configure database monitoring preferences.",
    items: [
      [
        "automatic_scanning",
        "Automatic Database Scanning",
        "Preference for future scheduled scans.",
      ],
      [
        "audit_logging",
        "Audit Logging",
        "Preference for recording security-related activity.",
      ],
    ],
  },
  {
    title: "Data Privacy & Masking",
    icon: EyeOff,
    subtitle: "Configure sensitive data masking preferences.",
    items: [
      [
        "email_masking",
        "Email Address Masking",
        "Hide sensitive parts of email addresses.",
      ],
      [
        "phone_masking",
        "Phone Number Masking",
        "Display only the last four digits.",
      ],
      [
        "financial_masking",
        "Financial Data Masking",
        "Mask payment and financial information.",
      ],
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    subtitle: "Configure security alert preferences.",
    items: [
      [
        "security_alerts",
        "Security Alerts",
        "Preference for future suspicious-activity alerts.",
      ],
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await apiFetch("/api/settings");

        if (!response.ok) {
          throw new Error(
            `Could not load settings (${response.status})`
          );
        }

        const data = await response.json();

        if (!cancelled) {
          setSettings(data);
          setSaved(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const changed =
    settings &&
    saved &&
    JSON.stringify(settings) !== JSON.stringify(saved);

  async function send(url, method, body) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        ...(body
          ? { body: JSON.stringify(body) }
          : {}),
      });

      if (!response.ok) {
        throw new Error(
          `Request failed (${response.status})`
        );
      }

      const data = await response.json();

      setSettings(data.settings);
      setSaved(data.settings);
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* Page Heading */}
      <div>
        <h2 className="text-2xl font-bold">
          Security Settings
        </h2>

        <p className="text-slate-500 mt-2">
          Manage your database privacy and security preferences.
        </p>

        <p className="text-xs text-blue-600 mt-2">
          Connected to SQLite via FastAPI —
          preferences are stored in the database.
        </p>
      </div>

      {/* Configuration Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
        <div className="p-3 bg-blue-50 rounded-xl">
          <ShieldCheck className="text-blue-600" />
        </div>

        <div>
          <h3 className="font-semibold">
            PrivacyShield Configuration
          </h3>

          <p className="text-sm text-slate-500">
            Customize your security workspace.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p
          role="alert"
          className="p-3 bg-red-50 text-red-700 rounded-xl"
        >
          {error}
        </p>
      )}

      {/* Success Message */}
      {message && (
        <p
          role="status"
          className="p-3 bg-green-50 text-green-700 rounded-xl"
        >
          {message}
        </p>
      )}

      {!settings ? (
        <p className="text-slate-500">
          {error
            ? "Settings unavailable. Check the backend."
            : "Loading settings..."}
        </p>
      ) : (
        <>
          {/* Settings Sections */}
          {groups.map((group) => {
            const Icon = group.icon;

            return (
              <section
                key={group.title}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon
                    className="text-blue-600"
                    size={21}
                  />

                  <div>
                    <h3 className="font-semibold">
                      {group.title}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {group.subtitle}
                    </p>
                  </div>
                </div>

                {group.items.map(
                  ([key, label, description]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 py-4 border-t border-slate-100 first:border-t-0"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {label}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {description}
                        </p>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings[key]}
                        aria-label={label}
                        disabled={busy}
                        onClick={() => {
                          setSettings((previous) => ({
                            ...previous,
                            [key]: !previous[key],
                          }));

                          setMessage("");
                        }}
                        className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${
                          settings[key]
                            ? "bg-blue-600"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            settings[key]
                              ? "translate-x-5"
                              : ""
                          }`}
                        />
                      </button>
                    </div>
                  )
                )}
              </section>
            );
          })}

          {/* Save and Reset Buttons */}
          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              disabled={busy || !changed}
              onClick={() =>
                send(
                  "/api/settings",
                  "PUT",
                  settings
                )
              }
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 disabled:opacity-50"
            >
              <Save size={17} />
              Save Settings
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                send(
                  "/api/settings/reset",
                  "POST"
                )
              }
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-5 py-3 hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw size={17} />
              Reset to Defaults
            </button>

            {changed && (
              <span className="text-sm text-amber-600">
                Unsaved changes
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
