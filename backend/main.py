from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from agent import app_graph  # This imports the brain you built

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

# --- In-Memory Database ---
JOBS_DB = {}

# --- Data Models ---
class JobCriteria(BaseModel):
    role: str
    location: str
    experience: str
    skills: str

# --- Background Task (The Worker) ---
async def run_agent_background(run_id: str, criteria: JobCriteria):
    # Initialize state
    initial_state = {
        "role": criteria.role,
        "location": criteria.location,
        "experience": criteria.experience,
        "skills": criteria.skills,
        "logs": [{"message": "Agent initialized.", "type": "system"}],
        "leads": [],
        "status": "PLANNING",
        "search_queries": [],
        "raw_search_results": []
    }
    
    JOBS_DB[run_id] = initial_state

    # Run the graph (The Agent Logic)
    try:
        async for event in app_graph.astream(initial_state):
            for node_name, state in event.items():
                current = JOBS_DB[run_id]
                
                # Update Status
                if node_name == "planner": current["status"] = "SEARCHING"
                elif node_name == "searcher": current["status"] = "FILTERING"
                elif node_name == "filter": current["status"] = "SAVING"
                elif node_name == "saver": current["status"] = "COMPLETED"
                
                # Append Logs
                if "logs" in state and state["logs"]:
                    current["logs"].extend(state["logs"])
                
                # Update Leads
                if "leads" in state:
                    current["leads"] = state["leads"]
                    
    except Exception as e:
        print(f"Error in background task: {e}")
        JOBS_DB[run_id]["status"] = "ERROR"
        JOBS_DB[run_id]["logs"].append({"message": f"Critical Error: {str(e)}", "type": "error"})

# --- Endpoints ---

@app.post("/api/agent/run")
async def start_agent(criteria: JobCriteria, background_tasks: BackgroundTasks):
    run_id = str(uuid.uuid4())
    background_tasks.add_task(run_agent_background, run_id, criteria)
    return {"run_id": run_id, "status": "STARTING"}

@app.get("/api/agent/run/{run_id}")
async def get_agent_status(run_id: str):
    return JOBS_DB.get(run_id, {"status": "NOT_FOUND"})