import os

DB_DSN = os.getenv("DB_DSN")

# Строка/список origin'ов через запятую
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")

if _raw_origins.strip() == "*":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
