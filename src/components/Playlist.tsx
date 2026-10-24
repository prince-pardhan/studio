/**
 * BeatFlow Studio - Multitrack Arrangement Playlist
 * Interactive timeline with drag-and-drop clips, timeline markers & section labels,
 * loop playback range, real-time automation lanes, snap-to-grid, zoom, and playhead.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Copy,
  Layers,
  Flag,
  Activity,
  Repeat,
} from 'lucide-react';
import {
  Project,
  ArrangementClip,
  Track,
  TimelineMarker,
  AutomationLane,
  AutomationPoint,
} from '../types/project';
import { AudioEngine } from '../audio/AudioEngine';

interface PlaylistProps {
  project: Project;
  currentStep: number;
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  onAddClip: (clip: ArrangementClip) => void;
  onUpdateClip: (id: string, updates: Partial<ArrangementClip>) => void;
  onDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onUpdateProjectTracks: (tracks: Track[]) => void;
  onAddMarker?: (name: string, step: number) => void;
  onDeleteMarker?: (id: string) => void;
  onSetLoopRange?: (startStep: number, endStep: number, enabled?: boolean) => void;
  onToggleLoop?: () => void;
  onAddAutomationLane?: (lane: AutomationLane) => void;
  onUpdateAutomationPoint?: (laneId: string, point: AutomationPoint) => void;
  onDeleteAutomationLane?: (laneId: string) => void;
}

export const Playlist: React.FC<PlaylistProps> = ({
  project,
  currentStep,
  zoomLevel,
  setZoomLevel,
  selectedClipId,
  setSelectedClipId,
  onAddClip,
  onUpdateClip,
  onDeleteClip,
  onDuplicateClip,
  onUpdateProjectTracks,
  onAddMarker,
  onDeleteMarker,
  onSetLoopRange,
  onToggleLoop,
  onAddAutomationLane,
  onUpdateAutomationPoint,
  onDeleteAutomationLane,
}) => {
  const [snapGrid, setSnapGrid] = useState<number>(16);
  const [showAutomation, setShowAutomation] = useState(false);
  const [newMarkerName, setNewMarkerName] = useState('Chorus');
  const [draggingClip, setDraggingClip] = useState<{
    id: string;
    initialStep: number;
    initialTrack: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [resizingClip, setResizingClip] = useState<{
    id: string;
    initialDuration: number;
    startX: number;
  } | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const audioEngine = useRef(AudioEngine.getInstance()).current;

  const stepWidth = 14 * zoomLevel;
  const barWidth = stepWidth * 16;
  const totalBars = 16;
  const totalSteps = totalBars * 16;

  const loopStart = project.loopStartStep ?? 0;
  const loopEnd = project.loopEndStep ?? 64;

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetStep = Math.max(0, Math.floor(clickX / stepWidth));
    audioEngine.seekToStep(targetStep);
  };

  const handleClipMouseDown = (e: React.MouseEvent, clip: ArrangementClip) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);

    setDraggingClip({
      id: clip.id,
      initialStep: clip.startStep,
      initialTrack: clip.trackIndex,
      startX: e.clientX,
      startY: e.clientY,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, clip: ArrangementClip) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);

    setResizingClip({
      id: clip.id,
      initialDuration: clip.durationSteps,
      startX: e.clientX,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingClip) {
        const deltaX = e.clientX - draggingClip.startX;
        const deltaSteps = Math.round(deltaX / stepWidth);
        const snappedDelta = Math.round(deltaSteps / snapGrid) * snapGrid;
        const newStep = Math.max(0, draggingClip.initialStep + snappedDelta);

        const deltaY = e.clientY - draggingClip.startY;
        const trackDelta = Math.round(deltaY / 64);
        const newTrack = Math.max(
          0,
          Math.min(project.tracks.length - 1, draggingClip.initialTrack + trackDelta)
        );

        onUpdateClip(draggingClip.id, {
          startStep: newStep,
          trackIndex: newTrack,
        });
      } else if (resizingClip) {
        const deltaX = e.clientX - resizingClip.startX;
        const deltaSteps = Math.round(deltaX / stepWidth);
        const snappedDelta = Math.round(deltaSteps / snapGrid) * snapGrid;
        const newDuration = Math.max(snapGrid, resizingClip.initialDuration + snappedDelta);

        onUpdateClip(resizingClip.id, {
          durationSteps: newDuration,
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingClip(null);
      setResizingClip(null);
    };

    if (draggingClip || resizingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingClip, resizingClip, stepWidth, snapGrid, project.tracks.length, onUpdateClip]);

  const toggleTrackMute = (trackIndex: number) => {
    const updated = project.tracks.map((t, idx) =>
      idx === trackIndex ? { ...t, mute: !t.mute } : t
    );
    onUpdateProjectTracks(updated);
  };

  const toggleTrackSolo = (trackIndex: number) => {
    const updated = project.tracks.map((t, idx) =>
      idx === trackIndex ? { ...t, solo: !t.solo } : t
    );
    onUpdateProjectTracks(updated);
  };

  const handleTrackVolume = (trackIndex: number, vol: number) => {
    const updated = project.tracks.map((t, idx) =>
      idx === trackIndex ? { ...t, volume: vol } : t
    );
    onUpdateProjectTracks(updated);
  };

  const addNewTrack = () => {
    const newIdx = project.tracks.length;
    const colors = ['#f97316', '#06b6d4', '#10b981', '#a855f7', '#ec4899', '#3b82f6'];
    const newTrack: Track = {
      id: `trk_${Date.now()}`,
      name: `Track ${newIdx + 1}`,
      color: colors[newIdx % colors.length],
      volume: 0.85,
      pan: 0,
      mute: false,
      solo: false,
      height: 64,
    };
    onUpdateProjectTracks([...project.tracks, newTrack]);
  };

  const handleAddDefaultMarker = () => {
    const step = Math.floor(currentStep / 16) * 16;
    onAddMarker?.(newMarkerName, step);
  };

  const handleCreateAutomationLane = (target: any) => {
    const newLane: AutomationLane = {
      id: `auto_${Date.now()}`,
      name: target === 'filter_cutoff' ? 'Filter Cutoff Sweep' : 'Master Volume Fade',
      target,
      points: [
        { id: 'p1', step: 0, value: 0.3 },
        { id: 'p2', step: 32, value: 0.8 },
        { id: 'p3', step: 64, value: 0.4 },
      ],
      color: '#06b6d4',
      enabled: true,
    };
    onAddAutomationLane?.(newLane);
    setShowAutomation(true);
  };

  const handleLaneDoubleClick = (trackIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const rawStep = Math.floor(clickX / stepWidth);
    const startStep = Math.floor(rawStep / snapGrid) * snapGrid;

    const activePat =
      project.patterns.find((p) => p.id === project.activePatternId) || project.patterns[0];
    const newClip: ArrangementClip = {
      id: `clip_${Date.now()}`,
      trackIndex,
      startStep,
      durationSteps: activePat.lengthInSteps * 2,
      type: 'pattern',
      patternId: activePat.id,
      name: activePat.name,
      color: activePat.color,
    };
    onAddClip(newClip);
    setSelectedClipId(newClip.id);
  };

  return (
    <div className="flex flex-col flex-1 bg-[#121317] overflow-hidden select-none">
      {/* Sub-toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#17181f] border-b border-[#252733] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-semibold text-zinc-200">Playlist Timeline</span>
          </div>

          {/* Snap selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 font-medium">Snap:</span>
            <select
              value={snapGrid}
              onChange={(e) => setSnapGrid(parseInt(e.target.value, 10))}
              className="bg-[#20222c] border border-[#2c2f3d] text-zinc-300 rounded px-2 py-0.5 text-xs outline-none"
            >
              <option value={16}>1 Bar</option>
              <option value={8}>1/2 Bar</option>
              <option value={4}>1/4 Beat</option>
              <option value={1}>1/16 Step</option>
            </select>
          </div>

          {/* Section Marker Adder */}
          <div className="flex items-center gap-1 pl-2 border-l border-zinc-700">
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={newMarkerName}
              onChange={(e) => setNewMarkerName(e.target.value)}
              className="bg-[#20222c] border border-[#2c2f3d] text-zinc-300 rounded px-1.5 py-0.5 text-xs outline-none"
            >
              <option value="Intro">Intro</option>
              <option value="Verse 1">Verse 1</option>
              <option value="Build">Build</option>
              <option value="Chorus">Chorus</option>
              <option value="Drop">Drop</option>
              <option value="Bridge">Bridge</option>
              <option value="Outro">Outro</option>
            </select>
            <button
              onClick={handleAddDefaultMarker}
              title="Add marker at playhead"
              className="px-2 py-0.5 bg-[#252735] hover:bg-[#34384b] text-zinc-200 rounded text-xs font-semibold"
            >
              + Marker
            </button>
          </div>

          {/* Loop toggle */}
          <button
            onClick={() => onToggleLoop?.()}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
              project.loopEnabled
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                : 'text-zinc-400 hover:text-white bg-[#20222c]'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>Loop ({Math.floor(loopStart / 16) + 1}–{Math.floor(loopEnd / 16) + 1})</span>
          </button>

          {/* Automation Lane Switcher */}
          <button
            onClick={() => setShowAutomation(!showAutomation)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
              showAutomation
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-zinc-400 hover:text-white bg-[#20222c]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Automation</span>
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.2))}
            title="Zoom Out (-)"
            className="p-1 text-zinc-400 hover:text-white bg-[#20222c] rounded border border-[#2c2f3d]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(2.2, zoomLevel + 0.2))}
            title="Zoom In (+)"
            className="p-1 text-zinc-400 hover:text-white bg-[#20222c] rounded border border-[#2c2f3d]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Timeline Workspace */}
      <div className="flex flex-1 overflow-hidden" ref={timelineContainerRef}>
        {/* Left Track Headers */}
        <div className="w-56 shrink-0 bg-[#16171e] border-r border-[#262835] flex flex-col">
          <div className="h-8 bg-[#1a1b24] border-b border-[#262835] flex items-center justify-between px-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tracks</span>
            <button
              onClick={addNewTrack}
              title="Add New Track"
              className="text-zinc-400 hover:text-orange-400 p-0.5 rounded hover:bg-[#252733]"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {project.tracks.map((track, idx) => (
              <div
                key={track.id}
                style={{ height: 64 }}
                className="flex flex-col justify-between p-2 border-b border-[#222430] bg-[#171821] hover:bg-[#1b1c27] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {track.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => toggleTrackMute(idx)}
                    className={`w-5 h-4.5 rounded text-[10px] font-bold transition-colors ${
                      track.mute
                        ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                        : 'bg-[#252833] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => toggleTrackSolo(idx)}
                    className={`w-5 h-4.5 rounded text-[10px] font-bold transition-colors ${
                      track.solo
                        ? 'bg-amber-400 text-black font-extrabold'
                        : 'bg-[#252833] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    S
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={track.volume}
                    onChange={(e) => handleTrackVolume(idx, parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-zinc-700 cursor-pointer"
                    title={`Volume: ${Math.round(track.volume * 100)}%`}
                  />
                </div>
              </div>
            ))}

            {/* Automation Lane Header if active */}
            {showAutomation && (
              <div className="p-2 border-b border-[#292c3d] bg-[#1a1d28]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-cyan-400">Automation</span>
                  <button
                    onClick={() => handleCreateAutomationLane('filter_cutoff')}
                    className="text-[10px] px-1.5 py-0.5 bg-[#252838] text-zinc-300 rounded hover:text-white"
                  >
                    + Filter Cutoff
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Scrollable Grid */}
        <div className="flex-1 overflow-auto relative bg-[#111216]">
          {/* Bar Ruler Header with Markers */}
          <div
            onClick={handleRulerClick}
            style={{ width: totalSteps * stepWidth }}
            className="h-8 bg-[#1a1b24] border-b border-[#262835] relative cursor-pointer sticky top-0 z-20 flex"
          >
            {Array.from({ length: totalBars }).map((_, barIdx) => (
              <div
                key={barIdx}
                style={{ width: barWidth }}
                className="h-full border-r border-[#2d3040] flex items-center px-2 text-[11px] font-mono text-zinc-400 select-none relative"
              >
                <span className="font-semibold text-zinc-300">{barIdx + 1}</span>
              </div>
            ))}

            {/* Timeline Markers */}
            {(project.markers || []).map((marker) => (
              <div
                key={marker.id}
                className="absolute top-0 bottom-0 z-25 flex items-center gap-1 px-1.5 bg-black/60 border-l-2 rounded-r pointer-events-auto"
                style={{
                  left: marker.step * stepWidth,
                  borderColor: marker.color,
                }}
              >
                <Flag className="w-2.5 h-2.5" style={{ color: marker.color }} />
                <span className="text-[9px] font-bold text-white whitespace-nowrap">
                  {marker.name}
                </span>
              </div>
            ))}

            {/* Loop Range Highlight */}
            {project.loopEnabled && (
              <div
                style={{
                  left: loopStart * stepWidth,
                  width: (loopEnd - loopStart) * stepWidth,
                }}
                className="absolute top-0 bottom-0 bg-orange-500/15 border-x-2 border-orange-500/50 pointer-events-none"
              />
            )}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-orange-500 pointer-events-none z-30 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
              style={{
                left: currentStep * stepWidth,
                transition: 'left 0.05s linear',
              }}
            >
              <div className="w-2.5 h-2.5 bg-orange-500 -ml-1 rotate-45" />
            </div>
          </div>

          {/* Grid Lanes Container */}
          <div
            style={{ width: totalSteps * stepWidth }}
            className="relative"
            onClick={() => setSelectedClipId(null)}
          >
            <div className="absolute inset-0 pointer-events-none flex">
              {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                const isBar = stepIdx % 16 === 0;
                const isBeat = stepIdx % 4 === 0;
                return (
                  <div
                    key={stepIdx}
                    style={{ width: stepWidth }}
                    className={`h-full border-r ${
                      isBar
                        ? 'border-[#2d3040]'
                        : isBeat
                        ? 'border-[#1e202b]'
                        : 'border-[#181922]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-orange-500 pointer-events-none z-20 opacity-90 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
              style={{
                left: currentStep * stepWidth,
                transition: 'left 0.05s linear',
              }}
            />

            {/* Track Lanes */}
            {project.tracks.map((track, trackIdx) => (
              <div
                key={track.id}
                style={{ height: 64 }}
                onDoubleClick={(e) => handleLaneDoubleClick(trackIdx, e)}
                className="border-b border-[#20222c] relative hover:bg-white/[0.01] transition-colors"
              >
                {project.clips
                  .filter((c) => c.trackIndex === trackIdx)
                  .map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const clipWidth = clip.durationSteps * stepWidth;
                    const clipLeft = clip.startStep * stepWidth;

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        style={{
                          left: clipLeft,
                          width: clipWidth,
                          height: 54,
                          top: 5,
                          backgroundColor: `${clip.color}33`,
                          border: `1.5px solid ${clip.color}`,
                        }}
                        className={`absolute rounded-md cursor-grab active:cursor-grabbing overflow-hidden shadow-sm flex flex-col justify-between p-1.5 transition-all z-10 ${
                          isSelected
                            ? 'ring-2 ring-white shadow-lg'
                            : 'hover:brightness-110'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-white px-1 truncate">
                          <span className="truncate">{clip.name}</span>
                          <span className="text-[9px] font-mono opacity-80">
                            {clip.durationSteps} steps
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 h-4 px-1 opacity-70 overflow-hidden">
                          {Array.from({ length: Math.min(32, Math.floor(clip.durationSteps)) }).map(
                            (_, i) => (
                              <div
                                key={i}
                                className="w-1 rounded-sm"
                                style={{
                                  height: `${(i % 4 === 0 ? 12 : i % 2 === 0 ? 8 : 4)}px`,
                                  backgroundColor: clip.color,
                                }}
                              />
                            )
                          )}
                        </div>

                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, clip)}
                          title="Drag to resize clip duration"
                          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/40 transition-colors flex items-center justify-center"
                        >
                          <div className="w-0.5 h-4 bg-white/60 rounded" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}

            {/* Automation Curve Lanes (if enabled) */}
            {showAutomation &&
              (project.automationLanes || []).map((lane) => (
                <div
                  key={lane.id}
                  style={{ height: 64 }}
                  className="border-b border-[#292c3d] bg-black/25 relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;
                    const step = Math.round(clickX / stepWidth);
                    const val = Math.max(0, Math.min(1, 1 - clickY / 64));

                    onUpdateAutomationPoint?.(lane.id, {
                      id: `pt_${Date.now()}`,
                      step,
                      value: val,
                    });
                  }}
                >
                  <div className="absolute top-1 left-2 text-[10px] font-mono text-cyan-400 font-bold z-10">
                    {lane.name} (Click to place curve points)
                  </div>

                  {/* Render Curve Nodes */}
                  {lane.points.map((pt) => (
                    <div
                      key={pt.id}
                      style={{
                        left: pt.step * stepWidth - 4,
                        top: (1 - pt.value) * 54 + 2,
                      }}
                      className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full border border-white shadow-md z-15 cursor-pointer hover:scale-125"
                    />
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
