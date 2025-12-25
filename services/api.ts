// --- CONFIGURATION ---
// Set this to FALSE to connect to your local Python backend (e.g., FastAPI)
// Set this to TRUE to use the simulation for UI testing
const USE_MOCK_BACKEND = true;
const API_BASE_URL = 'http://localhost:8000/api';

// --- TYPES ---
export interface JobCriteria {
  role: string;
  location: string;
  experience: string;
  skills: string;
}

export type AgentStatus = 'IDLE' | 'PLANNING' | 'SEARCHING' | 'FILTERING' | 'SAVING' | 'COMPLETED' | 'FAILED';

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'thought' | 'action' | 'system' | 'error';
}

export interface SavedLead {
  fname: string;
  email: string;
  company: string;
  title: string;
  url: string;
  source: string;
}

export interface AgentRunResponse {
  run_id: string;
  status: AgentStatus;
}

export interface AgentStateResponse {
  status: AgentStatus;
  logs: LogEntry[];
  leads: SavedLead[];
}

// --- API SERVICE ---

export const api = {
  /**
   * Starts the agent workflow on the backend
   */
  startAgent: async (criteria: JobCriteria): Promise<AgentRunResponse> => {
    if (USE_MOCK_BACKEND) return mockStartAgent(criteria);

    const response = await fetch(`${API_BASE_URL}/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria),
    });
    if (!response.ok) throw new Error('Failed to start agent');
    return response.json();
  },

  /**
   * Polls the backend for the current status, new logs, and found leads
   */
  getAgentState: async (runId: string): Promise<AgentStateResponse> => {
    if (USE_MOCK_BACKEND) return mockGetState(runId);

    const response = await fetch(`${API_BASE_URL}/agent/run/${runId}`);
    if (!response.ok) throw new Error('Failed to fetch agent state');
    return response.json();
  }
};

// --- MOCK IMPLEMENTATION (FOR UI DEMO ONLY) ---
// This simulates a LangGraph backend delay and streaming

let mockState: AgentStateResponse = { status: 'IDLE', logs: [], leads: [] };
let mockStartTime = 0;

const mockStartAgent = async (criteria: JobCriteria): Promise<AgentRunResponse> => {
  mockStartTime = Date.now();
  mockState = {
    status: 'PLANNING',
    logs: [{ id: '1', timestamp: new Date().toLocaleTimeString(), message: 'Received request. Initializing LangGraph workflow...', type: 'system' }],
    leads: []
  };
  return { run_id: 'mock-run-123', status: 'PLANNING' };
};

const mockGetState = async (runId: string): Promise<AgentStateResponse> => {
  const elapsed = Date.now() - mockStartTime;
  
  // Simulate workflow progression over time
  if (elapsed > 1000 && mockState.status === 'PLANNING') {
    mockState.status = 'SEARCHING';
    mockState.logs.push({ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), message: 'PLAN: Decomposing task into 3 sub-nodes: LinkedIn, Wellfound, Direct.', type: 'thought' });
  }
  
  if (elapsed > 3000 && mockState.status === 'SEARCHING') {
    mockState.logs.push({ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), message: 'NODE: SearchTools - Querying "Senior Frontend" on LinkedIn...', type: 'action' });
  }

  if (elapsed > 6000 && mockState.status === 'SEARCHING') {
    mockState.status = 'FILTERING';
    mockState.logs.push({ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), message: 'Received 12 raw results. Filtering for "Senior" level...', type: 'thought' });
  }

  if (elapsed > 8000 && mockState.leads.length === 0) {
    mockState.status = 'SAVING';
    mockState.logs.push({ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), message: 'Match Found: Acme Corp. Extracting contact info...', type: 'action' });
    mockState.leads.push({
      company: 'Acme Corp',
      title: 'Senior Frontend Engineer',
      fname: 'Sarah Jones',
      email: 'sarah.j@acme.co',
      url: 'https://linkedin.com/jobs/view/123',
      source: 'LinkedIn'
    });
  }

  if (elapsed > 12000 && mockState.status !== 'COMPLETED') {
    mockState.status = 'COMPLETED';
    mockState.logs.push({ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), message: 'Workflow finished successfully.', type: 'system' });
  }

  return { ...mockState };
};
