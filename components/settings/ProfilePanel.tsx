'use client';

import { motion } from 'framer-motion';
import { User, Camera } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ProfilePanel() {
  const { data: session } = useSession();
  const userState = session?.user?.state || 'Maharashtra';
  const supervisorName = 'Firoz Khan';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border border-slate-200/60 shadow-lg rounded-2xl p-8 overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-blue-600/10 rounded-full -mr-20 -mt-20" />
      
      <div className="relative z-10">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">My Assignment</p>
        
        <div className="flex items-start gap-6 mb-8">
          <div className="relative group w-24 h-24 flex-shrink-0">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{session?.user?.name || 'User'}</h2>
            <p className="text-slate-600 font-medium mt-1">{session?.user?.role || 'Program Officer'}</p>
            
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 font-semibold mb-2">Assigned District/State</p>
              <span className="inline-block px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-200">
                {userState}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 font-semibold mb-2">Reporting To</p>
          <p className="text-lg font-semibold text-slate-900">{supervisorName}</p>
        </div>
      </div>
    </motion.div>
  );
}
