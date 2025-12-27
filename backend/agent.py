import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from typing import TypedDict, List
from dotenv import load_dotenv

# LangChain & LangGraph Imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from tavily import TavilyClient
from langchain_core.messages import HumanMessage

# Load environment variables
load_dotenv()

# --- 1. Setup & Authentication ---
# We use gemini-1.5-flash because it has a huge context window (can read 100s of jobs)
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# Google Sheets Auth
SCOPE = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
try:
    creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", SCOPE)
    client = gspread.authorize(creds)
    SHEET = client.open("Job emails").sheet1 
    print("✅ Successfully connected to Google Sheet: Job emails")
except Exception as e:
    print(f"⚠️ Google Sheets Error: {e}")
    SHEET = None

# --- 2. Define State ---
class AgentState(TypedDict):
    role: str
    location: str
    experience: str
    skills: str
    search_queries: List[str]
    raw_search_results: List[str]
    leads: List[dict]
    logs: List[dict]
    status: str

# --- 3. Define Workflow Nodes ---

def planner_node(state: AgentState):
    """Generate diverse search queries to maximize volume."""
    print(f"--- PLANNING: {state['role']} ---")
    
    # Strategy: Use Boolean search operators to find ATS systems directly
    prompt = f"""
    You are a high-volume recruiter. Generate 6 HIGH-YIELD Google search queries to find "{state['role']}" jobs in "{state['location']}".
    
    Strategies:
    1. Standard: "{state['role']} jobs {state['location']} hiring now"
    2. ATS Deep Dive: "site:boards.greenhouse.io {state['role']} {state['location']}"
    3. ATS Deep Dive: "site:jobs.lever.co {state['role']} {state['location']}"
    4. Startup Focus: "site:wellfound.com {state['role']} {state['location']}"
    5. Aggregators: "site:linkedin.com/jobs {state['role']} {state['location']}"
    6. Direct Careers: "{state['role']} {state['location']} careers email"

    Return ONLY a JSON list of strings.
    """
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.replace("```json", "").replace("```", "").strip()
        queries = json.loads(content)
    except Exception as e:
        print(f"Error: {e}")
        # Fallback if LLM fails
        queries = [
            f"{state['role']} jobs {state['location']}",
            f"site:greenhouse.io {state['role']} {state['location']}",
            f"site:lever.co {state['role']} {state['location']}",
            f"site:wellfound.com {state['role']} {state['location']}"
        ]

    return {
        "search_queries": queries, 
        "logs": [{"message": f"Strategy: Generated {len(queries)} high-yield search vectors.", "type": "thought"}]
    }

def search_node(state: AgentState):
    """Search the web with high volume settings."""
    print("--- SEARCHING ---")
    queries = state["search_queries"]
    all_results = []
    
    # We limit to first 5 queries to save time, but request MORE results per query
    for q in queries[:6]:
        try:
            # max_results=10 increases yield significantly (6 queries * 10 = 60 raw pages)
            res = tavily.search(query=q, search_depth="basic", max_results=10)
            for r in res.get('results', []):
                # We retain content to scan for emails later
                all_results.append(f"URL: {r['url']}\nTitle: {r['title']}\nSnippet: {r['content']}")
        except Exception as e:
            print(f"Search error for {q}: {e}")

    return {
        "raw_search_results": all_results,
        "logs": [{"message": f"Scraped {len(all_results)} raw job pages from the web.", "type": "action"}]
    }

def filter_node(state: AgentState):
    """Extract valid jobs and GUESS emails."""
    print("--- FILTERING & ENRICHING ---")
    
    # We process in batches to avoid overwhelming the LLM
    raw_data = state['raw_search_results']
    leads = []
    
    # Simple chunking if too many results
    chunk_size = 30
    chunks = [raw_data[i:i + chunk_size] for i in range(0, len(raw_data), chunk_size)]

    for i, chunk in enumerate(chunks):
        context = "\n\n".join(chunk)
        
        prompt = f"""
        You are an expert data extractor. Analyze these search results for "{state['role']}" jobs.
        
        STRICT RULES:
        1. EXPERIENCE MATCH: If user asked for "{state['experience']}", EXCLUDE "Senior", "Staff", "Principal", "Lead" roles unless user is Senior.
        2. VALID JOBS ONLY: Ignore blogs, listicles, or courses. Only real job postings.
        
        EMAIL DISCOVERY LOGIC:
        - If you see an email in the snippet (e.g., jobs@company.com), EXTRACT IT.
        - If NO email is found, GUESS a generic hiring email based on company name (e.g., careers@company-name.com).
        - Mark guessed emails as "Guessed" in source.
        
        Return a JSON list of objects with keys: "company", "title", "url", "email", "source".
        Context:
        {context}
        """
        
        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            content = response.content.replace("```json", "").replace("```", "").strip()
            batch_leads = json.loads(content)
            leads.extend(batch_leads)
        except Exception as e:
            print(f"Batch {i} failed: {e}")
            continue

    # Remove duplicates based on URL
    unique_leads = {l['url']: l for l in leads}.values()
    
    return {
        "leads": list(unique_leads),
        "logs": [{"message": f"AI Filtered & Enriched: {len(unique_leads)} high-quality leads found.", "type": "thought"}]
    }

def save_node(state: AgentState):
    """Save to Google Sheet."""
    print("--- SAVING ---")
    leads = state["leads"]
    
    if SHEET and leads:
        rows_to_add = []
        for lead in leads:
            # Clean up the email field
            email = lead.get("email", "N/A")
            if not email or email == "Unknown":
                # Fallback heuristic if AI missed it
                company_clean = lead.get("company", "").lower().replace(" ", "")
                email = f"careers@{company_clean}.com"

            # [First Name, Email, Company, Status, AI Insights]
            rows_to_add.append([
                "Hiring Team",           
                email,                   
                lead.get("company"),     
                "New Lead",              
                f"{lead.get('title')} | {lead.get('url')}"
            ])
        
        try:
            SHEET.append_rows(rows_to_add)
            msg = f"Success! Saved {len(rows_to_add)} new leads to Google Sheet."
        except Exception as e:
            msg = f"Error writing to sheet: {e}"
    else:
        msg = "Skipping save (No leads found)."

    return {
        "status": "COMPLETED",
        "logs": [{"message": msg, "type": "system"}]
    }

# --- 4. Build Graph ---
workflow = StateGraph(AgentState)
workflow.add_node("planner", planner_node)
workflow.add_node("searcher", search_node)
workflow.add_node("filter", filter_node)
workflow.add_node("saver", save_node)

workflow.set_entry_point("planner")
workflow.add_edge("planner", "searcher")
workflow.add_edge("searcher", "filter")
workflow.add_edge("filter", "saver")
workflow.add_edge("saver", END)

app_graph = workflow.compile()