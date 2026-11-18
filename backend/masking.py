
from database import (
    get_connection,
    get_settings,
    add_audit_log,
)


# ------------------------------------------
# MASK EMAIL
# ------------------------------------------

def mask_email(value):
    if not value or "@" not in str(value):
        return "****"

    name, domain = str(value).rsplit("@", 1)

    return name[:1] + "****@" + domain


# ------------------------------------------
# MASK PHONE
# ------------------------------------------

def mask_phone(value):
    if not value:
        return "****"

    digits = "".join(
        c for c in str(value) if c.isdigit()
    )

    return "******" + digits[-4:]


# ------------------------------------------
# MASK CARD NUMBER
# ------------------------------------------

def mask_card(value):
    if not value:
        return "****"

    digits = "".join(
        c for c in str(value) if c.isdigit()
    )

    return "**** **** **** " + digits[-4:]


# ------------------------------------------
# MASK NAME
# ------------------------------------------

def mask_name(value):
    if not value:
        return "****"

    text = str(value)

    return text[:1] + "*" * max(len(text) - 1, 3)


# ------------------------------------------
# MASK SALARY
# ------------------------------------------

def mask_salary(value):
    return "****"


# ------------------------------------------
# GET MASKED RECORDS
# ------------------------------------------

def get_masked_records(table_name):

    allowed_tables = {"customers", "employees"}

    if table_name not in allowed_tables:
        raise ValueError("Invalid table name")

    # Read latest settings from SQLite
    settings = get_settings()

    with get_connection() as connection:
        rows = connection.execute(
            f"SELECT * FROM {table_name}"
        ).fetchall()

    masked_records = []

    for row in rows:

        record = dict(row)

        # Always mask names in preview
        if "full_name" in record:
            record["full_name"] = mask_name(
                record["full_name"]
            )

        # Email masking controlled by settings
        if "email" in record:
            if settings["email_masking"]:
                record["email"] = mask_email(
                    record["email"]
                )
            else:
                record["email"] = "[Hidden]"

        # Phone masking controlled by settings
        if "phone" in record:
            if settings["phone_masking"]:
                record["phone"] = mask_phone(
                    record["phone"]
                )
            else:
                record["phone"] = "[Hidden]"

        # Financial masking controlled by settings
        if "card_number" in record:
            if settings["financial_masking"]:
                record["card_number"] = mask_card(
                    record["card_number"]
                )
            else:
                record["card_number"] = "[Hidden]"

        if "salary" in record:
            if settings["financial_masking"]:
                record["salary"] = mask_salary(
                    record["salary"]
                )
            else:
                record["salary"] = "[Hidden]"

        masked_records.append(record)

    # Log masking preview if audit logging enabled
    if settings["audit_logging"]:
        add_audit_log(
            action="Data Masking",
            details=f"Viewed protected {table_name} records",
            severity="Info",
            status="Success",
            actor="demo_admin"
        )

    return {
        "table": table_name,
        "total_records": len(masked_records),
        "masking_status": "Completed",
        "settings": {
            "email_masking": settings["email_masking"],
            "phone_masking": settings["phone_masking"],
            "financial_masking": settings["financial_masking"],
        },
        "records": masked_records,
    }


# ------------------------------------------
# COMPATIBILITY WITH MAIN.PY
# ------------------------------------------

from database import get_connection, get_settings, add_audit_log


def mask_table(table_name):
    if table_name not in ("customers", "employees"):
        raise ValueError("Invalid table name")

    settings = get_settings()

    with get_connection() as connection:
        rows = connection.execute(
            f"SELECT * FROM {table_name}"
        ).fetchall()

    masked_rows = []

    for row in rows:
        record = dict(row)

        for column, value in record.items():
            if value is None:
                continue

            text = str(value)

            if column == "full_name":
                record[column] = (
                    text[:1] + "*" * max(len(text) - 1, 3)
                )

            elif column == "email":
                if settings["email_masking"]:
                    if "@" in text:
                        local, domain = text.rsplit("@", 1)
                        record[column] = (
                            local[:1] + "****@" + domain
                        )
                    else:
                        record[column] = "****"
                else:
                    record[column] = "[Hidden]"

            elif column == "phone":
                if settings["phone_masking"]:
                    record[column] = "******" + text[-4:]
                else:
                    record[column] = "[Hidden]"

            elif column == "card_number":
                if settings["financial_masking"]:
                    record[column] = "**** **** **** " + text[-4:]
                else:
                    record[column] = "[Hidden]"

            elif column == "salary":
                record[column] = "****" if settings[
                    "financial_masking"
                ] else "[Hidden]"

        masked_rows.append(record)

    if settings["audit_logging"]:
        add_audit_log(
            action="Data Masking",
            details=f"Viewed protected {table_name} records",
        )

    return {
        "table": table_name,
        "total_records": len(masked_rows),
        "masking_status": "Completed",
        "settings": settings,
        "records": masked_rows,
    }

