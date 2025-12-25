import React, { useState } from 'react';
import { ArrowRight, MapPin, Briefcase, Star, Code } from 'lucide-react';
import type { JobCriteria } from '../App';

interface AgentConfigProps {
  onStart: (criteria: JobCriteria) => void;
}

const AgentConfig: React.FC<AgentConfigProps> = ({ onStart }) => {
  const [role, setRole] = useState('Senior Frontend Engineer');
  const [location, setLocation] = useState('Remote (US/EU)');
  const [experience, setExperience] = useState('5+ years');
  const [skills, setSkills] = useState('React, TypeScript, Tailwind, Gemini API');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({ role, location, experience, skills });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl shadow-xl backdrop-blur-sm relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" /> Target Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              placeholder="e.g. Product Designer"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-400" /> Location Preference
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
              placeholder="e.g. San Francisco, CA"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Experience Level
          </label>
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none"
          >
            <option>Entry Level (0-2 years)</option>
            <option>Mid Level (2-5 years)</option>
            <option>Senior (5-8 years)</option>
            <option>Staff/Principal (8+ years)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" /> Key Skills & Tech Stack
          </label>
          <textarea
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all h-24 resize-none"
            placeholder="List your top skills..."
            required
          />
        </div>

        <button
          type="submit"
          className="w-full group relative flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            Initialize Agent Workflow <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </div>
    </form>
  );
};

export default AgentConfig;