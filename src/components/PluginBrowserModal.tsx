/**
 * BeatFlow Studio - Searchable Plugin Browser Modal
 * Categorized catalog of 19 studio audio effects with search, descriptions,
 * parameter counts, favorites, and instant channel insert insertion.
 */
import React, { useState } from 'react';
import {
  Search,
  Activity,
  Sliders,
  Minimize2,
  ShieldAlert,
  Sparkles,
  Radio,
  Zap,
  Flame,
  Cpu,
  MoveHorizontal,
  Compass,
  Filter,
  Music,
  Plus,
  Star,
  Check,
} from 'lucide-react';
import { EffectType, PluginCategory, PluginDefinition } from '../types/project';
import { BUILT_IN_PLUGINS } from '../plugins/PluginRegistry';

interface PluginBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetChannelId: number;
  channelName: string;
  onAddPlugin: (channelId: number, type: EffectType) => void;
}

const CATEGORIES: { id: PluginCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All FX (19)' },
  { id: 'eq', label: 'EQ & Filters' },
  { id: 'dynamics', label: 'Dynamics' },
  { id: 'reverb', label: 'Reverbs' },
  { id: 'delay', label: 'Delays' },
  { id: 'modulation', label: 'Modulation' },
  { id: 'distortion', label: 'Distortion & Lo-Fi' },
  { id: 'utility', label: 'Utility' },
];

export const PluginBrowserModal: React.FC<PluginBrowserModalProps> = ({
  isOpen,
  onClose,
  targetChannelId,
  channelName,
  onAddPlugin,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | 'all'>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('beatflow_fav_plugins') || '["parametric_eq", "compressor", "reverb", "delay"]');
    } catch {
      return ['parametric_eq', 'compressor', 'reverb', 'delay'];
    }
  });

  if (!isOpen) return null;

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(updated);
    try {
      localStorage.setItem('beatflow_fav_plugins', JSON.stringify(updated));
    } catch {}
  };

  const filteredPlugins = BUILT_IN_PLUGINS.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Activity': return <Activity className="w-5 h-5 text-cyan-400" />;
      case 'Sliders': return <Sliders className="w-5 h-5 text-amber-400" />;
      case 'Minimize2': return <Minimize2 className="w-5 h-5 text-emerald-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'Radio': return <Radio className="w-5 h-5 text-amber-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'Flame': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-teal-400" />;
      case 'MoveHorizontal': return <MoveHorizontal className="w-5 h-5 text-violet-400" />;
      case 'Compass': return <Compass className="w-5 h-5 text-cyan-400" />;
      case 'Filter': return <Filter className="w-5 h-5 text-indigo-400" />;
      case 'Music': return <Music className="w-5 h-5 text-pink-400" />;
      default: return <Activity className="w-5 h-5 text-orange-400" />;
    }
  };

  const handleSelectPlugin = (pluginId: EffectType) => {
    onAddPlugin(targetChannelId, pluginId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#161722] border border-[#2d3042] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1a1b28] border-b border-[#292c3c] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest">
                Plugin Browser
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs text-zinc-400">
                Insert into <strong className="text-white">{channelName}</strong> (Ch {targetChannelId})
              </span>
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight mt-0.5">
              Select Audio Effect Plugin
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#252837] hover:bg-[#34374b] text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="px-5 py-3 bg-[#13141c] border-b border-[#242635] flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plugins & effects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-[#1e202c] border border-[#2b2d3d] text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-orange-500/60"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto w-full pb-1 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-black shadow-sm font-bold'
                    : 'bg-[#1e202c] text-zinc-400 hover:text-white hover:bg-[#272938]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plugin Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#111217]">
          {filteredPlugins.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-zinc-500 text-xs">
              No audio plugins match "{search}" in this category.
            </div>
          ) : (
            filteredPlugins.map((plugin) => {
              const isFav = favorites.includes(plugin.id);

              return (
                <div
                  key={plugin.id}
                  onClick={() => handleSelectPlugin(plugin.id)}
                  className="bg-[#171822] hover:bg-[#1d1f2d] border border-[#252837] hover:border-orange-500/50 rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#222432] group-hover:bg-[#2c2f42] flex items-center justify-center shrink-0 border border-[#2f3244] transition-colors">
                        {getIcon(plugin.iconName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-zinc-100 group-hover:text-orange-400 transition-colors">
                            {plugin.name}
                          </h3>
                          {plugin.isMasteringGrade && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              Mastering
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                          {plugin.category} · {plugin.params.length} params
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => toggleFavorite(e, plugin.id)}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      className="text-zinc-600 hover:text-amber-400 transition-colors p-1"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isFav ? 'text-amber-400 fill-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                    {plugin.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#20222f]">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {plugin.factoryPresets.length} factory presets
                    </span>
                    <button
                      onClick={() => handleSelectPlugin(plugin.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-orange-400 group-hover:text-orange-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add to Rack</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#14151c] border-t border-[#242635] flex items-center justify-between text-xs text-zinc-500">
          <span>Real-time Web Audio API Native DSP (Zero Latency)</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#222432] hover:bg-[#2b2e3f] text-zinc-300 rounded text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
