# PrivacyShield Backend

Local FastAPI + SQLite starter backend with synthetic demo records.

## macOS setup

Open a terminal in this `backend` folder and run:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Visit http://127.0.0.1:8000/docs or http://127.0.0.1:8000/api/database/summary.

The SQLite file `privacyshield.db` is generated automatically at startup. This starter has no authentication or real data masking yet. Use only synthetic data.
