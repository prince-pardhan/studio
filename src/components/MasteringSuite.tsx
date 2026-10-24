/**
 * BeatFlow Studio - Professional Mastering Suite
 * 5-stage mastering chain (Mastering EQ, Multiband Dynamics, Stereo Imager, Analog Warmth, Brickwall Limiter),
 * real-time LUFS & True-Peak metering, stereo correlation, A/B reference comparison,
 * dual FFT spectrum analyzer, and loudness report generation.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Sliders,
  Sparkles,
  MoveHorizontal,
  Flame,
  ShieldAlert,
  Power,
  RotateCcw,
  Volume2,
  FileAudio,
  Upload,
  Download,
  Check,
  Radio,
  FileText,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import {
  Project,
  MasteringProcessorConfig,
  MasteringSession,
} from '../types/project';
import { MasteringEngine, MasteringMeters } from '../audio/MasteringEngine';
import { AudioEngine } from '../audio/AudioEngine';

interface MasteringSuiteProps {
  project: Project;
  onUpdateMasteringSession: (session: Partial<MasteringSession>) => void;
  onUpdateProcessor: (id: string, updates: Partial<MasteringProcessorConfig>) => void;
  onReorderProcessors: (fromIndex: number, toIndex: number) => void;
  onOpenExport: () => void;
}

const MASTERING_PRESETS = [
  {
    id: 'streaming_safe',
    name: 'Streaming Target (-14 LUFS)',
    targetLufs: -14,
    ceiling: -0.2,
    desc: 'Optimized for Spotify, Apple Music & YouTube. Clean, open transients, zero clipping.',
    params: {
      m_eq: { hpf: 30, lowGain: 0.5, mid1Gain: -0.5, mid1Freq: 450, mid2Gain: 0.8, mid2Freq: 3200, highGain: 1.0, airGain: 1.5 },
      m_mb: { lowThresh: -18, lowRatio: 2.2, lowGain: 0.5, midThresh: -16, midRatio: 1.8, midGain: 0, highThresh: -14, highRatio: 1.6, highGain: 0.8 },
      m_imager: { width: 1.25, bassMono: 120 },
      m_sat: { drive: 0.15, tone: 15000 },
      m_lim: { threshold: -3.5, release: 0.08, ceiling: -0.2 },
    },
  },
  {
    id: 'pop_punch',
    name: 'Pop Radio Punch (-10 LUFS)',
    targetLufs: -10,
    ceiling: -0.1,
    desc: 'Forward vocals, punchy mid-bass, crisp air band, and glue compression for modern commercial pop.',
    params: {
      m_eq: { hpf: 35, lowGain: 1.5, mid1Gain: -1.0, mid1Freq: 380, mid2Gain: 1.8, mid2Freq: 3500, highGain: 2.5, airGain: 2.5 },
      m_mb: { lowThresh: -19, lowRatio: 3.0, lowGain: 1.0, midThresh: -15, midRatio: 2.4, midGain: 0.5, highThresh: -13, highRatio: 2.0, highGain: 1.2 },
      m_imager: { width: 1.35, bassMono: 140 },
      m_sat: { drive: 0.25, tone: 14000 },
      m_lim: { threshold: -6.0, release: 0.05, ceiling: -0.1 },
    },
  },
  {
    id: 'hiphop_heavy',
    name: 'Hip-Hop / 808 Heavy (-9 LUFS)',
    targetLufs: -9,
    ceiling: -0.1,
    desc: 'Tight mono sub bass below 130Hz, aggressive limiter, and saturation for trap and modern rap.',
    params: {
      m_eq: { hpf: 28, lowGain: 2.5, mid1Gain: -1.5, mid1Freq: 320, mid2Gain: 1.0, mid2Freq: 3000, highGain: 1.5, airGain: 2.0 },
      m_mb: { lowThresh: -22, lowRatio: 3.8, lowGain: 1.5, midThresh: -14, midRatio: 2.0, midGain: 0, highThresh: -12, highRatio: 1.8, highGain: 1.0 },
      m_imager: { width: 1.3, bassMono: 130 },
      m_sat: { drive: 0.35, tone: 12000 },
      m_lim: { threshold: -7.5, release: 0.04, ceiling: -0.1 },
    },
  },
  {
    id: 'club_edm',
    name: 'EDM Club Energy (-8 LUFS)',
    targetLufs: -8,
    ceiling: -0.1,
    desc: 'Massive loud master for festival sound systems with maximum punch and super-wide synth image.',
    params: {
      m_eq: { hpf: 30, lowGain: 2.0, mid1Gain: -1.0, mid1Freq: 400, mid2Gain: 1.5, mid2Freq: 4000, highGain: 3.0, airGain: 2.0 },
      m_mb: { lowThresh: -20, lowRatio: 3.5, lowGain: 1.2, midThresh: -16, midRatio: 2.8, midGain: 0.8, highThresh: -14, highRatio: 2.2, highGain: 1.5 },
      m_imager: { width: 1.45, bassMono: 140 },
      m_sat: { drive: 0.3, tone: 16000 },
      m_lim: { threshold: -8.5, release: 0.04, ceiling: -0.1 },
    },
  },
  {
    id: 'acoustic_clean',
    name: 'Acoustic & Dynamic (-16 LUFS)',
    targetLufs: -16,
    ceiling: -0.5,
    desc: 'Preserves natural dynamics, uncompressed breathing room, and acoustic warmth for jazz/folk.',
    params: {
      m_eq: { hpf: 35, lowGain: 0, mid1Gain: -0.5, mid1Freq: 500, mid2Gain: 0.5, mid2Freq: 2500, highGain: 0.8, airGain: 1.0 },
      m_mb: { lowThresh: -14, lowRatio: 1.6, lowGain: 0, midThresh: -12, midRatio: 1.5, midGain: 0, highThresh: -10, highRatio: 1.4, highGain: 0 },
      m_imager: { width: 1.15, bassMono: 100 },
      m_sat: { drive: 0.08, tone: 16000 },
      m_lim: { threshold: -2.0, release: 0.12, ceiling: -0.5 },
    },
  },
];

export const MasteringSuite: React.FC<MasteringSuiteProps> = ({
  project,
  onUpdateMasteringSession,
  onUpdateProcessor,
  onReorderProcessors,
  onOpenExport,
}) => {
  const [activeTab, setActiveTab] = useState<'chain' | 'meters' | 'reference'>('chain');
  const [meters, setMeters] = useState<MasteringMeters>({
    inputPeakDb: -60,
    outputPeakDb: -60,
    inputRmsDb: -60,
    outputRmsDb: -60,
    momentaryLufs: -70,
    integratedLufs: -70,
    correlation: 1.0,
    balance: 0,
    gainReductionDb: 0,
    isClipping: false,
  });

  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceGainDb, setReferenceGainDb] = useState(0);
  const [isAuditioningRef, setIsAuditioningRef] = useState(false);
  const [showLoudnessReport, setShowLoudnessReport] = useState(false);
  const [lufsHistory, setLufsHistory] = useState<number[]>([]);

  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;
  const masteringEngine = audioEngine.mixer.mastering;

  const session = project.masteringSession || {
    processors: [],
    bypassAll: false,
    targetLufs: -14,
    referenceGainDb: 0,
    matchLoudness: false,
    outputCeiling: -0.2,
    ditherType: 'tpdf' as const,
  };

  // Real-time meter & spectrum polling loop
  useEffect(() => {
    let animId: number;
    let historyInterval: number;

    const poll = () => {
      const data = masteringEngine.getMeters();
      setMeters(data);

      // Draw dual FFT spectrum if canvas visible
      if (spectrumCanvasRef.current) {
        const canvas = spectrumCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { inputFft, outputFft } = masteringEngine.getFftData();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Grid lines
          ctx.strokeStyle = '#222536';
          ctx.lineWidth = 1;
          for (let y = 0; y < canvas.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          // Draw Input Raw FFT (amber transparent)
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
          ctx.lineWidth = 1.5;
          const sliceWidth = canvas.width / (inputFft.length / 4);
          let x = 0;
          for (let i = 0; i < inputFft.length / 4; i++) {
            const v = (inputFft[i] + 100) / 100; // normalize -100dB to 0dB
            const y = canvas.height - v * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();

          // Draw Mastered FFT (cyan solid)
          ctx.beginPath();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          x = 0;
          for (let i = 0; i < outputFft.length / 4; i++) {
            const v = (outputFft[i] + 100) / 100;
            const y = canvas.height - v * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);

    // Record loudness history every 250ms
    historyInterval = window.setInterval(() => {
      const curLufs = masteringEngine.getMeters().momentaryLufs;
      if (curLufs > -60) {
        setLufsHistory((prev) => [...prev.slice(-40), curLufs]);
      }
    }, 250);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(historyInterval);
    };
  }, [masteringEngine]);

  const handleApplyPreset = (presetId: string) => {
    const target = MASTERING_PRESETS.find((p) => p.id === presetId);
    if (!target) return;

    onUpdateMasteringSession({
      targetLufs: target.targetLufs,
      outputCeiling: target.ceiling,
    });

    for (const [procId, pParams] of Object.entries(target.params)) {
      onUpdateProcessor(procId, { params: pParams });
    }
  };

  const handleToggleBypassAll = () => {
    onUpdateMasteringSession({ bypassAll: !session.bypassAll });
  };

  const handleReferenceImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ab = await file.arrayBuffer();
      const buffer = await audioEngine.ctx.decodeAudioData(ab);
      masteringEngine.loadReferenceBuffer(buffer);
      setReferenceFile(file);
    } catch {
      alert('Unable to load reference audio. Please choose a valid WAV or MP3 file.');
    }
  };

  const handleToggleReferenceAudition = () => {
    const next = !isAuditioningRef;
    setIsAuditioningRef(next);
    masteringEngine.setAuditionReference(next, referenceGainDb);
  };

  const handleMatchReferenceLoudness = () => {
    // If we have output RMS, calculate difference to match perceived volume
    const diff = meters.outputRmsDb - meters.inputRmsDb;
    setReferenceGainDb(diff);
    masteringEngine.setAuditionReference(isAuditioningRef, diff);
  };

  return (
    <div className="flex flex-1 bg-[#111216] select-none overflow-hidden flex-col">
      {/* Top Mastering Header Toolbar */}
      <div className="px-5 py-2.5 bg-[#171822] border-b border-[#252837] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-black text-black text-xs shadow-inner">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs tracking-tight">Mastering Suite</span>
                <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/20 px-1.5 py-0.2 rounded border border-purple-500/40">
                  ITU-R BS.1770
                </span>
              </div>
            </div>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Preset Selector */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <select
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="bg-[#20222f] border border-[#2d3042] text-orange-400 text-xs rounded px-2.5 py-1 outline-none font-bold"
            >
              <option value="">Mastering Presets...</option>
              {MASTERING_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Before / After Bypass All Toggle */}
          <button
            onClick={handleToggleBypassAll}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
              session.bypassAll
                ? 'bg-amber-500 text-black shadow-md ring-2 ring-amber-400/40'
                : 'bg-[#252838] hover:bg-[#32364a] text-zinc-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{session.bypassAll ? 'RAW MIX (BYPASSED)' : 'MASTERED CHAIN'}</span>
          </button>
        </div>

        {/* View Tabs & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#0f1016] rounded-lg border border-[#232535]">
            <button
              onClick={() => setActiveTab('chain')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'chain' ? 'bg-[#272938] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Signal Chain
            </button>
            <button
              onClick={() => setActiveTab('meters')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'meters' ? 'bg-[#272938] text-cyan-400 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Loudness Meters
            </button>
            <button
              onClick={() => setActiveTab('reference')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'reference' ? 'bg-[#272938] text-amber-400 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Reference Track
            </button>
          </div>

          <button
            onClick={() => setShowLoudnessReport(true)}
            title="Generate Loudness Report"
            className="flex items-center gap-1 px-2.5 py-1 bg-[#222432] hover:bg-[#2b2e42] text-zinc-300 rounded text-xs border border-[#2e3144]"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Report</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-400 text-black font-bold rounded-lg text-xs shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Master</span>
          </button>
        </div>
      </div>

      {/* Main Mastering Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Signal Chain Processors OR Loudness Meters OR Reference */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-4">
          {activeTab === 'chain' && (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {/* Signal Flow Notice */}
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  Master Bus Signal Flow (Serial DSP)
                </span>
                <span className="text-[11px] text-zinc-500">
                  Input → EQ → Multiband Dynamics → Stereo Imager → Tape Saturation → Limiter → Output
                </span>
              </div>

              {/* 1. Linear Mastering EQ */}
              {(() => {
                const eqProc = session.processors.find((p) => p.type === 'mastering_eq') || {
                  id: 'm_eq',
                  type: 'mastering_eq' as const,
                  name: 'Linear Mastering EQ',
                  enabled: true,
                  params: { hpf: 30, lowGain: 0.5, mid1Gain: -0.5, mid1Freq: 450, mid2Gain: 0.8, mid2Freq: 3200, highGain: 1.0, airGain: 1.5 },
                };

                return (
                  <div className="bg-[#171822] border border-[#272938] rounded-xl p-4 shadow-sm hover:border-[#383b4e] transition-colors">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222432]">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-xs font-bold text-white">1. Linear-Phase Mastering EQ</h3>
                      </div>
                      <button
                        onClick={() => onUpdateProcessor(eqProc.id, { enabled: !eqProc.enabled })}
                        className={`p-1 rounded ${eqProc.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-[#121319] p-2.5 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">HPF Low Cut</span>
                        <input
                          type="range"
                          min={20}
                          max={80}
                          value={eqProc.params.hpf ?? 30}
                          onChange={(e) => onUpdateProcessor(eqProc.id, { params: { ...eqProc.params, hpf: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{eqProc.params.hpf ?? 30} Hz</span>
                      </div>

                      <div className="bg-[#121319] p-2.5 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Low Shelf (90 Hz)</span>
                        <input
                          type="range"
                          min={-6}
                          max={6}
                          step={0.2}
                          value={eqProc.params.lowGain ?? 0.5}
                          onChange={(e) => onUpdateProcessor(eqProc.id, { params: { ...eqProc.params, lowGain: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{(eqProc.params.lowGain ?? 0.5).toFixed(1)} dB</span>
                      </div>

                      <div className="bg-[#121319] p-2.5 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">High Shelf (9.5 kHz)</span>
                        <input
                          type="range"
                          min={-6}
                          max={6}
                          step={0.2}
                          value={eqProc.params.highGain ?? 1.0}
                          onChange={(e) => onUpdateProcessor(eqProc.id, { params: { ...eqProc.params, highGain: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{(eqProc.params.highGain ?? 1.0).toFixed(1)} dB</span>
                      </div>

                      <div className="bg-[#121319] p-2.5 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Air Band (16 kHz)</span>
                        <input
                          type="range"
                          min={-4}
                          max={6}
                          step={0.2}
                          value={eqProc.params.airGain ?? 1.5}
                          onChange={(e) => onUpdateProcessor(eqProc.id, { params: { ...eqProc.params, airGain: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{(eqProc.params.airGain ?? 1.5).toFixed(1)} dB</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2. 3-Band Multiband Dynamics */}
              {(() => {
                const mbProc = session.processors.find((p) => p.type === 'multiband_dynamics') || {
                  id: 'm_mb',
                  type: 'multiband_dynamics' as const,
                  name: '3-Band Multiband Dynamics',
                  enabled: true,
                  params: { lowThresh: -18, lowRatio: 2.5, lowGain: 0.5, midThresh: -16, midRatio: 2.0, midGain: 0, highThresh: -14, highRatio: 1.8, highGain: 0.8 },
                };

                return (
                  <div className="bg-[#171822] border border-[#272938] rounded-xl p-4 shadow-sm hover:border-[#383b4e] transition-colors">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222432]">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-white">2. 3-Band Multiband Dynamics Crossover</h3>
                      </div>
                      <button
                        onClick={() => onUpdateProcessor(mbProc.id, { enabled: !mbProc.enabled })}
                        className={`p-1 rounded ${mbProc.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Low Band */}
                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[11px] font-bold text-zinc-300 block mb-2">Low Band (&lt;160 Hz)</span>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500">Threshold:</span>
                            <input
                              type="range"
                              min={-36}
                              max={0}
                              value={mbProc.params.lowThresh ?? -18}
                              onChange={(e) => onUpdateProcessor(mbProc.id, { params: { ...mbProc.params, lowThresh: parseFloat(e.target.value) } })}
                              className="w-full h-1 bg-zinc-700 cursor-pointer"
                            />
                            <span className="font-mono text-[10px] text-orange-400">{mbProc.params.lowThresh ?? -18} dB</span>
                          </div>
                        </div>
                      </div>

                      {/* Mid Band */}
                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[11px] font-bold text-zinc-300 block mb-2">Mid Band (160Hz–3.5kHz)</span>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500">Threshold:</span>
                            <input
                              type="range"
                              min={-36}
                              max={0}
                              value={mbProc.params.midThresh ?? -16}
                              onChange={(e) => onUpdateProcessor(mbProc.id, { params: { ...mbProc.params, midThresh: parseFloat(e.target.value) } })}
                              className="w-full h-1 bg-zinc-700 cursor-pointer"
                            />
                            <span className="font-mono text-[10px] text-orange-400">{mbProc.params.midThresh ?? -16} dB</span>
                          </div>
                        </div>
                      </div>

                      {/* High Band */}
                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[11px] font-bold text-zinc-300 block mb-2">High Band (&gt;3.5 kHz)</span>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500">Threshold:</span>
                            <input
                              type="range"
                              min={-36}
                              max={0}
                              value={mbProc.params.highThresh ?? -14}
                              onChange={(e) => onUpdateProcessor(mbProc.id, { params: { ...mbProc.params, highThresh: parseFloat(e.target.value) } })}
                              className="w-full h-1 bg-zinc-700 cursor-pointer"
                            />
                            <span className="font-mono text-[10px] text-orange-400">{mbProc.params.highThresh ?? -14} dB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Mid-Side Stereo Imager */}
              {(() => {
                const imagerProc = session.processors.find((p) => p.type === 'stereo_imager') || {
                  id: 'm_imager',
                  type: 'stereo_imager' as const,
                  name: 'Mid-Side Stereo Imager',
                  enabled: true,
                  params: { width: 1.25, bassMono: 120 },
                };

                return (
                  <div className="bg-[#171822] border border-[#272938] rounded-xl p-4 shadow-sm hover:border-[#383b4e] transition-colors">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222432]">
                      <div className="flex items-center gap-2">
                        <MoveHorizontal className="w-4 h-4 text-violet-400" />
                        <h3 className="text-xs font-bold text-white">3. Mid-Side Stereo Imager & Mono Bass</h3>
                      </div>
                      <button
                        onClick={() => onUpdateProcessor(imagerProc.id, { enabled: !imagerProc.enabled })}
                        className={`p-1 rounded ${imagerProc.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Stereo Width Multiplier</span>
                        <input
                          type="range"
                          min={0}
                          max={2.0}
                          step={0.05}
                          value={imagerProc.params.width ?? 1.25}
                          onChange={(e) => onUpdateProcessor(imagerProc.id, { params: { ...imagerProc.params, width: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{Math.round((imagerProc.params.width ?? 1.25) * 100)}%</span>
                      </div>

                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Bass Mono Collapse Cutoff</span>
                        <input
                          type="range"
                          min={40}
                          max={250}
                          step={5}
                          value={imagerProc.params.bassMono ?? 120}
                          onChange={(e) => onUpdateProcessor(imagerProc.id, { params: { ...imagerProc.params, bassMono: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{imagerProc.params.bassMono ?? 120} Hz</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 4. Analog Saturation */}
              {(() => {
                const satProc = session.processors.find((p) => p.type === 'analog_saturation') || {
                  id: 'm_sat',
                  type: 'analog_saturation' as const,
                  name: 'Analog Tape Warmth',
                  enabled: true,
                  params: { drive: 0.15, tone: 15000 },
                };

                return (
                  <div className="bg-[#171822] border border-[#272938] rounded-xl p-4 shadow-sm hover:border-[#383b4e] transition-colors">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222432]">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <h3 className="text-xs font-bold text-white">4. Analog Tape Glue & Harmonic Saturation</h3>
                      </div>
                      <button
                        onClick={() => onUpdateProcessor(satProc.id, { enabled: !satProc.enabled })}
                        className={`p-1 rounded ${satProc.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Tape Drive</span>
                        <input
                          type="range"
                          min={0}
                          max={0.6}
                          step={0.02}
                          value={satProc.params.drive ?? 0.15}
                          onChange={(e) => onUpdateProcessor(satProc.id, { params: { ...satProc.params, drive: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{Math.round((satProc.params.drive ?? 0.15) * 100)}%</span>
                      </div>

                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">High Frequency Roll-off</span>
                        <input
                          type="range"
                          min={8000}
                          max={18000}
                          step={500}
                          value={satProc.params.tone ?? 15000}
                          onChange={(e) => onUpdateProcessor(satProc.id, { params: { ...satProc.params, tone: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{Math.round((satProc.params.tone ?? 15000) / 1000)} kHz</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 5. Brickwall Limiter */}
              {(() => {
                const limProc = session.processors.find((p) => p.type === 'brickwall_limiter') || {
                  id: 'm_lim',
                  type: 'brickwall_limiter' as const,
                  name: 'Brickwall True-Peak Limiter',
                  enabled: true,
                  params: { threshold: -3.5, release: 0.08, ceiling: -0.2 },
                };

                return (
                  <div className="bg-[#171822] border border-[#272938] rounded-xl p-4 shadow-sm hover:border-[#383b4e] transition-colors">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222432]">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        <h3 className="text-xs font-bold text-white">5. Brickwall True-Peak Limiter</h3>
                      </div>
                      <button
                        onClick={() => onUpdateProcessor(limProc.id, { enabled: !limProc.enabled })}
                        className={`p-1 rounded ${limProc.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Threshold (Push)</span>
                        <input
                          type="range"
                          min={-16}
                          max={0}
                          step={0.2}
                          value={limProc.params.threshold ?? -3.5}
                          onChange={(e) => onUpdateProcessor(limProc.id, { params: { ...limProc.params, threshold: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{(limProc.params.threshold ?? -3.5).toFixed(1)} dB</span>
                      </div>

                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Ceiling (True Peak)</span>
                        <input
                          type="range"
                          min={-2.0}
                          max={0}
                          step={0.1}
                          value={limProc.params.ceiling ?? -0.2}
                          onChange={(e) => onUpdateProcessor(limProc.id, { params: { ...limProc.params, ceiling: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{(limProc.params.ceiling ?? -0.2).toFixed(1)} dBFS</span>
                      </div>

                      <div className="bg-[#121319] p-3 rounded-lg border border-[#20222e]">
                        <span className="text-[10px] font-bold text-zinc-400 block mb-1">Release</span>
                        <input
                          type="range"
                          min={0.01}
                          max={0.3}
                          step={0.01}
                          value={limProc.params.release ?? 0.08}
                          onChange={(e) => onUpdateProcessor(limProc.id, { params: { ...limProc.params, release: parseFloat(e.target.value) } })}
                          className="w-full h-1 bg-zinc-700 cursor-pointer"
                        />
                        <span className="font-mono text-xs text-orange-400 font-bold">{Math.round((limProc.params.release ?? 0.08) * 1000)} ms</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'meters' && (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {/* Loudness Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-[#171822] p-4 rounded-xl border border-[#262837] text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Integrated LUFS</span>
                  <div className="text-2xl font-mono font-bold text-orange-400 mt-1">
                    {meters.integratedLufs > -60 ? `${meters.integratedLufs} LUFS` : '-inf'}
                  </div>
                  <span className="text-[10px] text-zinc-400">Target: {session.targetLufs} LUFS</span>
                </div>

                <div className="bg-[#171822] p-4 rounded-xl border border-[#262837] text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Momentary LUFS</span>
                  <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
                    {meters.momentaryLufs > -60 ? `${meters.momentaryLufs} LUFS` : '-inf'}
                  </div>
                  <span className="text-[10px] text-zinc-400">400ms time window</span>
                </div>

                <div className="bg-[#171822] p-4 rounded-xl border border-[#262837] text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">True Peak</span>
                  <div
                    className={`text-2xl font-mono font-bold mt-1 ${
                      meters.isClipping ? 'text-red-500 animate-pulse' : 'text-emerald-400'
                    }`}
                  >
                    {meters.outputPeakDb > -60 ? `${meters.outputPeakDb} dBFS` : '-inf'}
                  </div>
                  <span className="text-[10px] text-zinc-400">Ceiling: {session.outputCeiling} dB</span>
                </div>

                <div className="bg-[#171822] p-4 rounded-xl border border-[#262837] text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stereo Correlation</span>
                  <div className="text-2xl font-mono font-bold text-purple-400 mt-1">
                    {meters.correlation >= 0 ? `+${meters.correlation}` : meters.correlation}
                  </div>
                  <span className="text-[10px] text-zinc-400">{meters.correlation > 0.5 ? 'Good Phase' : 'Check Phase'}</span>
                </div>
              </div>

              {/* Real-time Loudness Timeline Graph */}
              <div className="bg-[#171822] p-4 rounded-xl border border-[#262837]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-orange-400" />
                    Loudness History (LUFS Timeline)
                  </span>
                  <button
                    onClick={() => masteringEngine.resetLufsAccumulator()}
                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Analyzer</span>
                  </button>
                </div>

                <div className="h-28 bg-[#0e0f14] rounded-lg p-2 flex items-end gap-1 overflow-hidden border border-[#20222f]">
                  {lufsHistory.map((val, idx) => {
                    const normHeight = Math.max(5, Math.min(100, (val + 50) * 2));
                    const isTarget = Math.abs(val - session.targetLufs) < 1.5;

                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-t-xs transition-all ${
                          isTarget ? 'bg-emerald-400' : val > session.targetLufs ? 'bg-amber-400' : 'bg-cyan-600'
                        }`}
                        style={{ height: `${normHeight}%` }}
                        title={`${val} LUFS`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reference' && (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              <div className="bg-[#171822] p-4 rounded-xl border border-[#262837]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222432]">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white">Commercial Reference Track Comparison</h3>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">Real-time Level Matched A/B</span>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-300">
                      {referenceFile ? (
                        <span className="font-semibold text-white">Loaded: {referenceFile.name}</span>
                      ) : (
                        'No reference track loaded. Import an official commercial release to compare tone & loudness.'
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Supports WAV, MP3, FLAC. Reference is excluded from final song export.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#252838] hover:bg-[#34374b] text-zinc-200 rounded text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-orange-400" />
                      <span>{referenceFile ? 'Change Track' : 'Load Reference'}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleReferenceImport}
                      accept="audio/*,.wav,.mp3"
                      className="hidden"
                    />

                    {referenceFile && (
                      <button
                        onClick={handleToggleReferenceAudition}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          isAuditioningRef
                            ? 'bg-amber-400 text-black shadow-lg ring-2 ring-amber-400/50'
                            : 'bg-[#20222f] text-zinc-300 hover:text-white'
                        }`}
                      >
                        {isAuditioningRef ? 'AUDITIONING REFERENCE (B)' : 'SWITCH TO REFERENCE (B)'}
                      </button>
                    )}
                  </div>
                </div>

                {referenceFile && (
                  <div className="mt-4 pt-3 border-t border-[#222432] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Ref Gain Offset:</span>
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={referenceGainDb}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setReferenceGainDb(val);
                          masteringEngine.setAuditionReference(isAuditioningRef, val);
                        }}
                        className="w-24 h-1 bg-zinc-700 cursor-pointer"
                      />
                      <span className="font-mono text-orange-400 font-bold">{referenceGainDb.toFixed(1)} dB</span>
                    </div>

                    <button
                      onClick={handleMatchReferenceLoudness}
                      className="px-2.5 py-1 bg-[#252837] hover:bg-[#33374a] text-xs font-semibold text-zinc-200 rounded"
                    >
                      Auto Match Loudness
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Real-Time Dual Spectrum Analyzer & Meter Bridge */}
        <div className="w-80 bg-[#161720] border-l border-[#242635] flex flex-col p-4 shrink-0 overflow-y-auto">
          {/* Dual FFT Frequency Spectrum Canvas */}
          <div className="bg-[#121319] border border-[#242635] rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-300 uppercase">Dual Spectrum FFT</span>
              <div className="flex items-center gap-2 text-[9px] font-mono">
                <span className="text-cyan-400">● Mastered</span>
                <span className="text-orange-400">● Input</span>
              </div>
            </div>

            <canvas
              ref={spectrumCanvasRef}
              width={260}
              height={120}
              className="w-full h-28 bg-[#0b0c10] rounded border border-[#1e202c]"
            />
          </div>

          {/* Master Peak & RMS Dual Meter Bars */}
          <div className="bg-[#121319] border border-[#242635] rounded-xl p-3 space-y-3">
            <span className="text-[11px] font-bold text-zinc-300 uppercase">Meter Bridge</span>

            {/* Output Peak Meter */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-zinc-400">Peak Out:</span>
                <span className={`font-bold ${meters.isClipping ? 'text-red-400' : 'text-emerald-400'}`}>
                  {meters.outputPeakDb > -60 ? `${meters.outputPeakDb} dBFS` : '-inf'}
                </span>
              </div>
              <div className="h-2 bg-zinc-900 rounded overflow-hidden">
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(0, (meters.outputPeakDb + 60) * 1.66))}%`,
                    backgroundColor: meters.outputPeakDb > -0.2 ? '#ef4444' : meters.outputPeakDb > -3 ? '#eab308' : '#10b981',
                  }}
                />
              </div>
            </div>

            {/* RMS Loudness Meter */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-zinc-400">RMS Level:</span>
                <span className="text-orange-400 font-bold">
                  {meters.outputRmsDb > -60 ? `${meters.outputRmsDb} dBFS` : '-inf'}
                </span>
              </div>
              <div className="h-2 bg-zinc-900 rounded overflow-hidden">
                <div
                  className="h-full transition-all duration-75 bg-amber-400"
                  style={{
                    width: `${Math.min(100, Math.max(0, (meters.outputRmsDb + 60) * 1.66))}%`,
                  }}
                />
              </div>
            </div>

            {/* Limiter Gain Reduction */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-zinc-400">Limiter GR:</span>
                <span className="text-red-400 font-bold">
                  {meters.gainReductionDb !== 0 ? `-${Math.abs(meters.gainReductionDb)} dB` : '0 dB'}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div
                  className="h-full transition-all duration-75 bg-red-500"
                  style={{
                    width: `${Math.min(100, Math.abs(meters.gainReductionDb) * 10)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loudness Report Modal */}
      {showLoudnessReport && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#171822] border border-[#2d3042] rounded-xl p-5 select-none">
            <h3 className="text-sm font-bold text-white mb-2">Mastering Quality & Loudness Report</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Real-time measurement summary for distribution compliance:
            </p>

            <div className="bg-[#101116] p-3 rounded-lg border border-[#252837] space-y-2 font-mono text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-zinc-400">Integrated Loudness:</span>
                <span className="text-orange-400 font-bold">{meters.integratedLufs} LUFS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Target Standard:</span>
                <span className="text-white">{session.targetLufs} LUFS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Peak Level:</span>
                <span className={meters.isClipping ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {meters.outputPeakDb} dBFS
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Stereo Phase Correlation:</span>
                <span className="text-purple-400">{meters.correlation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Digital Clipping:</span>
                <span className={meters.isClipping ? 'text-red-500 font-bold' : 'text-emerald-400'}>
                  {meters.isClipping ? 'DETECTED' : 'CLEAN (NONE)'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLoudnessReport(false)}
                className="px-3 py-1.5 bg-[#252838] text-zinc-300 rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
