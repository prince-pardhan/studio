/**
 * BeatFlow Studio - Project Management Dashboard Modal
 * Searchable library, filter tabs, sorting, project metadata cards, duplicate,
 * rename, delete confirmation, export .beatflow, import, and recovery.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  Star,
  Copy,
  Trash2,
  Download,
  Upload,
  Clock,
  Music,
  Sliders,
  SlidersHorizontal,
  Edit3,
  ExternalLink,
  History,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Project, ProjectMetadata, ProjectType } from '../types/project';
import { ProjectStorage } from '../storage/ProjectStorage';
import { EditProjectModal } from './EditProjectModal';
import { DeleteProjectConfirmModal } from './DeleteProjectConfirmModal';

interface ProjectDashboardModalProps {
  isOpen: boolean;
  currentProjectId: string;
  onClose: () => void;
  onOpenProject: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onRecoverSnapshot: () => void;
}

type FilterCategory = 'all' | 'favorites' | 'beat' | 'song' | 'mastering' | 'podcast';
type SortField = 'updated' | 'name' | 'bpm' | 'created';

export const ProjectDashboardModal: React.FC<ProjectDashboardModalProps> = ({
  isOpen,
  currentProjectId,
  onClose,
  onOpenProject,
  onOpenNewProjectModal,
  onRecoverSnapshot,
}) => {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-modals
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingProjectMeta, setDeletingProjectMeta] = useState<ProjectMetadata[] | null>(null);
  const [targetDeleteMeta, setTargetDeleteMeta] = useState<ProjectMetadata | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjectList = async () => {
    setIsLoading(true);
    try {
      const list = await ProjectStorage.listProjects();
      setProjects(list);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjectList();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isFav = await ProjectStorage.toggleFavorite(id);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: isFav } : p))
    );
  };

  const handleOpen = async (id: string) => {
    try {
      const full = await ProjectStorage.loadProject(id);
      if (full) {
        onOpenProject(full);
        onClose();
      } else {
        showToast('Error: Project could not be loaded from storage.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to open project');
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const copy = await ProjectStorage.duplicateProject(id);
      showToast(`Duplicated: ${copy.name}`);
      fetchProjectList();
    } catch (err: any) {
      showToast('Error duplicating project: ' + err?.message);
    }
  };

  const handleExportPackage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const proj = await ProjectStorage.loadProject(id);
      if (proj) {
        ProjectStorage.exportProjectPackage(proj);
        showToast(`Exported ${proj.name}.beatflow`);
      }
    } catch {
      showToast('Failed to export project package');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await ProjectStorage.importProjectPackage(file);
      await ProjectStorage.saveProject(imported);
      showToast(`Imported ${imported.name} successfully!`);
      await fetchProjectList();
      onOpenProject(imported);
      onClose();
    } catch (err: any) {
      showToast('Import error: ' + (err?.message || 'Invalid format'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const full = await ProjectStorage.loadProject(id);
    if (full) {
      setEditingProject(full);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEdit = async (id: string, updates: Partial<Project>) => {
    await ProjectStorage.updateProjectMetadata(id, updates);
    showToast('Project updated successfully');
    fetchProjectList();
  };

  const handleConfirmDelete = async (id: string) => {
    await ProjectStorage.deleteProject(id);
    showToast('Project deleted');
    fetchProjectList();
  };

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Category Filter
        if (activeFilter === 'favorites' && !p.isFavorite) return false;
        if (activeFilter !== 'all' && activeFilter !== 'favorites' && p.projectType !== activeFilter) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesGenre = p.genre?.toLowerCase().includes(q);
          const matchesTags = p.tags?.some((t) => t.toLowerCase().includes(q));
          return matchesName || matchesGenre || matchesTags;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'name') return a.name.localeCompare(b.name);
        if (sortField === 'bpm') return b.bpm - a.bpm;
        if (sortField === 'created') return b.createdAt - a.createdAt;
        return b.updatedAt - a.updatedAt;
      });
  }, [projects, activeFilter, searchQuery, sortField]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[88vh] bg-[#14151c] border border-[#272938] rounded-xl shadow-2xl flex flex-col overflow-hidden select-none">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[#222432] bg-[#111217]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project Library & Dashboard</h2>
              <p className="text-[11px] text-zinc-400">
                Manage, open, duplicate, backup, and restore persistent BeatFlow Studio sessions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenNewProjectModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-black text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d1f2b] hover:bg-[#282a3a] text-zinc-300 hover:text-white border border-[#2b2d3d] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import .beatflow</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".beatflow,.json"
              className="hidden"
            />

            <button
              onClick={() => {
                onRecoverSnapshot();
                onClose();
              }}
              title="Recover last autosaved snapshot"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d1f2b] hover:bg-[#282a3a] text-zinc-300 hover:text-white border border-[#2b2d3d] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Autosave Recovery</span>
            </button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xs px-2.5 py-1.5 rounded hover:bg-[#20222e]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[#1f212d] bg-[#121319]">
          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, tag, genre..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0e0f14] border border-[#252837] focus:border-orange-500/60 rounded-lg text-xs text-white placeholder-zinc-500 outline-none transition-colors"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'favorites', label: '★ Favorites' },
              { id: 'beat', label: 'Beats' },
              { id: 'song', label: 'Songs' },
              { id: 'mastering', label: 'Mastering' },
              { id: 'podcast', label: 'Podcasts' },
            ].map((f) => {
              const isCur = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as FilterCategory)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    isCur
                      ? 'bg-[#292c3d] text-orange-400 border border-orange-500/40 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-[#1a1b24]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-2 py-1 bg-[#1a1b25] border border-[#2b2d3d] rounded text-xs text-zinc-200 outline-none"
            >
              <option value="updated">Recently Modified</option>
              <option value="created">Created Date</option>
              <option value="name">Project Name (A-Z)</option>
              <option value="bpm">Tempo (BPM)</option>
            </select>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProjects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
              <FolderOpen className="w-12 h-12 text-zinc-600 stroke-1" />
              <div>
                <h4 className="text-sm font-bold text-zinc-300">No Projects Found</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  {searchQuery
                    ? `No projects matched "${searchQuery}". Try adjusting your filters.`
                    : 'Get started by creating your first music production session!'}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewProjectModal();
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Create New Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p) => {
                const isCurrent = p.id === currentProjectId;
                const formattedDate = new Date(p.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={p.id}
                    onClick={() => handleOpen(p.id)}
                    className={`group relative p-4 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-[#1a1c27] border-orange-500/50 shadow-lg ring-1 ring-orange-500/40'
                        : 'bg-[#111218] border-[#222534] hover:bg-[#171822] hover:border-[#35394d]'
                    }`}
                  >
                    {/* Top Row: Type pill + Cover color accent + Favorite */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: p.coverColor || '#f97316' }}
                          />
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#1e202e] text-zinc-300 border border-[#2b2d3d]">
                            {p.projectType}
                          </span>
                          {p.genre && (
                            <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                              {p.genre}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleToggleFavorite(e, p.id)}
                          className={`p-1 rounded hover:bg-[#252837] transition-colors ${
                            p.isFavorite ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      {/* Project Title & Description */}
                      <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                        {p.name}
                      </h3>
                      {p.description ? (
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                          {p.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500 mt-1 italic">
                          No notes provided
                        </p>
                      )}
                    </div>

                    {/* Metadata Specs & Stats */}
                    <div className="mt-4 pt-3 border-t border-[#1d1f2b] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span>{p.bpm} BPM · {p.timeSignature[0]}/{p.timeSignature[1]}</span>
                        <span>{p.trackCount} Tracks · {p.durationSeconds}s</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </div>
                        {isCurrent && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active Now
                          </span>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpen(p.id);
                          }}
                          className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-black text-xs font-bold rounded transition-colors"
                        >
                          {isCurrent ? 'Continue' : 'Open Studio'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleStartEdit(e, p.id)}
                            title="Edit details"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252837] rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(e, p.id)}
                            title="Duplicate project"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252837] rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleExportPackage(e, p.id)}
                            title="Download .beatflow backup"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252837] rounded"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetDeleteMeta(p);
                            }}
                            title="Delete project"
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-[#252837] rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info & Toast notification */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#222432] bg-[#111217] text-xs">
          <span className="text-zinc-500 text-[11px]">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} saved locally in IndexedDB
          </span>

          {toastMessage && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#1e202e] border border-orange-500/40 text-orange-300 text-xs shadow-md animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5 text-orange-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1d1f2b] hover:bg-[#252837] text-zinc-300 text-xs font-semibold rounded-lg"
          >
            Close
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        project={editingProject}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveEdit}
      />

      <DeleteProjectConfirmModal
        isOpen={!!targetDeleteMeta}
        project={targetDeleteMeta}
        onClose={() => setTargetDeleteMeta(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
