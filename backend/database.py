
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

DATABASE_PATH = Path(__file__).resolve().parent / "privacyshield.db"

DEFAULT_SETTINGS = {
    "automatic_scanning": True,
    "audit_logging": True,
    "email_masking": True,
    "phone_masking": True,
    "financial_masking": True,
    "security_alerts": True,
}


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def initialize_database():
    with get_connection() as connection:

        # Customers
        
        connection.execute("""
         CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                 email TEXT NOT NULL UNIQUE,
                 password_hash TEXT NOT NULL,
                 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
         """)

        # Employees
        connection.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                salary REAL
            )
        """)

        # Audit Logs
        connection.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL
            )
        """)

        # Settings
        connection.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                enabled INTEGER NOT NULL
                    CHECK (enabled IN (0, 1))
            )
        """)

        # Check for incompatible settings schema.
        columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(app_settings)"
            ).fetchall()
        }

        if not {"key", "enabled"}.issubset(columns):
            raise RuntimeError(
                "Existing app_settings schema is incompatible. "
                "Back up privacyshield.db and migrate the "
                "app_settings table before restarting."
            )

        # Demo Customers
        customer_count = connection.execute(
            "SELECT COUNT(*) FROM customers"
        ).fetchone()[0]

        if customer_count == 0:
            connection.executemany("""
                INSERT INTO customers
                (full_name, email, phone, card_number)
                VALUES (?, ?, ?, ?)
            """, [
                (
                    "Demo Customer One",
                    "customer1@example.com",
                    "9000000001",
                    "4111111111111111"
                ),
                (
                    "Demo Customer Two",
                    "customer2@example.com",
                    "9000000002",
                    "4242424242424242"
                ),
            ])

        # Demo Employees
        employee_count = connection.execute(
            "SELECT COUNT(*) FROM employees"
        ).fetchone()[0]

        if employee_count == 0:
            connection.executemany("""
                INSERT INTO employees
                (full_name, email, phone, salary)
                VALUES (?, ?, ?, ?)
            """, [
                (
                    "Demo Employee One",
                    "employee1@example.com",
                    "9000000003",
                    75000
                ),
                (
                    "Demo Employee Two",
                    "employee2@example.com",
                    "9000000004",
                    85000
                ),
            ])

        # Insert default settings without overwriting saved values.
        connection.executemany("""
            INSERT OR IGNORE INTO app_settings
            (key, enabled)
            VALUES (?, ?)
        """, [
            (key, int(value))
            for key, value in DEFAULT_SETTINGS.items()
        ])

        # Indexes for faster audit log retrieval.
        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp
            ON audit_logs(timestamp)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_severity
            ON audit_logs(severity)
        """)

        connection.commit()


# Read Settings
def get_settings():
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT key, enabled
            FROM app_settings
        """).fetchall()

    settings = DEFAULT_SETTINGS.copy()

    for row in rows:
        if row["key"] in settings:
            settings[row["key"]] = bool(row["enabled"])

    return settings


# Save Settings
def save_settings(settings):
    if set(settings) != set(DEFAULT_SETTINGS):
        raise ValueError("Invalid settings payload")

    if any(type(value) is not bool for value in settings.values()):
        raise ValueError("Settings values must be boolean")

    with get_connection() as connection:
        connection.executemany("""
            INSERT INTO app_settings (key, enabled)
            VALUES (?, ?)
            ON CONFLICT(key)
            DO UPDATE SET enabled = excluded.enabled
        """, [
            (key, int(settings[key]))
            for key in DEFAULT_SETTINGS
        ])

        connection.commit()

    return get_settings()


# Reset Settings
def reset_settings():
    return save_settings(DEFAULT_SETTINGS.copy())


# Add Audit Log
def add_audit_log(
    action,
    details,
    severity="Info",
    status="Success",
    actor="demo_admin",
    force=False
):
    # Respect the audit logging setting for normal events.
    # Security-critical events may be forced by trusted backend code.
    if not force and not get_settings()["audit_logging"]:
        return False

    with get_connection() as connection:
        connection.execute("""
            INSERT INTO audit_logs
            (timestamp, actor, action, details, severity, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            datetime.now(timezone.utc).isoformat(),
            actor,
            action,
            details,
            severity,
            status
        ))

        connection.commit()

    return True


# Fetch Audit Logs
def fetch_audit_logs(limit=100):
    limit = max(1, min(int(limit), 1000))

    with get_connection() as connection:
        rows = connection.execute("""
            SELECT
                id,
                timestamp,
                actor,
                action,
                details,
                severity,
                status
            FROM audit_logs
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

    return [dict(row) for row in rows]


# Audit Logs Summary
def get_logs_summary():
    with get_connection() as connection:
        row = connection.execute("""
            SELECT
                COUNT(*) AS total_events,

                COALESCE(SUM(
                    CASE
                        WHEN LOWER(severity) IN ('high', 'critical')
                        THEN 1 ELSE 0
                    END
                ), 0) AS high_risk_events,

                COALESCE(SUM(
                    CASE
                        WHEN LOWER(status) = 'success'
                        THEN 1 ELSE 0
                    END
                ), 0) AS successful_events,

                COALESCE(SUM(
                    CASE
                        WHEN LOWER(status) IN
                            ('failed', 'failure', 'error')
                        THEN 1 ELSE 0
                    END
                ), 0) AS failed_events

            FROM audit_logs
        """).fetchone()

    return dict(row)


# Database Summary
def get_database_summary():
    with get_connection() as connection:
        customers = connection.execute(
            "SELECT COUNT(*) FROM customers"
        ).fetchone()[0]

        employees = connection.execute(
            "SELECT COUNT(*) FROM employees"
        ).fetchone()[0]

        audit_events = connection.execute(
            "SELECT COUNT(*) FROM audit_logs"
        ).fetchone()[0]

    return {
        "tables": 3,
        "customers": customers,
        "employees": employees,
        "audit_events": audit_events,
    }
