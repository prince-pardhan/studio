/**
 * BeatFlow Studio - Plugin Registry
 * Catalog of 19 professional Web Audio DSP plugins with metadata, parameter schemas,
 * categories, ranges, and rich factory presets.
 */
import { EffectType, PluginCategory, PluginDefinition, PluginPreset } from '../types/project';

export const BUILT_IN_PLUGINS: PluginDefinition[] = [
  // 1. Parametric EQ (5-Band)
  {
    id: 'parametric_eq',
    name: 'Parametric EQ 5-Band',
    category: 'eq',
    description: 'Precision 5-band studio parametric equalizer with high-pass, low shelf, dual parametric bells, and high shelf.',
    iconName: 'Activity',
    isMasteringGrade: true,
    params: [
      { id: 'hpfCutoff', name: 'Low Cut (HPF)', type: 'number', min: 20, max: 500, step: 5, defaultVal: 30, unit: 'Hz' },
      { id: 'lowGain', name: 'Low Shelf Gain', type: 'number', min: -18, max: 18, step: 0.5, defaultVal: 0, unit: 'dB' },
      { id: 'lowFreq', name: 'Low Shelf Freq', type: 'number', min: 40, max: 400, step: 10, defaultVal: 100, unit: 'Hz' },
      { id: 'mid1Gain', name: 'Mid 1 Gain', type: 'number', min: -18, max: 18, step: 0.5, defaultVal: 0, unit: 'dB' },
      { id: 'mid1Freq', name: 'Mid 1 Freq', type: 'number', min: 200, max: 3000, step: 20, defaultVal: 800, unit: 'Hz' },
      { id: 'mid1Q', name: 'Mid 1 Q', type: 'number', min: 0.1, max: 10, step: 0.1, defaultVal: 1.0 },
      { id: 'mid2Gain', name: 'Mid 2 Gain', type: 'number', min: -18, max: 18, step: 0.5, defaultVal: 0, unit: 'dB' },
      { id: 'mid2Freq', name: 'Mid 2 Freq', type: 'number', min: 1000, max: 10000, step: 50, defaultVal: 3500, unit: 'Hz' },
      { id: 'mid2Q', name: 'Mid 2 Q', type: 'number', min: 0.1, max: 10, step: 0.1, defaultVal: 1.0 },
      { id: 'highGain', name: 'High Shelf Gain', type: 'number', min: -18, max: 18, step: 0.5, defaultVal: 0, unit: 'dB' },
      { id: 'highFreq', name: 'High Shelf Freq', type: 'number', min: 4000, max: 18000, step: 100, defaultVal: 10000, unit: 'Hz' },
      { id: 'outputGain', name: 'Output Trim', type: 'number', min: -12, max: 12, step: 0.5, defaultVal: 0, unit: 'dB' },
    ],
    factoryPresets: [
      { id: 'peq_flat', name: 'Default Flat', pluginId: 'parametric_eq', isFactory: true, params: { hpfCutoff: 30, lowGain: 0, lowFreq: 100, mid1Gain: 0, mid1Freq: 800, mid1Q: 1.0, mid2Gain: 0, mid2Freq: 3500, mid2Q: 1.0, highGain: 0, highFreq: 10000, outputGain: 0 } },
      { id: 'peq_vocal_air', name: 'Vocal Presence & Air', pluginId: 'parametric_eq', isFactory: true, params: { hpfCutoff: 80, lowGain: -1.5, lowFreq: 250, mid1Gain: -2.0, mid1Freq: 500, mid1Q: 1.4, mid2Gain: 2.5, mid2Freq: 3800, mid2Q: 1.2, highGain: 3.5, highFreq: 12000, outputGain: 0 } },
      { id: 'peq_kick_punch', name: 'Tight Kick Sculpt', pluginId: 'parametric_eq', isFactory: true, params: { hpfCutoff: 35, lowGain: 3.5, lowFreq: 60, mid1Gain: -4.0, mid1Freq: 350, mid1Q: 2.0, mid2Gain: 2.0, mid2Freq: 3200, mid2Q: 1.5, highGain: -6.0, highFreq: 8000, outputGain: 0 } },
      { id: 'peq_master_clean', name: 'Master Bus Clean', pluginId: 'parametric_eq', isFactory: true, params: { hpfCutoff: 30, lowGain: 1.0, lowFreq: 80, mid1Gain: -1.0, mid1Freq: 400, mid1Q: 0.8, mid2Gain: 0.8, mid2Freq: 4500, mid2Q: 0.7, highGain: 1.5, highFreq: 12500, outputGain: 0 } },
    ],
  },

  // 2. Three-Band EQ
  {
    id: 'eq3',
    name: '3-Band Console EQ',
    category: 'eq',
    description: 'Classic British analog mixing console 3-band tone shaper with low/high shelves and musical mid band.',
    iconName: 'Sliders',
    params: [
      { id: 'low', name: 'Low (100 Hz)', type: 'number', min: -18, max: 18, step: 0.5, defaultVal: 0, unit: 'dB' },
      { id: 'mid', name: 'Mid (1 kHz)', type: 'number', min: -18, max: 18, step: 0.5, defaultVal: 0, unit: 'dB' },
      { id: 'high', name: 'High (10 kHz)', type: 'number', min: -18, max: 18, step: 0.5, defaultVal: 0, unit: 'dB' },
    ],
    factoryPresets: [
      { id: 'eq3_flat', name: 'Flat', pluginId: 'eq3', isFactory: true, params: { low: 0, mid: 0, high: 0 } },
      { id: 'eq3_warm', name: 'Warm Bass', pluginId: 'eq3', isFactory: true, params: { low: 3.5, mid: -1.0, high: 1.0 } },
      { id: 'eq3_bright', name: 'Modern Crisp', pluginId: 'eq3', isFactory: true, params: { low: 1.0, mid: -1.5, high: 4.0 } },
      { id: 'eq3_mid_cut', name: 'Smiley Curve', pluginId: 'eq3', isFactory: true, params: { low: 3.0, mid: -3.5, high: 3.0 } },
    ],
  },

  // 3. Studio Compressor
  {
    id: 'compressor',
    name: 'Studio VCA Compressor',
    category: 'dynamics',
    description: 'Dynamic range controller with smooth RMS detection, variable ratio, knee, attack, release, and auto-makeup gain.',
    iconName: 'Minimize2',
    isMasteringGrade: true,
    params: [
      { id: 'threshold', name: 'Threshold', type: 'number', min: -60, max: 0, step: 0.5, defaultVal: -18, unit: 'dB' },
      { id: 'ratio', name: 'Ratio', type: 'number', min: 1, max: 20, step: 0.5, defaultVal: 3.5, unit: ':1' },
      { id: 'attack', name: 'Attack', type: 'number', min: 0.001, max: 0.2, step: 0.001, defaultVal: 0.015, unit: 's' },
      { id: 'release', name: 'Release', type: 'number', min: 0.01, max: 1.0, step: 0.01, defaultVal: 0.15, unit: 's' },
      { id: 'knee', name: 'Knee', type: 'number', min: 0, max: 40, step: 1, defaultVal: 6, unit: 'dB' },
      { id: 'makeup', name: 'Makeup Gain', type: 'number', min: 0, max: 24, step: 0.5, defaultVal: 3.0, unit: 'dB' },
      { id: 'wet', name: 'Mix', type: 'number', min: 0, max: 1, step: 0.01, defaultVal: 1.0 },
    ],
    factoryPresets: [
      { id: 'comp_vocal', name: 'Vocal Glue', pluginId: 'compressor', isFactory: true, params: { threshold: -20, ratio: 3.0, attack: 0.01, release: 0.12, knee: 10, makeup: 3.5, wet: 1.0 } },
      { id: 'comp_drums', name: 'Drum Bus Smash', pluginId: 'compressor', isFactory: true, params: { threshold: -16, ratio: 6.0, attack: 0.03, release: 0.08, knee: 4, makeup: 5.0, wet: 0.75 } },
      { id: 'comp_subtle', name: 'Master Gentle Leveler', pluginId: 'compressor', isFactory: true, params: { threshold: -12, ratio: 1.8, attack: 0.04, release: 0.25, knee: 15, makeup: 1.5, wet: 1.0 } },
      { id: 'comp_bass', name: 'Bass Guitar Solid', pluginId: 'compressor', isFactory: true, params: { threshold: -22, ratio: 4.5, attack: 0.02, release: 0.15, knee: 6, makeup: 4.0, wet: 1.0 } },
    ],
  },

  // 4. Brickwall Peak Limiter
  {
    id: 'limiter',
    name: 'Precision Peak Limiter',
    category: 'dynamics',
    description: 'Fast brickwall peak limiter with zero overshoots, adjustable ceiling, release, and lookahead emulation for loud, distortion-free masters.',
    iconName: 'ShieldAlert',
    isMasteringGrade: true,
    params: [
      { id: 'ceiling', name: 'Ceiling', type: 'number', min: -12, max: 0, step: 0.1, defaultVal: -0.2, unit: 'dBFS' },
      { id: 'threshold', name: 'Threshold', type: 'number', min: -24, max: 0, step: 0.2, defaultVal: -4.0, unit: 'dBFS' },
      { id: 'release', name: 'Release', type: 'number', min: 0.01, max: 0.5, step: 0.01, defaultVal: 0.08, unit: 's' },
      { id: 'knee', name: 'Soft Knee', type: 'number', min: 0, max: 6, step: 0.5, defaultVal: 1.0, unit: 'dB' },
    ],
    factoryPresets: [
      { id: 'lim_safe', name: 'Streaming Safe (-0.5 dB)', pluginId: 'limiter', isFactory: true, params: { ceiling: -0.5, threshold: -3.0, release: 0.08, knee: 1.5 } },
      { id: 'lim_loud', name: 'Loud & Punchy (-0.1 dB)', pluginId: 'limiter', isFactory: true, params: { ceiling: -0.1, threshold: -7.0, release: 0.05, knee: 0.5 } },
      { id: 'lim_transparent', name: 'Transparent Master', pluginId: 'limiter', isFactory: true, params: { ceiling: -0.2, threshold: -2.0, release: 0.12, knee: 2.5 } },
    ],
  },

  // 5. Studio Noise Gate
  {
    id: 'noise_gate',
    name: 'Dynamic Noise Gate',
    category: 'dynamics',
    description: 'Suppresses unwanted background room noise, headphone bleed, and hum below a set threshold level.',
    iconName: 'DoorClosed',
    params: [
      { id: 'threshold', name: 'Threshold', type: 'number', min: -80, max: -10, step: 1, defaultVal: -45, unit: 'dB' },
      { id: 'attack', name: 'Attack', type: 'number', min: 0.001, max: 0.05, step: 0.001, defaultVal: 0.003, unit: 's' },
      { id: 'hold', name: 'Hold', type: 'number', min: 0.01, max: 0.5, step: 0.01, defaultVal: 0.05, unit: 's' },
      { id: 'release', name: 'Release', type: 'number', min: 0.01, max: 0.5, step: 0.01, defaultVal: 0.1, unit: 's' },
      { id: 'reduction', name: 'Reduction Depth', type: 'number', min: -80, max: -6, step: 1, defaultVal: -60, unit: 'dB' },
    ],
    factoryPresets: [
      { id: 'gate_vocal', name: 'Vocal Cleanup', pluginId: 'noise_gate', isFactory: true, params: { threshold: -45, attack: 0.002, hold: 0.06, release: 0.12, reduction: -60 } },
      { id: 'gate_snare', name: 'Tight Snare Gating', pluginId: 'noise_gate', isFactory: true, params: { threshold: -32, attack: 0.001, hold: 0.02, release: 0.05, reduction: -40 } },
      { id: 'gate_subtle', name: 'Gentle De-Noise', pluginId: 'noise_gate', isFactory: true, params: { threshold: -55, attack: 0.005, hold: 0.1, release: 0.2, reduction: -24 } },
    ],
  },

  // 6. Audio Expander
  {
    id: 'expander',
    name: 'Dynamic Downward Expander',
    category: 'dynamics',
    description: 'Smoothly attenuates low-level signals to restore dynamic contrast and clean up decay tails.',
    iconName: 'Maximize2',
    params: [
      { id: 'threshold', name: 'Threshold', type: 'number', min: -60, max: -10, step: 1, defaultVal: -35, unit: 'dB' },
      { id: 'ratio', name: 'Ratio', type: 'number', min: 1.1, max: 6.0, step: 0.1, defaultVal: 2.0, unit: ':1' },
      { id: 'attack', name: 'Attack', type: 'number', min: 0.001, max: 0.1, step: 0.002, defaultVal: 0.01, unit: 's' },
      { id: 'release', name: 'Release', type: 'number', min: 0.02, max: 0.8, step: 0.02, defaultVal: 0.2, unit: 's' },
    ],
    factoryPresets: [
      { id: 'exp_natural', name: 'Natural Room Expansion', pluginId: 'expander', isFactory: true, params: { threshold: -35, ratio: 1.8, attack: 0.01, release: 0.25 } },
      { id: 'exp_drums', name: 'Punchy Drum Dynamics', pluginId: 'expander', isFactory: true, params: { threshold: -28, ratio: 3.0, attack: 0.005, release: 0.12 } },
    ],
  },

  // 7. Convolution & Algorithmic Reverb
  {
    id: 'reverb',
    name: 'Studio Space Reverb',
    category: 'reverb',
    description: 'Dual-engine stereo reverb combining synthetic diffusion and synthetic impulse response acoustic modelling.',
    iconName: 'Sparkles',
    params: [
      { id: 'roomSize', name: 'Room Size', type: 'number', min: 0.1, max: 1.0, step: 0.02, defaultVal: 0.6 },
      { id: 'decay', name: 'Decay Time', type: 'number', min: 0.4, max: 8.0, step: 0.1, defaultVal: 2.2, unit: 's' },
      { id: 'preDelay', name: 'Pre-Delay', type: 'number', min: 0, max: 150, step: 2, defaultVal: 20, unit: 'ms' },
      { id: 'damping', name: 'High Cut Damping', type: 'number', min: 1000, max: 18000, step: 200, defaultVal: 7500, unit: 'Hz' },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.28 },
    ],
    factoryPresets: [
      { id: 'rev_vocal_plate', name: 'Vocal Silk Plate', pluginId: 'reverb', isFactory: true, params: { roomSize: 0.75, decay: 2.8, preDelay: 35, damping: 9000, wet: 0.3 } },
      { id: 'rev_drum_ambience', name: 'Punchy Drum Room', pluginId: 'reverb', isFactory: true, params: { roomSize: 0.35, decay: 0.9, preDelay: 8, damping: 6500, wet: 0.2 } },
      { id: 'rev_cathedral', name: 'Massive Cathedral', pluginId: 'reverb', isFactory: true, params: { roomSize: 1.0, decay: 6.5, preDelay: 60, damping: 5000, wet: 0.45 } },
      { id: 'rev_synth_shimmer', name: 'Neon Synth Bloom', pluginId: 'reverb', isFactory: true, params: { roomSize: 0.85, decay: 4.2, preDelay: 25, damping: 12000, wet: 0.4 } },
    ],
  },

  // 8. Stereo & Ping-Pong Delay
  {
    id: 'delay',
    name: 'Stereo Echo & Ping-Pong Delay',
    category: 'delay',
    description: 'Tempo-synced and millisecond dual delay line with stereo cross-feed ping-pong, feedback damping, and high-cut filters.',
    iconName: 'Radio',
    params: [
      { id: 'delayTime', name: 'Time', type: 'number', min: 0.05, max: 1.5, step: 0.01, defaultVal: 0.25, unit: 's' },
      { id: 'feedback', name: 'Feedback', type: 'number', min: 0, max: 0.9, step: 0.02, defaultVal: 0.4 },
      { id: 'pingPong', name: 'Ping-Pong Width', type: 'number', min: 0, max: 1, step: 0.05, defaultVal: 0.7 },
      { id: 'highCut', name: 'High Cut Filter', type: 'number', min: 1000, max: 16000, step: 200, defaultVal: 6000, unit: 'Hz' },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.3 },
    ],
    factoryPresets: [
      { id: 'dly_eighth_pingpong', name: '1/8th Ping-Pong Echo', pluginId: 'delay', isFactory: true, params: { delayTime: 0.25, feedback: 0.45, pingPong: 0.8, highCut: 7000, wet: 0.3 } },
      { id: 'dly_dotted_eighth', name: 'Dotted 1/8th Lead Delay', pluginId: 'delay', isFactory: true, params: { delayTime: 0.375, feedback: 0.55, pingPong: 0.5, highCut: 5500, wet: 0.35 } },
      { id: 'dly_slapback', name: '50s Slapback Tape', pluginId: 'delay', isFactory: true, params: { delayTime: 0.09, feedback: 0.1, pingPong: 0.2, highCut: 4500, wet: 0.28 } },
      { id: 'dly_dub_space', name: 'Dub Space Echo', pluginId: 'delay', isFactory: true, params: { delayTime: 0.5, feedback: 0.78, pingPong: 1.0, highCut: 3500, wet: 0.45 } },
    ],
  },

  // 9. Stereo Chorus
  {
    id: 'chorus',
    name: 'Vintage Ensemble Chorus',
    category: 'modulation',
    description: 'Multi-voice pitch modulating delay line with wide stereo phase offset for lush, shimmer synth leads and guitars.',
    iconName: 'Zap',
    params: [
      { id: 'rate', name: 'Rate', type: 'number', min: 0.1, max: 8.0, step: 0.1, defaultVal: 1.5, unit: 'Hz' },
      { id: 'depth', name: 'Depth', type: 'number', min: 0.1, max: 1.0, step: 0.05, defaultVal: 0.65 },
      { id: 'delay', name: 'Delay Center', type: 'number', min: 5, max: 35, step: 1, defaultVal: 18, unit: 'ms' },
      { id: 'feedback', name: 'Feedback', type: 'number', min: 0, max: 0.6, step: 0.05, defaultVal: 0.2 },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.45 },
    ],
    factoryPresets: [
      { id: 'cho_juno', name: 'Juno 106 Chorus II', pluginId: 'chorus', isFactory: true, params: { rate: 1.2, depth: 0.75, delay: 20, feedback: 0.15, wet: 0.5 } },
      { id: 'cho_subtle', name: 'Subtle Guitar Dimension', pluginId: 'chorus', isFactory: true, params: { rate: 0.6, depth: 0.35, delay: 14, feedback: 0.05, wet: 0.3 } },
      { id: 'cho_wide_synth', name: 'Hyper-Wide Synth Shimmer', pluginId: 'chorus', isFactory: true, params: { rate: 2.4, depth: 0.85, delay: 24, feedback: 0.3, wet: 0.6 } },
    ],
  },

  // 10. Vintage Flanger
  {
    id: 'flanger',
    name: 'Metallic Tape Flanger',
    category: 'modulation',
    description: 'Short delay modulation with deep resonant comb filtering feedback creating classic jet-engine sweep effects.',
    iconName: 'Wind',
    params: [
      { id: 'rate', name: 'Rate', type: 'number', min: 0.05, max: 5.0, step: 0.05, defaultVal: 0.4, unit: 'Hz' },
      { id: 'depth', name: 'Depth', type: 'number', min: 0.1, max: 1.0, step: 0.05, defaultVal: 0.8 },
      { id: 'feedback', name: 'Resonance Feedback', type: 'number', min: -0.9, max: 0.9, step: 0.05, defaultVal: 0.65 },
      { id: 'manual', name: 'Manual Delay', type: 'number', min: 1, max: 15, step: 0.5, defaultVal: 3.5, unit: 'ms' },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.5 },
    ],
    factoryPresets: [
      { id: 'flg_jet', name: 'Jet Plane Sweep', pluginId: 'flanger', isFactory: true, params: { rate: 0.25, depth: 0.9, feedback: 0.75, manual: 2.0, wet: 0.6 } },
      { id: 'flg_subtle', name: 'Subtle Vocal Jet', pluginId: 'flanger', isFactory: true, params: { rate: 0.5, depth: 0.4, feedback: 0.35, manual: 5.0, wet: 0.35 } },
    ],
  },

  // 11. Multi-Stage Phaser
  {
    id: 'phaser',
    name: 'Multi-Stage Analog Phaser',
    category: 'modulation',
    description: 'Cascade of 4 all-pass phase shift filters modulated by sine LFO for warm swirl and funky sweeping notches.',
    iconName: 'Disc',
    params: [
      { id: 'rate', name: 'Rate', type: 'number', min: 0.1, max: 6.0, step: 0.1, defaultVal: 0.8, unit: 'Hz' },
      { id: 'depth', name: 'Depth', type: 'number', min: 0.1, max: 1.0, step: 0.05, defaultVal: 0.75 },
      { id: 'feedback', name: 'Feedback', type: 'number', min: 0, max: 0.85, step: 0.05, defaultVal: 0.5 },
      { id: 'baseFreq', name: 'Base Frequency', type: 'number', min: 200, max: 4000, step: 50, defaultVal: 1000, unit: 'Hz' },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.5 },
    ],
    factoryPresets: [
      { id: 'pha_funky', name: 'Funky Clav Phaser', pluginId: 'phaser', isFactory: true, params: { rate: 1.2, depth: 0.8, feedback: 0.6, baseFreq: 900, wet: 0.55 } },
      { id: 'pha_slow_drift', name: 'Slow Ambient Swirl', pluginId: 'phaser', isFactory: true, params: { rate: 0.2, depth: 0.9, feedback: 0.4, baseFreq: 1400, wet: 0.45 } },
    ],
  },

  // 12. Distortion & Tube Saturation
  {
    id: 'distortion',
    name: 'Analog Tube & Tape Saturation',
    category: 'distortion',
    description: 'Harmonic saturation and wave-shaping distortion engine supporting warm tube drive, hard clipping, tape compression, and fuzz.',
    iconName: 'Flame',
    params: [
      { id: 'drive', name: 'Drive Amount', type: 'number', min: 0.05, max: 1.0, step: 0.02, defaultVal: 0.4 },
      { id: 'type', name: 'Saturation Model', type: 'enum', defaultVal: 'tube', options: [
        { label: 'Warm Tube 12AX7', value: 'tube' },
        { label: 'Tape Saturation', value: 'tape' },
        { label: 'Hard Diode Clip', value: 'hard' },
        { label: 'Vintage Fuzz', value: 'fuzz' },
      ]},
      { id: 'tone', name: 'Tone Filter', type: 'number', min: 800, max: 14000, step: 200, defaultVal: 6500, unit: 'Hz' },
      { id: 'outputGain', name: 'Level Trim', type: 'number', min: -12, max: 6, step: 0.5, defaultVal: -1.0, unit: 'dB' },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.5 },
    ],
    factoryPresets: [
      { id: 'dist_tape', name: 'Tape Warmth & Glue', pluginId: 'distortion', isFactory: true, params: { drive: 0.25, type: 'tape', tone: 9000, outputGain: 0, wet: 0.4 } },
      { id: 'dist_808_grit', name: '808 Bass Grit', pluginId: 'distortion', isFactory: true, params: { drive: 0.6, type: 'tube', tone: 4500, outputGain: -2, wet: 0.65 } },
      { id: 'dist_fuzz_lead', name: 'Screaming Fuzz Lead', pluginId: 'distortion', isFactory: true, params: { drive: 0.9, type: 'fuzz', tone: 3200, outputGain: -4, wet: 0.8 } },
    ],
  },

  // 13. Bit Crusher & Lo-Fi Downsampler
  {
    id: 'bitcrusher',
    name: 'Lo-Fi 8-Bit Crusher',
    category: 'distortion',
    description: 'Digital resolution down-sampling and bit-depth quantization reduction for crunchy retro chip-tune textures and gritty hip-hop grit.',
    iconName: 'Cpu',
    params: [
      { id: 'bits', name: 'Bit Depth', type: 'number', min: 2, max: 16, step: 1, defaultVal: 8, unit: 'bits' },
      { id: 'downsample', name: 'Sample Decimation', type: 'number', min: 1, max: 32, step: 1, defaultVal: 4, unit: 'x' },
      { id: 'postFilter', name: 'Post Anti-Alias Filter', type: 'number', min: 1000, max: 16000, step: 200, defaultVal: 8000, unit: 'Hz' },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.5 },
    ],
    factoryPresets: [
      { id: 'bc_sp1200', name: 'SP-1200 Vintage 12-Bit', pluginId: 'bitcrusher', isFactory: true, params: { bits: 12, downsample: 2, postFilter: 9000, wet: 0.6 } },
      { id: 'bc_gameboy', name: '8-Bit Gameboy Chiptune', pluginId: 'bitcrusher', isFactory: true, params: { bits: 6, downsample: 8, postFilter: 5000, wet: 0.85 } },
      { id: 'bc_extreme', name: 'Industrial Bit Mangler', pluginId: 'bitcrusher', isFactory: true, params: { bits: 3, downsample: 16, postFilter: 3500, wet: 1.0 } },
    ],
  },

  // 14. Stereo Widener (Mid-Side Matrix)
  {
    id: 'stereowidth',
    name: 'Mid-Side Stereo Imager',
    category: 'utility',
    description: 'Mid-Side matrix spatial enhancer capable of collapsing bass to mono, spreading highs across the stereo field, and phase alignment.',
    iconName: 'MoveHorizontal',
    isMasteringGrade: true,
    params: [
      { id: 'width', name: 'Stereo Width', type: 'number', min: 0, max: 2.0, step: 0.05, defaultVal: 1.25, unit: 'x' },
      { id: 'monoBass', name: 'Bass Mono Cutoff', type: 'number', min: 40, max: 300, step: 10, defaultVal: 120, unit: 'Hz' },
      { id: 'balance', name: 'L/R Balance', type: 'number', min: -1.0, max: 1.0, step: 0.05, defaultVal: 0 },
    ],
    factoryPresets: [
      { id: 'sw_natural', name: 'Master Gentle Spread (125%)', pluginId: 'stereowidth', isFactory: true, params: { width: 1.25, monoBass: 120, balance: 0 } },
      { id: 'sw_mono', name: 'Collapse to Mono (Check Phase)', pluginId: 'stereowidth', isFactory: true, params: { width: 0, monoBass: 200, balance: 0 } },
      { id: 'sw_wide_synth', name: 'Super-Wide Synth Spread', pluginId: 'stereowidth', isFactory: true, params: { width: 1.75, monoBass: 140, balance: 0 } },
    ],
  },

  // 15. Auto-Pan
  {
    id: 'autopan',
    name: 'Rotary Auto-Pan',
    category: 'modulation',
    description: 'Dynamic stereo panner with variable LFO rate, depth, and sine/triangle modulation curves for rhythmic movement.',
    iconName: 'Compass',
    params: [
      { id: 'rate', name: 'LFO Rate', type: 'number', min: 0.1, max: 10.0, step: 0.1, defaultVal: 1.0, unit: 'Hz' },
      { id: 'depth', name: 'Width Depth', type: 'number', min: 0.1, max: 1.0, step: 0.05, defaultVal: 0.8 },
      { id: 'shape', name: 'LFO Shape', type: 'enum', defaultVal: 'sine', options: [
        { label: 'Smooth Sine', value: 'sine' },
        { label: 'Triangle', value: 'triangle' },
      ]},
    ],
    factoryPresets: [
      { id: 'pan_slow', name: 'Slow Ambient Drift (0.5 Hz)', pluginId: 'autopan', isFactory: true, params: { rate: 0.5, depth: 0.7, shape: 'sine' } },
      { id: 'pan_eighth', name: '1/8th Note Rotary Swirl', pluginId: 'autopan', isFactory: true, params: { rate: 2.0, depth: 0.9, shape: 'triangle' } },
    ],
  },

  // 16. Tremolo
  {
    id: 'tremolo',
    name: 'Optical Tremolo',
    category: 'modulation',
    description: 'Vintage tube and optical amplifier amplitude modulation providing rhythmic volume pulsing.',
    iconName: 'Activity',
    params: [
      { id: 'rate', name: 'Rate', type: 'number', min: 0.2, max: 12.0, step: 0.1, defaultVal: 3.5, unit: 'Hz' },
      { id: 'depth', name: 'Depth', type: 'number', min: 0.1, max: 1.0, step: 0.05, defaultVal: 0.75 },
      { id: 'shape', name: 'Wave Shape', type: 'enum', defaultVal: 'sine', options: [
        { label: 'Sine (Soft Tube)', value: 'sine' },
        { label: 'Square (Chopper)', value: 'square' },
      ]},
    ],
    factoryPresets: [
      { id: 'trm_surf', name: '60s Surf Tremolo', pluginId: 'tremolo', isFactory: true, params: { rate: 4.5, depth: 0.7, shape: 'sine' } },
      { id: 'trm_chopper', name: 'EDM Stutter Chopper', pluginId: 'tremolo', isFactory: true, params: { rate: 8.0, depth: 1.0, shape: 'square' } },
    ],
  },

  // 17. Multi-Mode Resonant Filter
  {
    id: 'filter',
    name: 'Multi-Mode Resonant Filter',
    category: 'eq',
    description: 'Analog ladder resonant filter offering Lowpass, Highpass, Bandpass, and Notch modes with adjustable cutoff and self-oscillating resonance.',
    iconName: 'Filter',
    params: [
      { id: 'type', name: 'Filter Mode', type: 'enum', defaultVal: 'lowpass', options: [
        { label: 'Lowpass 24dB', value: 'lowpass' },
        { label: 'Highpass 24dB', value: 'highpass' },
        { label: 'Bandpass 12dB', value: 'bandpass' },
        { label: 'Notch Band', value: 'notch' },
      ]},
      { id: 'cutoff', name: 'Cutoff Frequency', type: 'number', min: 20, max: 20000, step: 50, defaultVal: 1800, unit: 'Hz' },
      { id: 'resonance', name: 'Resonance (Q)', type: 'number', min: 0.5, max: 20.0, step: 0.2, defaultVal: 4.0 },
      { id: 'drive', name: 'Drive Boost', type: 'number', min: 0, max: 12, step: 0.5, defaultVal: 2.0, unit: 'dB' },
    ],
    factoryPresets: [
      { id: 'flt_club_lp', name: 'Club Lowpass Filter Sweep', pluginId: 'filter', isFactory: true, params: { type: 'lowpass', cutoff: 800, resonance: 6.0, drive: 3.0 } },
      { id: 'flt_telephone', name: 'Telephone Radio Effect', pluginId: 'filter', isFactory: true, params: { type: 'bandpass', cutoff: 1400, resonance: 2.5, drive: 4.0 } },
      { id: 'flt_bass_drop', name: 'Highpass Drop Build', pluginId: 'filter', isFactory: true, params: { type: 'highpass', cutoff: 450, resonance: 3.5, drive: 1.0 } },
    ],
  },

  // 18. Transient Shaper
  {
    id: 'transient_shaper',
    name: 'Dynamic Transient Shaper',
    category: 'dynamics',
    description: 'Independent attack and sustain dynamic envelope sculptor without standard threshold settings for punchy kicks and snappy snares.',
    iconName: 'Zap',
    params: [
      { id: 'attack', name: 'Attack Boost/Cut', type: 'number', min: -12, max: 12, step: 0.5, defaultVal: 3.5, unit: 'dB' },
      { id: 'sustain', name: 'Sustain Boost/Cut', type: 'number', min: -12, max: 12, step: 0.5, defaultVal: -2.0, unit: 'dB' },
      { id: 'outputGain', name: 'Output Gain', type: 'number', min: -12, max: 12, step: 0.5, defaultVal: 0, unit: 'dB' },
    ],
    factoryPresets: [
      { id: 'ts_punchy_kick', name: 'Punchy Kick Snap', pluginId: 'transient_shaper', isFactory: true, params: { attack: 5.0, sustain: -3.0, outputGain: -1.0 } },
      { id: 'ts_snare_crack', name: 'Crack Snare Transients', pluginId: 'transient_shaper', isFactory: true, params: { attack: 4.0, sustain: 2.5, outputGain: -2.0 } },
      { id: 'ts_smooth_decay', name: 'Smooth Room Tails', pluginId: 'transient_shaper', isFactory: true, params: { attack: -4.0, sustain: 4.0, outputGain: 0 } },
    ],
  },

  // 19. Pitch Shifter
  {
    id: 'pitch_shifter',
    name: 'Fine Pitch Shifter & Detuner',
    category: 'utility',
    description: 'Micro-pitch detuner and semitone transposer for chorus doubling, thick octaves, and vocal effects.',
    iconName: 'Music',
    params: [
      { id: 'semitones', name: 'Semitones', type: 'number', min: -12, max: 12, step: 1, defaultVal: 0, unit: 'st' },
      { id: 'fine', name: 'Fine Detune', type: 'number', min: -50, max: 50, step: 1, defaultVal: 12, unit: 'cents' },
      { id: 'wet', name: 'Wet Mix', type: 'number', min: 0, max: 1, step: 0.02, defaultVal: 0.4 },
    ],
    factoryPresets: [
      { id: 'ps_micro_double', name: 'Micro-Pitch Vocal Double (+12c)', pluginId: 'pitch_shifter', isFactory: true, params: { semitones: 0, fine: 14, wet: 0.4 } },
      { id: 'ps_sub_octave', name: 'Sub Octave Doubler (-12st)', pluginId: 'pitch_shifter', isFactory: true, params: { semitones: -12, fine: 0, wet: 0.5 } },
      { id: 'ps_fifth_harmony', name: 'Fifth Harmony (+7st)', pluginId: 'pitch_shifter', isFactory: true, params: { semitones: 7, fine: 0, wet: 0.35 } },
    ],
  },
];

export class PluginRegistry {
  public static getAll(): PluginDefinition[] {
    return BUILT_IN_PLUGINS;
  }

  public static getById(id: EffectType): PluginDefinition | undefined {
    return BUILT_IN_PLUGINS.find((p) => p.id === id);
  }

  public static getByCategory(category: PluginCategory): PluginDefinition[] {
    return BUILT_IN_PLUGINS.filter((p) => p.category === category);
  }

  public static createDefaultConfig(id: EffectType): {
    id: string;
    type: EffectType;
    name: string;
    enabled: boolean;
    params: Record<string, any>;
  } {
    const def = this.getById(id);
    const params: Record<string, any> = {};
    if (def) {
      for (const p of def.params) {
        params[p.id] = p.defaultVal;
      }
    }

    return {
      id: `fx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: id,
      name: def ? def.name : id,
      enabled: true,
      params,
    };
  }
}
