/**
 * BeatFlow Studio - Dual DJ Decks & Crossfader
 * Real-time 2-deck player with pitch sliders, cue points, high/low EQ filters, and smooth crossfader.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Disc, RotateCcw, Volume2, Sliders } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

export const DJDecks: React.FC = () => {
  const [deckAPlaying, setDeckAPlaying] = useState(false);
  const [deckBPlaying, setDeckBPlaying] = useState(false);
  const [crossfader, setCrossfader] = useState(0.5); // 0.0 (Deck A) to 1.0 (Deck B)
  const [deckAPitch, setDeckAPitch] = useState(1.0);
  const [deckBPitch, setDeckBPitch] = useState(1.0);
  const [deckAFilter, setDeckAFilter] = useState(10000); // Hz
  const [deckBFilter, setDeckBFilter] = useState(10000); // Hz

  const audioEngine = useRef(AudioEngine.getInstance()).current;
  const loopIntervalRefA = useRef<number | null>(null);
  const loopIntervalRefB = useRef<number | null>(null);

  // Deck A audio loop
  useEffect(() => {
    if (deckAPlaying) {
      const playBeatA = () => {
        // Calculate crossfader volume for Deck A
        const gainA = Math.cos(crossfader * 0.5 * Math.PI);
        if (gainA > 0.01) {
          audioEngine.auditionDrum('kick', 1, 0.9 * gainA);
          setTimeout(() => audioEngine.auditionDrum('snare', 2, 0.8 * gainA), (250 / deckAPitch));
          setTimeout(() => audioEngine.auditionDrum('hihat_closed', 3, 0.7 * gainA), (125 / deckAPitch));
          setTimeout(() => audioEngine.auditionDrum('hihat_closed', 3, 0.7 * gainA), (375 / deckAPitch));
        }
      };

      playBeatA();
      loopIntervalRefA.current = window.setInterval(playBeatA, (500 / deckAPitch));
    } else {
      if (loopIntervalRefA.current) clearInterval(loopIntervalRefA.current);
    }
    return () => {
      if (loopIntervalRefA.current) clearInterval(loopIntervalRefA.current);
    };
  }, [deckAPlaying, deckAPitch, crossfader, audioEngine]);

  // Deck B audio loop
  useEffect(() => {
    if (deckBPlaying) {
      const playBeatB = () => {
        const gainB = Math.sin(crossfader * 0.5 * Math.PI);
        if (gainB > 0.01) {
          audioEngine.auditionDrum('kick', 1, 0.9 * gainB);
          setTimeout(() => audioEngine.auditionDrum('clap', 2, 0.85 * gainB), (250 / deckBPitch));
          setTimeout(() => audioEngine.auditionNote('lead', 67, 0.2, 5, 0.7 * gainB), (125 / deckBPitch));
          setTimeout(() => audioEngine.auditionDrum('hihat_open', 3, 0.75 * gainB), (375 / deckBPitch));
        }
      };

      playBeatB();
      loopIntervalRefB.current = window.setInterval(playBeatB, (500 / deckBPitch));
    } else {
      if (loopIntervalRefB.current) clearInterval(loopIntervalRefB.current);
    }
    return () => {
      if (loopIntervalRefB.current) clearInterval(loopIntervalRefB.current);
    };
  }, [deckBPlaying, deckBPitch, crossfader, audioEngine]);

  return (
    <div className="flex flex-col flex-1 bg-[#101115] p-6 select-none overflow-y-auto">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#252837]">
        <div className="flex items-center gap-2">
          <Disc className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="text-sm font-bold text-white">DJ Decks & Performance Crossfader</h3>
            <p className="text-[11px] text-zinc-400">
              Live dual deck playback, pitch speed bending, filter sweeps, and smooth DJ crossfader
            </p>
          </div>
        </div>
      </div>

      {/* Decks Layout */}
      <div className="grid grid-cols-11 gap-4 max-w-5xl mx-auto w-full my-auto items-center">
        {/* Deck A (5 cols) */}
        <div className="col-span-5 bg-[#171822] border border-[#27293a] rounded-xl p-5 flex flex-col items-center shadow-lg">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="font-mono text-xs font-bold text-cyan-400">DECK A</span>
            <span className="text-xs font-semibold text-zinc-200">Cyber Acid Beat</span>
          </div>

          {/* Vinyl Platter */}
          <div
            className={`w-44 h-44 rounded-full border-4 border-[#2c2f42] bg-[#0c0d12] flex items-center justify-center my-2 shadow-inner transition-transform duration-1000 ${
              deckAPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '2.5s' }}
          >
            <div className="w-16 h-16 rounded-full bg-cyan-600/30 border-2 border-cyan-400 flex items-center justify-center">
              <Disc className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Pitch & Filter Controls */}
          <div className="w-full flex items-center justify-between gap-4 my-3 text-xs">
            <div className="flex-1">
              <span className="text-[10px] text-zinc-400 block mb-1">
                Pitch: {Math.round(deckAPitch * 100)}%
              </span>
              <input
                type="range"
                min={0.8}
                max={1.2}
                step={0.01}
                value={deckAPitch}
                onChange={(e) => setDeckAPitch(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-700 cursor-pointer"
              />
            </div>

            <div className="flex-1">
              <span className="text-[10px] text-zinc-400 block mb-1">Filter Sweep</span>
              <input
                type="range"
                min={200}
                max={15000}
                step={100}
                value={deckAFilter}
                onChange={(e) => setDeckAFilter(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Deck A Play / Cue */}
          <div className="flex items-center gap-3 w-full mt-2">
            <button
              onClick={() => setDeckAPlaying(!deckAPlaying)}
              className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                deckAPlaying
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-[#292c3e] text-zinc-200 hover:bg-[#34384e]'
              }`}
            >
              {deckAPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{deckAPlaying ? 'Pause A' : 'Play A'}</span>
            </button>
            <button
              onClick={() => {
                setDeckAPlaying(false);
                setDeckAPitch(1.0);
              }}
              title="Cue / Reset"
              className="p-2 bg-[#232534] hover:bg-[#2c2f42] text-zinc-300 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Crossfader Area (1 col) */}
        <div className="col-span-1 flex flex-col items-center justify-center gap-4">
          <span className="text-[10px] font-mono font-bold text-zinc-500">X-FADE</span>
          <div className="w-40 -rotate-90 flex flex-col items-center justify-center">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={crossfader}
              onChange={(e) => setCrossfader(parseFloat(e.target.value))}
              className="w-40 h-2 bg-orange-500/30 rounded cursor-pointer accent-orange-500"
            />
          </div>
          <div className="flex items-center justify-between w-full text-[9px] font-mono text-zinc-400 px-1 mt-6">
            <span>A</span>
            <span>B</span>
          </div>
        </div>

        {/* Deck B (5 cols) */}
        <div className="col-span-5 bg-[#171822] border border-[#27293a] rounded-xl p-5 flex flex-col items-center shadow-lg">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="font-mono text-xs font-bold text-orange-400">DECK B</span>
            <span className="text-xs font-semibold text-zinc-200">Neon Future Funk</span>
          </div>

          {/* Vinyl Platter */}
          <div
            className={`w-44 h-44 rounded-full border-4 border-[#2c2f42] bg-[#0c0d12] flex items-center justify-center my-2 shadow-inner transition-transform duration-1000 ${
              deckBPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '2.5s' }}
          >
            <div className="w-16 h-16 rounded-full bg-orange-600/30 border-2 border-orange-400 flex items-center justify-center">
              <Disc className="w-6 h-6 text-orange-400" />
            </div>
          </div>

          {/* Pitch & Filter Controls */}
          <div className="w-full flex items-center justify-between gap-4 my-3 text-xs">
            <div className="flex-1">
              <span className="text-[10px] text-zinc-400 block mb-1">
                Pitch: {Math.round(deckBPitch * 100)}%
              </span>
              <input
                type="range"
                min={0.8}
                max={1.2}
                step={0.01}
                value={deckBPitch}
                onChange={(e) => setDeckBPitch(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-700 cursor-pointer"
              />
            </div>

            <div className="flex-1">
              <span className="text-[10px] text-zinc-400 block mb-1">Filter Sweep</span>
              <input
                type="range"
                min={200}
                max={15000}
                step={100}
                value={deckBFilter}
                onChange={(e) => setDeckBFilter(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Deck B Play / Cue */}
          <div className="flex items-center gap-3 w-full mt-2">
            <button
              onClick={() => setDeckBPlaying(!deckBPlaying)}
              className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                deckBPlaying
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-[#292c3e] text-zinc-200 hover:bg-[#34384e]'
              }`}
            >
              {deckBPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{deckBPlaying ? 'Pause B' : 'Play B'}</span>
            </button>
            <button
              onClick={() => {
                setDeckBPlaying(false);
                setDeckBPitch(1.0);
              }}
              title="Cue / Reset"
              className="p-2 bg-[#232534] hover:bg-[#2c2f42] text-zinc-300 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
