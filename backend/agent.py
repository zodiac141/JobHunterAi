import os
import json
import gspread
from typing import TypedDict, List
from dotenv import load_dotenv
from oauth2client.service_account import ServiceAccountCredentials

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from tavily import TavilyClient
from langchain_core.messages import HumanMessage

# =================================================
# ENV & CLIENTS
# =================================================
load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# Google Sheets
SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]

try:
    creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", SCOPE)
    client = gspread.authorize(creds)
    SHEET = client.open("Job emails").sheet1
    print("✅ Google Sheet connected")
except Exception as e:
    print(f"⚠️ Google Sheets error: {e}")
    SHEET = None

# =================================================
# STATE
# =================================================
class AgentState(TypedDict):
    role: str
    location: str
    experience: str
    skills: str

    career_leads: List[dict]
    linkedin_leads: List[dict]
    wellfound_leads: List[dict]

    candidate_leads: List[dict]
    leads: List[dict]

    logs: List[dict]
    status: str

# =================================================
# HELPERS
# =================================================
def normalize(text: str) -> str:
    return text.lower().replace(" ", "").strip()

def deduplicate_leads(leads: List[dict]) -> List[dict]:
    seen = {}
    priority = {"career": 3, "wellfound": 2, "linkedin": 1}

    for l in leads:
        key = normalize(l["company"]) + normalize(l["title"])
        if key not in seen or priority[l["source"]] > priority[seen[key]["source"]]:
            seen[key] = l

    return list(seen.values())

# =================================================
# PLANNER
# =================================================
def planner_node(state: AgentState):
    return {
        "career_leads": [],
        "linkedin_leads": [],
        "wellfound_leads": [],
        "candidate_leads": [],
        "leads": [],
        "logs": [{"message": "Planner initialized. Launching parallel search.", "type": "system"}],
        "status": "SEARCHING"
    }

# =================================================
# PARALLEL SEARCH NODES (WRITE TO UNIQUE KEYS)
# =================================================
def career_search_node(state: AgentState):
    queries = [
        f"site:boards.greenhouse.io {state['role']} {state['location']}",
        f"site:jobs.lever.co {state['role']} {state['location']}",
        f"{state['role']} {state['location']} careers"
    ]

    leads = []
    for q in queries:
        try:
            res = tavily.search(query=q, max_results=8)
            for r in res.get("results", []):
                leads.append({
                    "company": r["title"].split("-")[0].strip(),
                    "title": r["title"],
                    "url": r["url"],
                    "email": None,
                    "source": "career"
                })
        except Exception:
            pass

    return {"career_leads": leads}

def linkedin_search_node(state: AgentState):
    query = f"site:linkedin.com/jobs {state['role']} {state['location']}"
    leads = []

    try:
        res = tavily.search(query=query, max_results=10)
        for r in res.get("results", []):
            leads.append({
                "company": r["title"].split(" at ")[-1],
                "title": r["title"],
                "url": r["url"],
                "email": None,
                "source": "linkedin"
            })
    except Exception:
        pass

    return {"linkedin_leads": leads}

def wellfound_search_node(state: AgentState):
    query = f"site:wellfound.com/jobs {state['role']} {state['location']}"
    leads = []

    try:
        res = tavily.search(query=query, max_results=8)
        for r in res.get("results", []):
            leads.append({
                "company": r["title"].split("-")[0],
                "title": r["title"],
                "url": r["url"],
                "email": None,
                "source": "wellfound"
            })
    except Exception:
        pass

    return {"wellfound_leads": leads}

# =================================================
# MERGE + VALIDATE + DEDUPE
# =================================================
def merge_and_validate_node(state: AgentState):
    merged = (
        state["career_leads"] +
        state["linkedin_leads"] +
        state["wellfound_leads"]
    )

    valid = []
    for l in merged:
        if not l.get("company") or not l.get("title"):
            continue
        if "blog" in l.get("url", "").lower():
            continue
        valid.append(l)

    deduped = deduplicate_leads(valid)

    return {
        "candidate_leads": deduped,
        "logs": [{"message": f"Merged + validated {len(deduped)} unique leads", "type": "thought"}],
        "status": "SCORING"
    }

# =================================================
# SCORING
# =================================================
def score_lead(lead, state):
    score = 0.0
    reasons = []

    if lead["source"] == "career":
        score += 0.4
        reasons.append("ATS source")
    elif lead["source"] == "wellfound":
        score += 0.3
    elif lead["source"] == "linkedin":
        score += 0.2

    if state["role"].lower() in lead["title"].lower():
        score += 0.2
        reasons.append("Role match")

    score += 0.1

    lead["score"] = round(score, 2)
    lead["confidence"] = (
        "HIGH" if score >= 0.75 else
        "MEDIUM" if score >= 0.6 else
        "LOW"
    )
    lead["reasons"] = reasons

    return lead

def scoring_node(state: AgentState):
    scored = [score_lead(l, state) for l in state["candidate_leads"]]
    final = [l for l in scored if l["score"] >= 0.65]

    return {
        "leads": final,
        "logs": [{"message": f"Scoring approved {len(final)} leads", "type": "thought"}],
        "status": "ENRICHING"
    }

# =================================================
# LLM EMAIL EXTRACTION
# =================================================
def email_enrichment_node(state: AgentState):
    enriched = []

    for lead in state["leads"]:
        if lead["confidence"] != "HIGH":
            enriched.append(lead)
            continue

        prompt = f"""
        Extract a hiring or careers email from this job posting.
        If none is visible, return null.

        Company: {lead['company']}
        Job Title: {lead['title']}
        URL: {lead['url']}

        Return JSON ONLY:
        {{ "email": string | null }}
        """

        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            content = response.content.replace("```json", "").replace("```", "").strip()
            lead["email"] = json.loads(content).get("email")
            lead["email_source"] = "LLM"
        except Exception:
            lead["email"] = None

        enriched.append(lead)

    return {
        "leads": enriched,
        "logs": [{"message": "LLM email enrichment completed", "type": "action"}],
        "status": "SAVING"
    }

# =================================================
# SAVE
# =================================================
def save_node(state: AgentState):
    if not SHEET or not state["leads"]:
        return {"status": "COMPLETED"}

    rows = []
    for l in state["leads"]:
        email = l.get("email") or f"careers@{l['company'].lower().replace(' ', '')}.com"
        rows.append([
            "Hiring Team",
            email,
            l["company"],
            l["confidence"],
            f"{l['title']} | {l['url']}"
        ])

    SHEET.append_rows(rows)

    return {
        "status": "COMPLETED",
        "logs": [{"message": f"Saved {len(rows)} leads", "type": "system"}]
    }

# =================================================
# GRAPH
# =================================================
workflow = StateGraph(AgentState)

workflow.add_node("planner", planner_node)
workflow.add_node("career", career_search_node)
workflow.add_node("linkedin", linkedin_search_node)
workflow.add_node("wellfound", wellfound_search_node)
workflow.add_node("merge_validate", merge_and_validate_node)
workflow.add_node("score", scoring_node)
workflow.add_node("email_enrich", email_enrichment_node)
workflow.add_node("save", save_node)

workflow.set_entry_point("planner")

workflow.add_edge("planner", "career")
workflow.add_edge("planner", "linkedin")
workflow.add_edge("planner", "wellfound")

workflow.add_edge("career", "merge_validate")
workflow.add_edge("linkedin", "merge_validate")
workflow.add_edge("wellfound", "merge_validate")

workflow.add_edge("merge_validate", "score")
workflow.add_edge("score", "email_enrich")
workflow.add_edge("email_enrich", "save")
workflow.add_edge("save", END)

app_graph = workflow.compile()
