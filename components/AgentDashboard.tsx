import React, { useEffect, useRef, useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import type { JobCriteria } from '../App';
import { api, LogEntry, SavedLead, AgentStatus } from '../services/api';

interface AgentDashboardProps {
  criteria: JobCriteria;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ criteria }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [agentState, setAgentState] = useState<AgentStatus>('IDLE');
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
            id: 'init', 
            timestamp: new Date().toLocaleTimeString(), 
            message: 'Handshaking with Backend Controller...', 
            type: 'system' 
        }]);

        const response = await api.startAgent(criteria);
        setRunId(response.run_id);
        setAgentState(response.status);
      } catch (error) {
        setLogs(prev => [...prev, {
            id: 'err', 
            timestamp: new Date().toLocaleTimeString(), 
            message: `Connection Error: ${error instanceof Error ? error.message : 'Unknown'}`, 
            type: 'error'
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
            const state = await api.getAgentState(runId);
            
            // Sync local state with backend state
            setAgentState(state.status);
            setLogs(state.logs);
            setSavedLeads(state.leads);

            if (state.status === 'COMPLETED' || state.status === 'FAILED') {
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
    const headers = ['First Name', 'Email', 'Company', 'Job Title', 'URL', 'Source'];
    const csvContent = [
      headers.join(','),
      ...savedLeads.map(row => 
        [row.fname, row.email, row.company, row.title, row.url, row.source]
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
          label="REASON" 
        />
        <StateNode 
          active={agentState === 'SAVING'} 
          completed={['COMPLETED'].includes(agentState)}
          icon={<Save className="w-5 h-5" />} 
          label="EXTRACT" 
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
            {agentState !== 'COMPLETED' && agentState !== 'IDLE' && agentState !== 'FAILED' && (
                <div className="flex items-center gap-2">
                     <span className="text-[10px] text-slate-500 animate-pulse">Polling</span>
                     <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs md:text-sm custom-scrollbar">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                 <div className="mt-0.5 shrink-0 opacity-50">
                    {log.type === 'thought' && <BrainCircuit className="w-3 h-3 text-pink-400" />}
                    {log.type === 'action' && <ArrowRight className="w-3 h-3 text-indigo-400" />}
                    {log.type === 'system' && <Terminal className="w-3 h-3 text-slate-500" />}
                    {log.type === 'error' && <AlertTriangleIcon className="w-3 h-3 text-red-500" />}
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
                   <h3 className="font-bold text-slate-800 text-sm">Extracted Leads</h3>
                   <p className="text-[10px] text-slate-500">
                     {savedLeads.length} jobs found • From Backend
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
                      <th className="px-4 py-2 font-semibold">Source</th>
                      <th className="px-4 py-2 font-semibold">Email</th>
                      <th className="px-4 py-2 font-semibold text-right">Link</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                   {savedLeads.map((lead, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors animate-in slide-in-from-bottom-2">
                         <td className="px-4 py-3 font-medium text-slate-900">{lead.company}</td>
                         <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">{lead.title}</td>
                         <td className="px-4 py-3 text-slate-600 text-xs font-mono">{lead.source}</td>
                         <td className="px-4 py-3 text-slate-500 font-mono text-xs">{lead.email}</td>
                         <td className="px-4 py-3 text-right">
                            <a href={lead.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs">View</a>
                         </td>
                      </tr>
                   ))}
                   {savedLeads.length === 0 && (
                      <tr>
                         <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                            {agentState === 'COMPLETED' 
                               ? 'Backend workflow finished. No jobs found.' 
                               : agentState === 'FAILED' ? 'Backend process failed.' : 'Waiting for backend results...'}
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

const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);

export default AgentDashboard;