
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from auth import (
    RegisterPayload,
    LoginPayload,
    register_user,
    authenticate_user,
    create_access_token,
    get_current_user,
)

from database import (
    initialize_database,
    get_connection,
    get_settings,
    save_settings,
    reset_settings,
    add_audit_log,
    fetch_audit_logs,
    get_logs_summary,
    get_database_summary,
)

from scanner import scan_database
from masking import mask_table


# ==========================================
# SETTINGS VALIDATION
# ==========================================

class SettingsPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    automatic_scanning: bool
    audit_logging: bool
    email_masking: bool
    phone_masking: bool
    financial_masking: bool
    security_alerts: bool


# ==========================================
# DATABASE STARTUP
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="PrivacyShield API",
    description="Database Security and Privacy Platform",
    version="1.4.0",
    lifespan=lifespan,
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=[
        "Content-Type",
        "Authorization",
    ],
)


# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================

# Register New User
@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterPayload):
    user = register_user(payload)

    return {
        "message": "Account created successfully",
        "user": user,
    }


# User Login
@app.post("/api/auth/login")
def login(payload: LoginPayload):
    user = authenticate_user(
        payload.username,
        payload.password,
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
        },
    }


# Current Logged-in User
@app.get("/api/auth/me")
def current_user(
    user=Depends(get_current_user),
):
    return user


# ==========================================
# PUBLIC ENDPOINTS
# ==========================================

# Home
@app.get("/")
def home():
    return {
        "application": "PrivacyShield",
        "status": "running",
        "message": "Backend API is working successfully",
        "version": "1.4.0",
    }


# Health Check
@app.get("/api/health")
def health_check():
    try:
        with get_connection() as connection:
            connection.execute("SELECT 1")

        return {
            "status": "healthy",
            "database": "SQLite",
            "service": "PrivacyShield API",
        }

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )


# ==========================================
# PROTECTED DATABASE SUMMARY
# ==========================================

@app.get(
    "/api/database/summary",
    dependencies=[Depends(get_current_user)],
)
def database_summary():
    return get_database_summary()


# ==========================================
# PROTECTED DATABASE SCANNER
# ==========================================

@app.post(
    "/api/scan",
    dependencies=[Depends(get_current_user)],
)
def run_database_scan():
    try:
        result = scan_database()
        return result

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Database scan failed",
        )


# ==========================================
# PROTECTED ACTIVITY LOGS
# ==========================================

@app.get(
    "/api/logs",
    dependencies=[Depends(get_current_user)],
)
def get_logs(
    limit: int = Query(default=100, ge=1, le=1000),
):
    logs = fetch_audit_logs(limit)

    summary = get_logs_summary()

    return {
        "total": summary["total_events"],
        "logs": logs,
    }


# Activity Logs Summary
@app.get(
    "/api/logs/summary",
    dependencies=[Depends(get_current_user)],
)
def logs_summary():
    return get_logs_summary()


# ==========================================
# PROTECTED DATA MASKING
# ==========================================

@app.get(
    "/api/masking/{table_name}",
    dependencies=[Depends(get_current_user)],
)
def get_masked_table(table_name: str):
    if table_name not in ("customers", "employees"):
        raise HTTPException(
            status_code=400,
            detail="Invalid database table",
        )

    try:
        result = mask_table(table_name)

        # Supports both list and dictionary responses
        if isinstance(result, dict):
            if not isinstance(result.get("records"), list):
                raise ValueError("Invalid masking response")

            return result

        if not isinstance(result, list):
            raise ValueError("Invalid masking response")

        return {
            "table": table_name,
            "total_records": len(result),
            "masking_status": "Completed",
            "records": result,
        }

    except ValueError:
        raise HTTPException(
            status_code=500,
            detail="Data masking configuration error",
        )


# ==========================================
# PROTECTED SETTINGS
# ==========================================

# Read Settings
@app.get(
    "/api/settings",
    dependencies=[Depends(get_current_user)],
)
def read_settings():
    return get_settings()


# Update Settings
@app.put(
    "/api/settings",
    dependencies=[Depends(get_current_user)],
)
def update_settings(payload: SettingsPayload):
    updated = save_settings(payload.model_dump())

    # Record settings changes even when audit logging is disabled
    add_audit_log(
        action="Settings Updated",
        details="Security and privacy preferences updated",
        severity="Info",
        status="Success",
        force=True,
    )

    return {
        "message": "Settings saved successfully",
        "settings": updated,
    }


# Reset Settings
@app.post(
    "/api/settings/reset",
    dependencies=[Depends(get_current_user)],
)
def restore_settings():
    updated = reset_settings()

    add_audit_log(
        action="Settings Reset",
        details="Security and privacy preferences restored to defaults",
        severity="Info",
        status="Success",
        force=True,
    )

    return {
        "message": "Default settings restored",
        "settings": updated,
    }
