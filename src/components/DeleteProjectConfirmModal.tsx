/**
 * BeatFlow Studio - Delete Project Confirmation Dialog
 * Requires explicit confirmation before permanently removing project data from IndexedDB.
 */
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { ProjectMetadata } from '../types/project';

interface DeleteProjectConfirmModalProps {
  isOpen: boolean;
  project: ProjectMetadata | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
}

export const DeleteProjectConfirmModal: React.FC<DeleteProjectConfirmModalProps> = ({
  isOpen,
  project,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#16171f] border border-red-500/40 rounded-xl shadow-2xl p-6 select-none flex flex-col space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Delete Project Permanently?</h3>
            <p className="text-[11px] text-zinc-400">This action cannot be undone</p>
          </div>
        </div>

        <div className="p-3 bg-[#101116] border border-[#262837] rounded-lg space-y-1.5">
          <p className="text-xs text-zinc-300">
            You are about to delete <strong className="text-red-400">{project.name}</strong>.
          </p>
          <p className="text-[11px] text-zinc-400">
            All stored tracks, audio clips, pattern data, and recovery snapshots for this specific project will be removed from your browser storage. Other projects and shared samples remain untouched.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#20222e] hover:bg-[#2b2e3e] text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete(project.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
