/**
 * BeatFlow Studio - Project Starter Templates Modal
 * Instant creation of genre-based projects (Synthwave, Trap, House, Lo-Fi, Ambient).
 */
import React from 'react';
import { Layers, Disc, Sparkles } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGenre: (genre: 'trap' | 'house' | 'synthwave' | 'lofi' | 'ambient') => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectGenre,
}) => {
  if (!isOpen) return null;

  const templates = [
    {
      id: 'synthwave',
      name: '80s Retrowave / Synthwave',
      bpm: '120 BPM',
      key: 'D Minor',
      desc: 'Punchy gated drums, rolling 16th analog bassline, and warm neon poly pads.',
      color: '#06b6d4',
      badge: 'POPULAR',
    },
    {
      id: 'trap',
      name: 'Modern Trap / Hip-Hop',
      bpm: '140 BPM',
      key: 'C Minor',
      desc: 'Tight trap snare, rolling hi-hat flams, and deep pitch-gliding 808 sub bass.',
      color: '#f97316',
      badge: 'HEAVY',
    },
    {
      id: 'house',
      name: 'Four-on-the-Floor House',
      bpm: '126 BPM',
      key: 'A Minor',
      desc: 'Pumping four-on-the-floor kick, rhythmic offbeat hats, and driving organ groove.',
      color: '#10b981',
      badge: 'CLUB',
    },
    {
      id: 'lofi',
      name: 'Lo-Fi Chill & Boom Bap',
      bpm: '85 BPM',
      key: 'F Minor',
      desc: 'Dusty vinyl drums, laid-back rimshot swing, and lush minor 9th electric piano chords.',
      color: '#a855f7',
      badge: 'CHILL',
    },
    {
      id: 'ambient',
      name: 'Cyberpunk Atmospheric',
      bpm: '95 BPM',
      key: 'G Minor',
      desc: 'Ethereal pad textures, reverb-soaked plucks, and cinematic sub pulses.',
      color: '#ec4899',
      badge: 'CINEMATIC',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#181922] border border-[#2d3042] rounded-xl shadow-2xl p-6 select-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#292c3c]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Starter Project Templates</h3>
              <p className="text-[11px] text-zinc-400">
                Choose a genre template to jump straight into production
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-[#252837]"
          >
            ✕
          </button>
        </div>

        {/* Templates List */}
        <div className="my-4 space-y-2.5">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                onSelectGenre(tpl.id as any);
                onClose();
              }}
              className="w-full p-3 bg-[#13141a] hover:bg-[#1f202d] border border-[#262837] hover:border-orange-500/50 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer"
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
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#252838] text-zinc-300">
                      {tpl.bpm} · {tpl.key}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{tpl.desc}</p>
                </div>
              </div>

              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
                style={{
                  backgroundColor: `${tpl.color}22`,
                  color: tpl.color,
                }}
              >
                {tpl.badge}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#292c3c]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252838] hover:bg-[#32364a] text-zinc-300 text-xs font-semibold rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
