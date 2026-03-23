'use client';

import { useEntityStore } from '@/stores/useEntityStore';

const CHARACTERS = [
  {
    id: 'sonic',
    name: 'Sonic',
    emoji: '🦔',
    description: 'Speed assistant — TB intelligence + GIS commands',
    features: ['TB breach monitoring', 'GIS map commands', 'M&E integration', 'Workflow assistant'],
    available: true,
  },
  {
    id: 'mimi',
    name: 'Mimi',
    emoji: '🐰',
    description: 'Friendly helper — same intelligence, softer style',
    features: ['All Sonic capabilities', 'Gentle personality', 'Encourages the team'],
    available: true,
  },
  {
    id: 'robot',
    name: 'Robot',
    emoji: '🤖',
    description: 'Tech companion — coming soon',
    features: ['All capabilities', 'Analytical tone', 'Data-first personality'],
    available: false,
  },
] as const;

export function CharacterSelector() {
  const characterType = useEntityStore(s => s.characterType);
  const setCharacterType = useEntityStore(s => s.setCharacterType);

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Choose Your Assistant</h3>
        <p className="text-xs text-slate-500">All characters have the same intelligence and capabilities</p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {CHARACTERS.map(char => (
          <button
            key={char.id}
            disabled={!char.available}
            onClick={() => char.available && setCharacterType(char.id)}
            className={`
              relative p-4 rounded-2xl border-2 text-left transition-all
              ${characterType === char.id
                ? 'border-cyan-500 bg-cyan-50 shadow-md shadow-cyan-100'
                : char.available
                  ? 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
                  : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{char.emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-sm">{char.name}</div>
                <div className="text-xs text-slate-500">{char.description}</div>
              </div>
              {characterType === char.id && (
                <span className="text-cyan-500 font-bold text-xs">ACTIVE ✓</span>
              )}
              {!char.available && (
                <span className="text-slate-400 text-xs">Soon</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {char.features.map(f => (
                <span key={f} className="text-[10px] bg-white border border-slate-200 
                                         rounded-full px-2 py-0.5 text-slate-500">
                  {f}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
