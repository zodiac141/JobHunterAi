from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uuid

from orchestrator import run_agent_background, JOBS_DB, JobCriteria



app = FastAPI()

# --- CORS Setup (So React can talk to Python) ---
app.add_middleware(
    CORSMiddleware,
    # Allow both common Vite ports just in case
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---

@app.post("/api/agent/run")
async def start_agent(criteria: JobCriteria, background_tasks: BackgroundTasks):
    run_id = str(uuid.uuid4())
    background_tasks.add_task(run_agent_background, run_id, criteria)
    return {"run_id": run_id, "status": "STARTING"}

@app.get("/api/agent/run/{run_id}")
async def get_agent_status(run_id: str):
    return JOBS_DB.get(run_id, {"status": "NOT_FOUND"})