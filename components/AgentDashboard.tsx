import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { 
  Terminal, 
  Loader2, 
  CheckCircle2, 
  Table2,
  Download,
  BrainCircuit,
  Search,
  Filter,
  Save,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import type { JobCriteria } from '../App';

// --- Types match your Python Backend ---
interface LogEntry {
  id?: string;
  message: string;
  type: 'thought' | 'action' | 'system' | 'error';
  timestamp?: string;
}

interface JobLead {
  company: string;
  title: string;
  url: string;
  source?: string;
  email?: string; // Optional, as backend finds Job Posts first
}

interface AgentDashboardProps {
  criteria: JobCriteria;
}

const API_BASE_URL = "http://localhost:8000";

const AgentDashboard: React.FC<AgentDashboardProps> = ({ criteria }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [savedLeads, setSavedLeads] = useState<JobLead[]>([]);
  const [agentState, setAgentState] = useState<string>('IDLE');
  const [runId, setRunId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<number | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // --- 1. Start the Agent on Mount ---
  useEffect(() => {
    const initAgent = async () => {
      try {
        setAgentState('PLANNING');
        setLogs([{ 
            message: 'Initializing connection to Python Backend...', 
            type: 'system',
            timestamp: new Date().toLocaleTimeString()
        }]);

        // Call the Python Backend
        const response = await axios.post(`${API_BASE_URL}/api/agent/run`, criteria);
        
        setRunId(response.data.run_id);
        setAgentState(response.data.status);
      } catch (error) {
        console.error(error);
        setLogs(prev => [...prev, {
            message: `Connection Error: Is the backend running on port 8000?`, 
            type: 'error',
            timestamp: new Date().toLocaleTimeString()
        }]);
        setAgentState('FAILED');
      }
    };

    initAgent();

    return () => {
      if (pollingInterval.current) window.clearInterval(pollingInterval.current);
    };
  }, [criteria]);

  // --- 2. Poll for Updates ---
  useEffect(() => {
    if (!runId || agentState === 'COMPLETED' || agentState === 'FAILED') {
        if (pollingInterval.current) window.clearInterval(pollingInterval.current);
        return;
    }

    pollingInterval.current = window.setInterval(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/agent/run/${runId}`);
            const state = response.data;
            
            // Update UI State
            setAgentState(state.status);
            setLogs(state.logs || []);
            setSavedLeads(state.leads || []);

            if (state.status === 'COMPLETED' || state.status === 'ERROR') {
                if (pollingInterval.current) window.clearInterval(pollingInterval.current);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }, 1000); // Poll every 1 second

    return () => {
        if (pollingInterval.current) window.clearInterval(pollingInterval.current);
    };
  }, [runId, agentState]);

  const downloadCSV = () => {
    if (savedLeads.length === 0) return;
    const headers = ['Company', 'Job Title', 'URL', 'Source'];
    const csvContent = [
      headers.join(','),
      ...savedLeads.map(row => 
        [row.company, row.title, row.url, row.source || 'Web']
          .map(field => `"${field || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'agent_job_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
      
      {/* Visual State Graph */}
      <div className="h-24 bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-around relative overflow-hidden">
        <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-800 -z-0"></div>
        
        <StateNode 
          active={agentState === 'PLANNING'} 
          completed={['SEARCHING', 'FILTERING', 'SAVING', 'COMPLETED'].includes(agentState)}
          icon={<BrainCircuit className="w-5 h-5" />} 
          label="PLAN" 
        />
        <StateNode 
          active={agentState === 'SEARCHING'} 
          completed={['FILTERING', 'SAVING', 'COMPLETED'].includes(agentState)}
          icon={<Search className="w-5 h-5" />} 
          label="SEARCH" 
        />
        <StateNode 
          active={agentState === 'FILTERING'} 
          completed={['SAVING', 'COMPLETED'].includes(agentState)}
          icon={<Filter className="w-5 h-5" />} 
          label="FILTER" 
        />
        <StateNode 
          active={agentState === 'SAVING'} 
          completed={['COMPLETED'].includes(agentState)}
          icon={<Save className="w-5 h-5" />} 
          label="SAVE" 
        />
        <StateNode 
          active={agentState === 'COMPLETED'} 
          completed={false}
          icon={<CheckCircle2 className="w-5 h-5" />} 
          label="DONE" 
        />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* Log Stream */}
        <div className="lg:col-span-1 bg-slate-950 rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="font-mono text-xs text-slate-400 font-bold uppercase tracking-wider">Backend Stream</span>
            </div>
            {agentState !== 'COMPLETED' && agentState !== 'IDLE' && agentState !== 'FAILED' && agentState !== 'ERROR' && (
                <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 animate-pulse">Live</span>
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs md:text-sm custom-scrollbar">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                 <div className="mt-0.5 shrink-0 opacity-50">
                    {log.type === 'thought' && <BrainCircuit className="w-3 h-3 text-pink-400" />}
                    {log.type === 'action' && <ArrowRight className="w-3 h-3 text-indigo-400" />}
                    {log.type === 'system' && <Terminal className="w-3 h-3 text-slate-500" />}
                    {log.type === 'error' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-600 mb-0.5 uppercase tracking-widest">{log.type}</span>
                    <span className={`${
                      log.type === 'thought' ? 'text-pink-300 italic' :
                      log.type === 'action' ? 'text-indigo-300' :
                      log.type === 'error' ? 'text-red-400' :
                      'text-slate-300'
                    }`}>
                      {log.message}
                    </span>
                 </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Results Data Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-300 flex flex-col shadow-lg overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Table2 className="w-5 h-5 text-slate-700" />
                <div>
                   <h3 className="font-bold text-slate-800 text-sm">Extracted Jobs</h3>
                   <p className="text-[10px] text-slate-500">
                     {savedLeads.length} jobs found • Synced to Google Sheet
                   </p>
                </div>
             </div>
             
             <button 
                onClick={downloadCSV}
                disabled={savedLeads.length === 0}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium border
                  ${savedLeads.length > 0 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
             >
                <Download className="w-3 h-3" /> Export CSV
             </button>
          </div>
          
          <div className="flex-1 overflow-x-auto bg-slate-50/50">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                   <tr>
                      <th className="px-4 py-2 font-semibold">Company</th>
                      <th className="px-4 py-2 font-semibold">Role</th>
                      <th className="px-4 py-2 font-semibold">Contact / Email</th>
                      <th className="px-4 py-2 font-semibold">Source</th>
                      <th className="px-4 py-2 font-semibold text-right">Link</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                   {savedLeads.map((lead, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors animate-in slide-in-from-bottom-2">
                         <td className="px-4 py-3 font-medium text-slate-900">{lead.company}</td>
                         <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={lead.title}>{lead.title}</td>
                         {/* Placeholder for Email since backend finds Job Listings first */}
                         <td className="px-4 py-3 text-slate-400 font-mono text-xs italic">
                            {lead.email || "Hiring Team"}
                         </td>
                         <td className="px-4 py-3 text-slate-600 text-xs font-mono">{lead.source || "Web"}</td>
                         <td className="px-4 py-3 text-right">
                            <a href={lead.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-semibold">
                               Apply &rarr;
                            </a>
                         </td>
                      </tr>
                   ))}
                   {savedLeads.length === 0 && (
                      <tr>
                         <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                            {agentState === 'COMPLETED' 
                               ? 'Workflow finished. No matching jobs found.' 
                               : agentState === 'FAILED' ? 'Backend connection failed.' : 'Agent is scanning the web...'}
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Helper Components ---
const StateNode: React.FC<{ active: boolean; completed: boolean; icon: React.ReactNode; label: string }> = ({ 
  active, completed, icon, label 
}) => (
  <div className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-500 ${active ? 'scale-110' : 'scale-100'}`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
      ${active ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 
        completed ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-800 border-slate-700'}
    `}>
      <div className={`text-white ${active ? 'animate-pulse' : ''}`}>{icon}</div>
    </div>
    <span className={`text-[10px] font-bold tracking-wider transition-colors duration-300
      ${active ? 'text-indigo-400' : completed ? 'text-emerald-400' : 'text-slate-600'}
    `}>{label}</span>
  </div>
);

export default AgentDashboard;