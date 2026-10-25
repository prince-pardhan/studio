/**
 * BeatFlow Studio - Project Starter Templates Modal
 * Instant creation of 15 genre-based starter projects (Trap, Drill, Boom Bap, Lo-Fi,
 * House, Techno, EDM, DnB, Pop, Rock, Ambient, Cinematic, Bollywood, Punjabi, Indian Classical).
 */
import React from 'react';
import { Layers, Disc, Sparkles } from 'lucide-react';
import { Genre } from '../types/project';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGenre: (genre: Genre | 'synthwave') => void;
}

const TEMPLATES: {
  id: Genre | 'synthwave';
  name: string;
  bpm: string;
  key: string;
  desc: string;
  color: string;
  badge: string;
}[] = [
  {
    id: 'trap',
    name: 'Modern Trap / 808',
    bpm: '140 BPM',
    key: 'C Minor',
    desc: 'Tight trap snare, rolling hi-hat flams, and deep pitch-gliding 808 sub bass.',
    color: '#f97316',
    badge: 'HEAVY',
  },
  {
    id: 'drill',
    name: 'UK / NY Drill',
    bpm: '142 BPM',
    key: 'E Minor',
    desc: 'Sliding 808 sub bass, triplet stutter hats, and syncopated rimshot/counter-snare bounce.',
    color: '#ef4444',
    badge: 'DARK',
  },
  {
    id: 'hiphop',
    name: 'Classic Boom Bap',
    bpm: '90 BPM',
    key: 'F Minor',
    desc: 'Heavy kick groove, crisp cracking snare on 2 and 4, vinyl warmth, and soulful chops.',
    color: '#f59e0b',
    badge: 'GROOVE',
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Chillhop Study',
    bpm: '85 BPM',
    key: 'F Minor',
    desc: 'Dusty vinyl tape feel, laid-back rimshot swing, and lush minor 9th electric piano chords.',
    color: '#a855f7',
    badge: 'CHILL',
  },
  {
    id: 'house',
    name: 'Four-on-the-Floor Deep House',
    bpm: '124 BPM',
    key: 'A Minor',
    desc: 'Pumping four-on-the-floor kick, rhythmic offbeat open hats, and driving organ bassline.',
    color: '#10b981',
    badge: 'CLUB',
  },
  {
    id: 'techno',
    name: 'Peak Time Industrial Techno',
    bpm: '132 BPM',
    key: 'D Minor',
    desc: 'Relentless rumble kick, hypnotic layered percussion, and dark resonant filter sweeps.',
    color: '#6366f1',
    badge: 'UNDERGROUND',
  },
  {
    id: 'edm',
    name: 'Euphoric Festival EDM',
    bpm: '128 BPM',
    key: 'F# Minor',
    desc: 'Punchy transient kick, supersaw lead stacks, sidechain compression, and build-up rolls.',
    color: '#3b82f6',
    badge: 'FESTIVAL',
  },
  {
    id: 'dnb',
    name: 'High-Energy Drum & Bass',
    bpm: '174 BPM',
    key: 'E Minor',
    desc: 'Fast syncopated breakbeats, sub-shaking Reese bass, and crisp continuous shaker rhythms.',
    color: '#ec4899',
    badge: '174 BPM',
  },
  {
    id: 'pop',
    name: 'Chart-Topping Modern Pop',
    bpm: '118 BPM',
    key: 'C Major',
    desc: 'Punchy acoustic kick, crisp claps, bright grand piano chords, and catchy synth plucks.',
    color: '#06b6d4',
    badge: 'RADIO',
  },
  {
    id: 'rock',
    name: 'Indie / Alternative Rock',
    bpm: '120 BPM',
    key: 'A Minor',
    desc: 'Dynamic live acoustic kit sound, driving bass guitar ostinato, and organic grit.',
    color: '#e11d48',
    badge: 'ORGANIC',
  },
  {
    id: 'ambient',
    name: 'Ethereal Ambient Soundscape',
    bpm: '70 BPM',
    key: 'G Minor',
    desc: 'Reverb-drenched pad textures, soothing granular delays, and slow cinematic breath.',
    color: '#8b5cf6',
    badge: 'MEDITATION',
  },
  {
    id: 'cinematic',
    name: 'Epic Film & Game Score',
    bpm: '80 BPM',
    key: 'D Minor',
    desc: 'Booming taiko percussion hits, tense brass stabs, and low sub-bass braams.',
    color: '#14b8a6',
    badge: 'CINEMATIC',
  },
  {
    id: 'bollywood',
    name: 'Bollywood Modern Groove',
    bpm: '98 BPM',
    key: 'C Minor',
    desc: 'Syncopated dholak/tabla percussive patterns, bright strings, and energetic rhythmic swing.',
    color: '#ea580c',
    badge: 'FUSION',
  },
  {
    id: 'punjabi',
    name: 'Punjabi Dhol Beats',
    bpm: '96 BPM',
    key: 'D Minor',
    desc: 'Booming bhangra dhol groove, syncopated tumba swing, and powerful lead instrumentation.',
    color: '#d97706',
    badge: 'BHANGRA',
  },
  {
    id: 'classical_indian',
    name: 'Indian Classical Teentaal',
    bpm: '80 BPM',
    key: 'C',
    desc: '16-beat rhythm cycle, alaap melodic improvisation, and tanpura harmonic drone.',
    color: '#059669',
    badge: 'RAGA',
  },
  {
    id: 'synthwave',
    name: '80s Retrowave Neon',
    bpm: '120 BPM',
    key: 'D Minor',
    desc: 'Gated snare reverb, rolling 16th bassline, and nostalgic analog poly synth chords.',
    color: '#06b6d4',
    badge: 'RETRO',
  },
];

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectGenre,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[88vh] bg-[#16171f] border border-[#2d3042] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Starter Genre Templates</h3>
              <p className="text-[11px] text-zinc-400">
                Instantly initialize a complete production session with authentic rhythms, tempo, and instruments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2.5 py-1.5 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        {/* Templates List */}
        <div className="my-4 space-y-2 overflow-y-auto flex-1 pr-1">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                onSelectGenre(tpl.id);
                onClose();
              }}
              className="w-full p-3 bg-[#111218] hover:bg-[#1b1c26] border border-[#242738] hover:border-orange-500/50 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: tpl.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                      {tpl.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#202230] text-zinc-300">
                      {tpl.bpm} · {tpl.key}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{tpl.desc}</p>
                </div>
              </div>

              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2"
                style={{
                  backgroundColor: `${tpl.color}20`,
                  color: tpl.color,
                }}
              >
                {tpl.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[#292c3c]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252838] hover:bg-[#32364a] text-zinc-300 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
