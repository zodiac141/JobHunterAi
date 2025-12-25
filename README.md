# Agentic AI Dashboard & Backend Implementation Guide

This project consists of a React Frontend (JobHunter.ai) designed to interface with a Python-based Agentic Backend.

## 🚀 Getting Started

1.  **Run Frontend**: `npm install && npm start`
2.  **Toggle Backend Mode**:
    *   Open `services/api.ts`
    *   Set `USE_MOCK_BACKEND = true` to see the UI simulation.
    *   Set `USE_MOCK_BACKEND = false` to connect to your local Python server.

---

## 🐍 Backend Implementation Guide (Python)

To make this application functional, you need to build a backend API. We recommend using **FastAPI** for the server and **LangGraph / LangChain** for the agent logic.

### 1. Recommended Stack
*   **Python 3.10+**
*   **FastAPI**: For the REST endpoints.
*   **LangGraph**: For stateful, cyclic agent workflows.
*   **LangChain Google GenAI**: To access Gemini models.
*   **Tavily API**: For search capabilities (better than raw Google Search for agents).

### 2. API Contract (Endpoints)

Your backend must run on `http://localhost:8000` (or update `services/api.ts`) and implement the following endpoints:

#### A. Start Agent Workflow
*   **URL**: `POST /api/agent/run`
*   **Body**:
    ```json
    {
      "role": "Frontend Engineer",
      "location": "Remote",
      "experience": "Senior",
      "skills": "React, TypeScript"
    }
    ```
*   **Response**:
    ```json
    {
      "run_id": "unique-uuid-123",
      "status": "PLANNING"
    }
    ```

#### B. Get Agent Status (Polling)
*   **URL**: `GET /api/agent/run/{run_id}`
*   **Response**:
    ```json
    {
      "status": "SEARCHING", // IDLE, PLANNING, SEARCHING, FILTERING, SAVING, COMPLETED
      "logs": [
        {
          "id": "1",
          "timestamp": "10:00:01 AM",
          "message": "Searching LinkedIn for candidates...",
          "type": "action" // thought, action, system, error
        }
      ],
      "leads": [
        {
          "company": "Google",
          "title": "Senior Engineer",
          "fname": "Hiring Team",
          "email": "jobs@google.com",
          "url": "https://...",
          "source": "LinkedIn"
        }
      ]
    }
    ```

### 3. Implementation Hints (LangGraph)

1.  **Define State**:
    ```python
    class AgentState(TypedDict):
        messages: Annotated[list[AnyMessage], add_messages]
        leads: list[dict]
        logs: list[dict]
        status: str
    ```

2.  **Define Nodes**:
    *   `planning_node`: Analyzes criteria and generates search queries.
    *   `search_node`: Calls Tavily/Google Search.
    *   `filter_node`: Uses Gemini to check if jobs match strict criteria.
    *   `extraction_node`: Extracts email/names.

3.  **Define Graph**:
    ```python
    workflow = StateGraph(AgentState)
    workflow.add_node("planner", planning_node)
    workflow.add_node("searcher", search_node)
    # ... add edges ...
    app = workflow.compile()
    ```

4.  **Async Processing**:
    *   Since the agent takes time, the `/run` endpoint should spawn a background task (using `fastapi.BackgroundTasks`) that runs the LangGraph workflow.
    *   Store the state in an in-memory dictionary or Redis, keyed by `run_id`.

### 4. CORS Setup

Don't forget to enable CORS in your FastAPI app so the frontend can hit it:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Or "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
