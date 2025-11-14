from fastapi import FastAPI
from .routers import dashboard

app = FastAPI(title="SKPDI Dashboard API")

app.include_router(dashboard.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
