/**
 * BeatFlow Studio - Default Project Template
 * Production-ready groove with drum pattern, bassline, polyphonic chord progression, and lead synth melody.
 */
import { Project, ChannelRackChannel, Pattern, Track, MixerChannel } from '../types/project';

export function createDefaultProject(): Project {
  const channels: ChannelRackChannel[] = [
    {
      id: 'ch_kick',
      name: '808 Kick',
      type: 'drum',
      drumType: 'kick',
      color: '#f97316', // Orange
      volume: 0.9,
      pan: 0,
      mute: false,
      solo: false,
      mixerChannel: 1,
    },
    {
      id: 'ch_snare',
      name: 'Trap Snare',
      type: 'drum',
      drumType: 'snare',
      color: '#ef4444', // Red
      volume: 0.85,
      pan: 0,
      mute: false,
      solo: false,
      mixerChannel: 2,
    },
    {
      id: 'ch_clap',
      name: 'Studio Clap',
      type: 'drum',
      drumType: 'clap',
      color: '#ec4899', // Pink
      volume: 0.8,
      pan: 0.1,
      mute: false,
      solo: false,
      mixerChannel: 2,
    },
    {
      id: 'ch_hihat_c',
      name: 'Closed Hat',
      type: 'drum',
      drumType: 'hihat_closed',
      color: '#eab308', // Yellow
      volume: 0.75,
      pan: -0.15,
      mute: false,
      solo: false,
      mixerChannel: 3,
    },
    {
      id: 'ch_hihat_o',
      name: 'Open Hat',
      type: 'drum',
      drumType: 'hihat_open',
      color: '#facc15',
      volume: 0.65,
      pan: 0.2,
      mute: false,
      solo: false,
      mixerChannel: 3,
    },
    {
      id: 'ch_perc',
      name: 'Rim Perc',
      type: 'drum',
      drumType: 'perc',
      color: '#a855f7',
      volume: 0.7,
      pan: 0.25,
      mute: false,
      solo: false,
      mixerChannel: 3,
    },
    {
      id: 'ch_bass',
      name: '808 Sub',
      type: 'synth',
      synthPreset: 'sub_808',
      color: '#8b5cf6', // Violet
      volume: 0.9,
      pan: 0,
      mute: false,
      solo: false,
      mixerChannel: 4,
    },
    {
      id: 'ch_lead',
      name: 'Cyber Lead',
      type: 'synth',
      synthPreset: 'lead',
      color: '#06b6d4', // Cyan
      volume: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      mixerChannel: 5,
    },
    {
      id: 'ch_pad',
      name: 'Ambient Pad',
      type: 'synth',
      synthPreset: 'pad',
      color: '#10b981', // Emerald
      volume: 0.75,
      pan: 0,
      mute: false,
      solo: false,
      mixerChannel: 6,
    },
    {
      id: 'ch_epiano',
      name: 'FM Electric Keys',
      type: 'synth',
      synthPreset: 'epiano',
      color: '#3b82f6', // Blue
      volume: 0.8,
      pan: 0,
      mute: false,
      solo: false,
      mixerChannel: 7,
    },
  ];

  // 16-step default drum groove
  const pattern1DrumSteps: Record<string, number[]> = {
    ch_kick:     [1.0, 0, 0, 0, 0, 0, 0.9, 0, 0.95, 0, 0.85, 0, 0, 0, 0, 0],
    ch_snare:    [0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0],
    ch_clap:     [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.95, 0, 0, 0],
    ch_hihat_c:  [0.9, 0.5, 0.75, 0.5, 0.9, 0.5, 0.8, 0.5, 0.9, 0.5, 0.75, 0.5, 0.9, 0.5, 0.8, 0.6],
    ch_hihat_o:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.85, 0],
    ch_perc:     [0, 0, 0.7, 0, 0, 0, 0, 0.6, 0, 0, 0, 0.7, 0, 0, 0, 0],
  };

  // Piano roll notes for Lead, Pad, FM Keys, and Bass
  const pattern1Notes: Record<string, any[]> = {
    ch_bass: [
      { id: 'b1', pitch: 'C2', midi: 36, step: 0, duration: 4, velocity: 0.95 },
      { id: 'b2', pitch: 'D#2', midi: 39, step: 6, duration: 2, velocity: 0.85 },
      { id: 'b3', pitch: 'F2', midi: 41, step: 8, duration: 4, velocity: 0.9 },
      { id: 'b4', pitch: 'G2', midi: 43, step: 12, duration: 3, velocity: 0.9 },
    ],
    ch_lead: [
      { id: 'l1', pitch: 'C4', midi: 60, step: 0, duration: 2, velocity: 0.8 },
      { id: 'l2', pitch: 'D#4', midi: 63, step: 2, duration: 2, velocity: 0.85 },
      { id: 'l3', pitch: 'G4', midi: 67, step: 4, duration: 3, velocity: 0.9 },
      { id: 'l4', pitch: 'F4', midi: 65, step: 8, duration: 2, velocity: 0.85 },
      { id: 'l5', pitch: 'A#4', midi: 70, step: 10, duration: 2, velocity: 0.9 },
      { id: 'l6', pitch: 'G4', midi: 67, step: 12, duration: 3, velocity: 0.85 },
    ],
    ch_pad: [
      // Cm7 (C3, D#3, G3, A#3)
      { id: 'p1', pitch: 'C3', midi: 48, step: 0, duration: 8, velocity: 0.7 },
      { id: 'p2', pitch: 'D#3', midi: 51, step: 0, duration: 8, velocity: 0.7 },
      { id: 'p3', pitch: 'G3', midi: 55, step: 0, duration: 8, velocity: 0.7 },
      { id: 'p4', pitch: 'A#3', midi: 58, step: 0, duration: 8, velocity: 0.7 },
      // Fm7 (F3, G#3, C4, D#4)
      { id: 'p5', pitch: 'F3', midi: 53, step: 8, duration: 8, velocity: 0.7 },
      { id: 'p6', pitch: 'G#3', midi: 56, step: 8, duration: 8, velocity: 0.7 },
      { id: 'p7', pitch: 'C4', midi: 60, step: 8, duration: 8, velocity: 0.7 },
      { id: 'p8', pitch: 'D#4', midi: 63, step: 8, duration: 8, velocity: 0.7 },
    ],
    ch_epiano: [
      { id: 'e1', pitch: 'G4', midi: 67, step: 2, duration: 2, velocity: 0.75 },
      { id: 'e2', pitch: 'C5', midi: 72, step: 6, duration: 2, velocity: 0.75 },
      { id: 'e3', pitch: 'D#5', midi: 75, step: 10, duration: 2, velocity: 0.8 },
      { id: 'e4', pitch: 'D5', midi: 74, step: 14, duration: 2, velocity: 0.75 },
    ],
  };

  // Pattern 2: Breakdown beat
  const pattern2DrumSteps: Record<string, number[]> = {
    ch_kick:     [1.0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0],
    ch_snare:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0, 0.8, 0.9, 1.0],
    ch_clap:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
    ch_hihat_c:  [0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.9, 0.8, 0.9, 0.9],
    ch_hihat_o:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ch_perc:     [0, 0, 0.7, 0, 0, 0, 0.8, 0, 0, 0, 0.7, 0, 0, 0, 0, 0],
  };

  const patterns: Pattern[] = [
    {
      id: 'pat_main',
      name: 'Pattern 1 (Main Groove)',
      color: '#f97316',
      lengthInSteps: 16,
      drumSteps: pattern1DrumSteps,
      notes: pattern1Notes,
    },
    {
      id: 'pat_break',
      name: 'Pattern 2 (Breakdown)',
      color: '#06b6d4',
      lengthInSteps: 16,
      drumSteps: pattern2DrumSteps,
      notes: {},
    },
  ];

  const tracks: Track[] = [
    { id: 'trk_0', name: 'Track 1 (Drums)', color: '#f97316', volume: 0.9, pan: 0, mute: false, solo: false, height: 60 },
    { id: 'trk_1', name: 'Track 2 (Bass)', color: '#8b5cf6', volume: 0.9, pan: 0, mute: false, solo: false, height: 60 },
    { id: 'trk_2', name: 'Track 3 (Lead)', color: '#06b6d4', volume: 0.85, pan: 0, mute: false, solo: false, height: 60 },
    { id: 'trk_3', name: 'Track 4 (Chords)', color: '#10b981', volume: 0.8, pan: 0, mute: false, solo: false, height: 60 },
    { id: 'trk_4', name: 'Track 5 (Audio / Mic)', color: '#ec4899', volume: 0.85, pan: 0, mute: false, solo: false, height: 60 },
  ];

  // Default arrangement clips across timeline
  const clips = [
    // Track 0 (Drums): Pattern 1 (bars 1-2), Pattern 1 (bars 3-4), Pattern 2 (bars 5-6), Pattern 1 (bars 7-8)
    { id: 'clip_1', trackIndex: 0, startStep: 0, durationSteps: 32, type: 'pattern' as const, patternId: 'pat_main', name: 'Drums Groove', color: '#f97316' },
    { id: 'clip_2', trackIndex: 0, startStep: 32, durationSteps: 32, type: 'pattern' as const, patternId: 'pat_break', name: 'Drums Break', color: '#06b6d4' },
    { id: 'clip_3', trackIndex: 0, startStep: 64, durationSteps: 32, type: 'pattern' as const, patternId: 'pat_main', name: 'Drums Groove', color: '#f97316' },

    // Track 1 (Bass): Pattern 1 (bars 1-2, 3-4, 7-8)
    { id: 'clip_4', trackIndex: 1, startStep: 0, durationSteps: 32, type: 'pattern' as const, patternId: 'pat_main', name: '808 Bassline', color: '#8b5cf6' },
    { id: 'clip_5', trackIndex: 1, startStep: 64, durationSteps: 32, type: 'pattern' as const, patternId: 'pat_main', name: '808 Bassline', color: '#8b5cf6' },

    // Track 2 (Lead): Pattern 1
    { id: 'clip_6', trackIndex: 2, startStep: 0, durationSteps: 32, type: 'pattern' as const, patternId: 'pat_main', name: 'Cyber Lead Hook', color: '#06b6d4' },
    { id: 'clip_7', trackIndex: 2, startStep: 64, durationSteps: 32, type: 'pattern' as const, patternId: 'pat_main', name: 'Cyber Lead Hook', color: '#06b6d4' },

    // Track 3 (Chords): Pattern 1 (throughout)
    { id: 'clip_8', trackIndex: 3, startStep: 0, durationSteps: 96, type: 'pattern' as const, patternId: 'pat_main', name: 'Ambient Pad & Keys', color: '#10b981' },
  ];

  const mixerChannels: MixerChannel[] = [
    {
      id: 0,
      name: 'Master',
      color: '#e2e8f0',
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'm_eq',
          type: 'eq3',
          name: 'Master EQ',
          enabled: true,
          params: { low: 1.0, mid: 0.0, high: 1.5 },
        },
      ],
    },
    {
      id: 1,
      name: 'Kick / Drums',
      color: '#f97316',
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'd_eq',
          type: 'eq3',
          name: 'Drum Punch EQ',
          enabled: true,
          params: { low: 2.0, mid: -1.0, high: 2.0 },
        },
      ],
    },
    {
      id: 2,
      name: 'Snare / Clap',
      color: '#ef4444',
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'sn_verb',
          type: 'reverb',
          name: 'Snare Reverb',
          enabled: true,
          params: { wet: 0.22, roomSize: 0.5 },
        },
      ],
    },
    {
      id: 3,
      name: 'Hi-Hats',
      color: '#eab308',
      volume: -2,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'hh_delay',
          type: 'delay',
          name: 'Stereo Delay',
          enabled: true,
          params: { wet: 0.18, delayTime: 0.18, feedback: 0.25 },
        },
      ],
    },
    {
      id: 4,
      name: '808 Bass',
      color: '#8b5cf6',
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'b_dist',
          type: 'distortion',
          name: 'Warm Saturation',
          enabled: true,
          params: { wet: 0.15, distortion: 0.2 },
        },
      ],
    },
    {
      id: 5,
      name: 'Lead Synth',
      color: '#06b6d4',
      volume: -1,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'l_delay',
          type: 'delay',
          name: 'Echo Delay',
          enabled: true,
          params: { wet: 0.28, delayTime: 0.25, feedback: 0.35 },
        },
        {
          id: 'l_verb',
          type: 'reverb',
          name: 'Lead Space',
          enabled: true,
          params: { wet: 0.25, roomSize: 0.6 },
        },
      ],
    },
    {
      id: 6,
      name: 'Pads',
      color: '#10b981',
      volume: -2,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'p_verb',
          type: 'reverb',
          name: 'Lush Chamber',
          enabled: true,
          params: { wet: 0.45, roomSize: 0.8 },
        },
      ],
    },
    {
      id: 7,
      name: 'Keys',
      color: '#3b82f6',
      volume: -1,
      pan: 0,
      mute: false,
      solo: false,
      effects: [
        {
          id: 'k_delay',
          type: 'delay',
          name: 'Keys PingPong',
          enabled: true,
          params: { wet: 0.2, delayTime: 0.2, feedback: 0.3 },
        },
      ],
    },
    {
      id: 8,
      name: 'Audio / Mic',
      color: '#ec4899',
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      effects: [],
    },
  ];

  return {
    id: 'proj_default',
    name: 'Neon Cyber Groove',
    bpm: 130,
    timeSignature: [4, 4],
    swing: 0.15,
    patterns,
    activePatternId: 'pat_main',
    channels,
    tracks,
    clips,
    mixerChannels,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
