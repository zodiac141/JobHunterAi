import React, { ReactNode } from 'react';

interface CapabilityCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

const CapabilityCard: React.FC<CapabilityCardProps> = ({ icon, title, description }) => {
  return (
    <div className="group bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
      <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:bg-indigo-500/20">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-indigo-300 transition-colors">
        {title}
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default CapabilityCard;