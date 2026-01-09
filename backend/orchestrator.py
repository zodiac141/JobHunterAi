from typing import Dict
from agent import app_graph
from pydantic import BaseModel


# This will TEMPORARILY hold state.
# In Step 5.2, this will be replaced by PostgreSQL.
JOBS_DB: Dict[str, dict] = {}


class JobCriteria(BaseModel):
    role: str
    location: str
    experience: str
    skills: str


async def run_agent_background(run_id: str, criteria: JobCriteria):
    """
    Executes the agent workflow in the background.
    This function owns agent execution and state updates.
    """

    initial_state = {
        "role": criteria.role,
        "location": criteria.location,
        "experience": criteria.experience,
        "skills": criteria.skills,

        "candidate_leads": [],
        "leads": [],

        "logs": [{"message": "Agent initialized.", "type": "system"}],
        "status": "PLANNING",
    }

    JOBS_DB[run_id] = initial_state

    try:
        async for event in app_graph.astream(initial_state):
            for node_name, state in event.items():
                current = JOBS_DB[run_id]

                # Status transitions
                if node_name in ["career", "linkedin", "wellfound"]:
                    current["status"] = "SEARCHING"
                elif node_name == "merge_validate":
                    current["status"] = "VALIDATING"
                elif node_name == "score":
                    current["status"] = "SCORING"
                elif node_name == "email_enrich":
                    current["status"] = "ENRICHING"
                elif node_name == "save":
                    current["status"] = "COMPLETED"

                # Logs
                if "logs" in state and state["logs"]:
                    current["logs"].extend(state["logs"])

                # Leads
                if "leads" in state:
                    current["leads"] = state["leads"]

    except Exception as e:
        current = JOBS_DB.get(run_id)
        if current:
            current["status"] = "ERROR"
            current["logs"].append({
                "message": f"Critical Error: {str(e)}",
                "type": "error"
            })
