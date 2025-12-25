import React, { useState } from 'react';
import { Bot, Briefcase } from 'lucide-react';
import AgentConfig from './components/AgentConfig';
import AgentDashboard from './components/AgentDashboard';

export type JobCriteria = {
  role: string;
  location: string;
  experience: string;
  skills: string;
};

const App: React.FC = () => {
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [criteria, setCriteria] = useState<JobCriteria>({
    role: '',
    location: '',
    experience: '',
    skills: ''
  });

  const startAgent = (newCriteria: JobCriteria) => {
    setCriteria(newCriteria);
    setIsAgentRunning(true);
  };

  const resetAgent = () => {
    setIsAgentRunning(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-600/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              JobHunter.ai
            </h1>
          </div>
          {isAgentRunning && (
            <button 
              onClick={resetAgent}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              New Search
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isAgentRunning ? (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Hire an AI to do the work.
              </h2>
              <p className="text-lg text-slate-400 max-w-lg mx-auto">
                Configure your autonomous agent to search, filter, apply, and reach out to recruiters on your behalf.
              </p>
            </div>
            <AgentConfig onStart={startAgent} />
          </div>
        ) : (
          <AgentDashboard criteria={criteria} />
        )}
      </main>
    </div>
  );
};

export default App;