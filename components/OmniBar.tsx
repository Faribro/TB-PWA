'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/stores/useUIStore';
import { useEntityStore } from '@/stores/useEntityStore';
import { useOmniBar } from '@/hooks/useOmniBar';
import { 
  Search, 
  Home, 
  Map, 
  Activity, 
  Languages, 
  Users, 
  BarChart3,
  Network,
  Calendar,
  Settings
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  category: 'Navigation' | 'Triage Actions' | 'Patient Search' | 'System Settings';
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export const OmniBar = () => {
  useOmniBar();
  
  const router = useRouter();
  const isOpen = useUIStore((state) => state.isOmniBarOpen);
  const setOmniBarOpen = useUIStore((state) => state.setOmniBarOpen);
  const setSonicLanguage = useEntityStore((state) => state.setSonicLanguage);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      icon: <Home className="w-4 h-4" />,
      action: () => {
        router.push('/dashboard');
        setOmniBarOpen(false);
      },
      keywords: ['home', 'main', 'overview']
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      icon: <Home className="w-4 h-4" />,
      action: () => {
        router.push('/dashboard');
        setOmniBarOpen(false);
      },
      keywords: ['home', 'main', 'overview']
    },
    {
      id: 'nav-gis',
      label: 'Go to GIS Map',
      category: 'Navigation',
      icon: <Map className="w-4 h-4" />,
      action: () => {
        router.push('/dashboard/gis');
        setOmniBarOpen(false);
      },
      keywords: ['map', 'spatial', 'geographic']
    },
    {
      id: 'nav-vertex',
      label: 'Go to Vertex Dashboard',
      category: 'Navigation',
      icon: <Network className="w-4 h-4" />,
      action: () => {
        router.push('/dashboard/vertex');
        setOmniBarOpen(false);
      },
      keywords: ['neural', '3d', 'network']
    },
    {
      id: 'nav-followup',
      label: 'Go to Follow-up Pipeline',
      category: 'Navigation',
      icon: <Activity className="w-4 h-4" />,
      action: () => {
        router.push('/dashboard/follow-up');
        setOmniBarOpen(false);
      },
      keywords: ['pipeline', 'patients', 'tracking']
    },
    {
      id: 'nav-mande',
      label: 'Go to M&E Hub',
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        router.push('/dashboard/mande');
        setOmniBarOpen(false);
      },
      keywords: ['monitoring', 'evaluation', 'duplicates']
    },
    {
      id: 'nav-calendar',
      label: 'Go to Calendar',
      category: 'Navigation',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        router.push('/dashboard/calendar');
        setOmniBarOpen(false);
      },
      keywords: ['schedule', 'appointments']
    },
    {
      id: 'triage-bulk',
      label: 'Initiate Bulk Triage',
      category: 'Triage Actions',
      icon: <Users className="w-4 h-4" />,
      action: () => {
        // Trigger bulk triage logic
        console.log('Bulk triage initiated');
        setOmniBarOpen(false);
      },
      keywords: ['bulk', 'mass', 'multiple']
    },
    {
      id: 'lang-hindi',
      label: 'Change Language to Hindi',
      category: 'System Settings',
      icon: <Languages className="w-4 h-4" />,
      action: () => {
        setSonicLanguage('hi');
        setOmniBarOpen(false);
      },
      keywords: ['हिंदी', 'language', 'translate']
    },
    {
      id: 'lang-english',
      label: 'Change Language to English',
      category: 'System Settings',
      icon: <Languages className="w-4 h-4" />,
      action: () => {
        setSonicLanguage('en');
        setOmniBarOpen(false);
      },
      keywords: ['language', 'translate']
    },
    {
      id: 'lang-tamil',
      label: 'Change Language to Tamil',
      category: 'System Settings',
      icon: <Languages className="w-4 h-4" />,
      action: () => {
        setSonicLanguage('ta');
        setOmniBarOpen(false);
      },
      keywords: ['தமிழ்', 'language', 'translate']
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    const query = searchQuery.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(query) ||
      cmd.category.toLowerCase().includes(query) ||
      cmd.keywords?.some((kw) => kw.toLowerCase().includes(query))
    );
  });

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOmniBarOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filteredCommands[selectedIndex]?.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, setOmniBarOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]"
            onClick={() => setOmniBarOpen(false)}
          />

          {/* Omni-Bar Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[100001]"
          >
            <div className="mx-4 bg-slate-950/80 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/50">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-white text-lg placeholder:text-slate-500 outline-none"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 bg-slate-800/50 rounded border border-slate-700">
                  ESC
                </kbd>
              </div>

              {/* Commands List */}
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {Object.keys(groupedCommands).length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-500">
                    No commands found
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, cmds]) => (
                    <div key={category} className="py-3">
                      <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {category}
                      </div>
                      {cmds.map((cmd, idx) => {
                        const globalIndex = filteredCommands.indexOf(cmd);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <button
                            key={cmd.id}
                            onClick={cmd.action}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center gap-4 px-6 py-3 transition-colors ${
                              isSelected
                                ? 'bg-blue-600/20 border-l-2 border-blue-500'
                                : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                            }`}
                          >
                            <div className={`${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
                              {cmd.icon}
                            </div>
                            <span className={`flex-1 text-left ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {cmd.label}
                            </span>
                            {isSelected && (
                              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 bg-slate-800/50 rounded border border-slate-700">
                                ↵
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800/50 bg-slate-900/50">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-800/50 rounded border border-slate-700">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-slate-800/50 rounded border border-slate-700">↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-800/50 rounded border border-slate-700">↵</kbd>
                    Select
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
