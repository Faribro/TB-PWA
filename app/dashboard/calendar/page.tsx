'use client';

import { motion } from 'framer-motion';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-4xl font-black text-slate-900 mb-2">📅 Calendar</h1>
        <p className="text-slate-600 mb-8">Daily screening data and schedule</p>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📅</p>
            <p className="text-slate-600 text-lg">Calendar view coming soon</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
