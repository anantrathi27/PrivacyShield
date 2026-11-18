
from datetime import datetime, timezone
from database import get_connection

# Sensitive data classification
SENSITIVE_FIELDS = {
    "email": ("Email Address", "Contact Information", "High"),
    "phone": ("Phone Number", "Contact Information", "Medium"),
    "mobile": ("Phone Number", "Contact Information", "Medium"),
    "salary": ("Financial Data", "Financial Information", "High"),
    "card_number": ("Payment Card Data", "Financial Information", "Critical"),
    "full_name": ("Personal Information", "Personal Information", "Medium"),
    "address": ("Address", "Personal Information", "Medium"),
    "date_of_birth": ("Date of Birth", "Personal Information", "High"),
    "password": ("Authentication Data", "Authentication Information", "Critical"),
    "ssn": ("Government Identifier", "Personal Information", "Critical"),
}

RISK_WEIGHTS = {
    "Critical": 10,
    "High": 6,
    "Medium": 3,
    "Low": 1
}

EXCLUDED_TABLES = {
    "audit_logs",
    "app_settings"
}


def calculate_risk_score(findings):
    """
    Calculate a risk indicator based on sensitive columns.
    This is a demo score, not a vulnerability assessment.
    """
    if not findings:
        return 0

    total_weight = sum(
        RISK_WEIGHTS.get(item["risk_level"], 0)
        for item in findings
    )

    maximum_weight = len(findings) * 10

    return round((total_weight / maximum_weight) * 100, 2)


def get_risk_status(score):
    if score >= 75:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 25:
        return "Medium"
    return "Low"


def scan_database():
    findings = []
    tables_analyzed = 0
    scanned_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:

        tables = connection.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """).fetchall()

        for table in tables:
            table_name = table["name"]

            if table_name in EXCLUDED_TABLES:
                continue

            tables_analyzed += 1

            # Escape SQLite identifier safely
            safe_name = table_name.replace('"', '""')

            columns = connection.execute(
                f'PRAGMA table_info("{safe_name}")'
            ).fetchall()

            for column in columns:
                column_name = column["name"]
                normalized = column_name.lower()

                if normalized not in SENSITIVE_FIELDS:
                    continue

                data_type, category, risk_level = (
                    SENSITIVE_FIELDS[normalized]
                )

                findings.append({
                    "table": table_name,
                    "column": column_name,
                    "data_type": data_type,
                    "category": category,
                    "risk_level": risk_level
                })

    # Calculate scan statistics
    critical_count = sum(
        f["risk_level"] == "Critical"
        for f in findings
    )

    high_count = sum(
        f["risk_level"] == "High"
        for f in findings
    )

    medium_count = sum(
        f["risk_level"] == "Medium"
        for f in findings
    )

    risk_score = calculate_risk_score(findings)
    risk_status = get_risk_status(risk_score)

    # Record completed scan in audit logs
    with get_connection() as connection:
        connection.execute("""
            INSERT INTO audit_logs
            (actor, action, details, severity, status)
            VALUES (?, ?, ?, ?, ?)
        """, (
            "demo_admin",
            "Database Scan",
            (
                f"Scanned {tables_analyzed} tables; "
                f"found {len(findings)} sensitive columns; "
                f"risk score {risk_score}%"
            ),
            "Info",
            "Success"
        ))

        connection.commit()

    return {
        "scan_status": "Completed",
        "scanned_at": scanned_at,
        "tables_analyzed": tables_analyzed,
        "sensitive_fields": len(findings),
        "risk_score": risk_score,
        "risk_status": risk_status,
        "risk_summary": {
            "critical": critical_count,
            "high": high_count,
            "medium": medium_count
        },
        "findings": findings
    }
