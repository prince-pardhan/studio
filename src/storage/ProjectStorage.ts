/**
 * BeatFlow Studio - Project Management & Persistent Storage Service
 * Multi-project IndexedDB persistence, rolling recovery snapshots, project package (.beatflow)
 * serialization, validation, duplicate, rename, and metadata indexing.
 */
import {
  Project,
  ProjectMetadata,
  NewProjectOptions,
  ProjectType,
  Genre,
  Pattern,
  ChannelRackChannel,
  ArrangementClip,
} from '../types/project';
import { createDefaultProject } from '../state/defaultProject';
import { AlgorithmicMusicGen } from '../ai/AlgorithmicMusicGen';

const DB_NAME = 'BeatFlowStudioDB';
const DB_VERSION = 2;
const PROJECTS_STORE = 'projects';
const SNAPSHOTS_STORE = 'snapshots';
const ACTIVE_PROJECT_KEY = 'beatflow_active_project_id';
const RECOVERY_FLAG_KEY = 'beatflow_recovery_flag';

interface SnapshotRecord {
  id: string;
  projectId: string;
  timestamp: number;
  name: string;
  project: Project;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const snapStore = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
        snapStore.createIndex('projectId', 'projectId', { unique: false });
        snapStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class ProjectStorage {
  /**
   * Save project to IndexedDB and update active project tracker
   */
  static async saveProject(project: Project, isAutosave = false): Promise<void> {
    const updatedProject: Project = {
      ...project,
      version: 2,
      updatedAt: Date.now(),
    };

    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, 'readwrite');
        const store = tx.objectStore(PROJECTS_STORE);
        const req = store.put(updatedProject);
        req.onsuccess = () => {
          localStorage.setItem(ACTIVE_PROJECT_KEY, updatedProject.id);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });

      // If autosave, record a recovery snapshot periodically (every 5 mins or meaningful edits)
      if (isAutosave) {
        await this.saveSnapshot(updatedProject);
      }
    } catch {
      // Fallback for sandboxed iframes
      localStorage.setItem(`beatflow_proj_${updatedProject.id}`, JSON.stringify(updatedProject));
      localStorage.setItem(ACTIVE_PROJECT_KEY, updatedProject.id);
    }
  }

  /**
   * Load project by unique ID
   */
  static async loadProject(id: string): Promise<Project | null> {
    try {
      const db = await openDB();
      return await new Promise<Project | null>((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, 'readonly');
        const store = tx.objectStore(PROJECTS_STORE);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as Project) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const stored = localStorage.getItem(`beatflow_proj_${id}`);
      return stored ? (JSON.parse(stored) as Project) : null;
    }
  }

  /**
   * List all stored projects with metadata summary for the Project Dashboard
   */
  static async listProjects(): Promise<ProjectMetadata[]> {
    try {
      const db = await openDB();
      const rawProjects = await new Promise<Project[]>((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, 'readonly');
        const store = tx.objectStore(PROJECTS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as Project[]) || []);
        req.onerror = () => reject(req.error);
      });

      return rawProjects.map((p) => this.extractMetadata(p)).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      // Fallback to localStorage keys
      const list: ProjectMetadata[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('beatflow_proj_')) {
          try {
            const p = JSON.parse(localStorage.getItem(k) || '');
            if (p && p.id) {
              list.push(this.extractMetadata(p));
            }
          } catch {}
        }
      }
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  }

  /**
   * Helper to derive metadata from project
   */
  static extractMetadata(p: Project): ProjectMetadata {
    // Calculate song duration in seconds based on highest clip step
    let maxStep = 64;
    if (p.clips && p.clips.length > 0) {
      p.clips.forEach((c) => {
        const end = c.startStep + c.durationSteps;
        if (end > maxStep) maxStep = end;
      });
    }
    const secondsPerStep = (60 / Math.max(40, p.bpm || 120)) / 4;
    const durationSeconds = Math.round(maxStep * secondsPerStep);

    return {
      id: p.id,
      name: p.name || 'Untitled Project',
      description: p.description || '',
      projectType: p.projectType || 'beat',
      genre: p.genre || 'synthwave',
      bpm: p.bpm || 120,
      timeSignature: p.timeSignature || [4, 4],
      trackCount: p.tracks ? p.tracks.length : 8,
      patternCount: p.patterns ? p.patterns.length : 1,
      durationSeconds,
      coverColor: p.coverColor || '#f97316',
      tags: p.tags || [],
      isFavorite: !!p.isFavorite,
      sampleRate: p.sampleRate || 44100,
      createdAt: p.createdAt || Date.now(),
      updatedAt: p.updatedAt || Date.now(),
      version: p.version || 2,
    };
  }

  /**
   * Delete a project permanently from IndexedDB
   */
  static async deleteProject(id: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([PROJECTS_STORE, SNAPSHOTS_STORE], 'readwrite');
        const projStore = tx.objectStore(PROJECTS_STORE);
        projStore.delete(id);

        // Delete snapshots for this project
        const snapStore = tx.objectStore(SNAPSHOTS_STORE);
        const index = snapStore.index('projectId');
        const req = index.getAllKeys(id);
        req.onsuccess = () => {
          const keys = req.result;
          keys.forEach((k) => snapStore.delete(k));
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.removeItem(`beatflow_proj_${id}`);
    }

    if (this.getActiveProjectId() === id) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }

  /**
   * Duplicate a project with new unique IDs for project and entities
   */
  static async duplicateProject(id: string, newName?: string): Promise<Project> {
    const original = await this.loadProject(id);
    if (!original) {
      throw new Error(`Project ${id} not found.`);
    }

    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const copyName = newName || `${original.name} (Copy)`;

    // Clone deep
    const cloned: Project = JSON.parse(JSON.stringify(original));
    cloned.id = newId;
    cloned.name = copyName;
    cloned.createdAt = Date.now();
    cloned.updatedAt = Date.now();
    cloned.isFavorite = false;

    // Save cloned project
    await this.saveProject(cloned);
    return cloned;
  }

  /**
   * Rename a project
   */
  static async renameProject(id: string, newName: string): Promise<void> {
    const proj = await this.loadProject(id);
    if (!proj) return;
    proj.name = newName.trim();
    proj.updatedAt = Date.now();
    await this.saveProject(proj);
  }

  /**
   * Update project metadata fields (description, tags, coverColor, bpm, etc.)
   */
  static async updateProjectMetadata(id: string, updates: Partial<Project>): Promise<Project> {
    const proj = await this.loadProject(id);
    if (!proj) throw new Error('Project not found');

    const updated: Project = {
      ...proj,
      ...updates,
      updatedAt: Date.now(),
    };
    await this.saveProject(updated);
    return updated;
  }

  /**
   * Toggle favorite flag
   */
  static async toggleFavorite(id: string): Promise<boolean> {
    const proj = await this.loadProject(id);
    if (!proj) return false;
    proj.isFavorite = !proj.isFavorite;
    await this.saveProject(proj);
    return proj.isFavorite;
  }

  /**
   * Save a recovery snapshot (maintains up to 5 rolling snapshots per project)
   */
  static async saveSnapshot(project: Project): Promise<void> {
    try {
      const db = await openDB();
      const snapId = `snap_${project.id}_${Date.now()}`;
      const record: SnapshotRecord = {
        id: snapId,
        projectId: project.id,
        timestamp: Date.now(),
        name: project.name,
        project: JSON.parse(JSON.stringify(project)),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SNAPSHOTS_STORE, 'readwrite');
        const store = tx.objectStore(SNAPSHOTS_STORE);
        store.put(record);

        // Prune older snapshots if exceeding 5
        const index = store.index('projectId');
        const req = index.getAll(project.id);
        req.onsuccess = () => {
          const snaps: SnapshotRecord[] = req.result || [];
          if (snaps.length > 5) {
            snaps.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = snaps.slice(0, snaps.length - 5);
            toDelete.forEach((s) => store.delete(s.id));
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore snapshot errors in storage-limited environments
    }
  }

  /**
   * Recover the latest valid autosaved snapshot
   */
  static async recoverLatestSnapshot(projectId?: string): Promise<Project | null> {
    try {
      const db = await openDB();
      return await new Promise<Project | null>((resolve) => {
        const tx = db.transaction(SNAPSHOTS_STORE, 'readonly');
        const store = tx.objectStore(SNAPSHOTS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          let snaps: SnapshotRecord[] = req.result || [];
          if (projectId) {
            snaps = snaps.filter((s) => s.projectId === projectId);
          }
          if (snaps.length === 0) {
            resolve(null);
            return;
          }
          snaps.sort((a, b) => b.timestamp - a.timestamp);
          resolve(snaps[0].project);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Export standalone project file (.beatflow package format)
   */
  static exportProjectPackage(project: Project): void {
    const packageData = {
      app: 'BeatFlow Studio',
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      metadata: this.extractMetadata(project),
      project,
    };

    const jsonStr = JSON.stringify(packageData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.download = `${cleanName || 'project'}.beatflow`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import project from .beatflow package file with structural validation
   */
  static importProjectPackage(file: File): Promise<Project> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string);
          // Check if wrapped in package or raw Project
          const proj: Project = raw.project || raw;

          if (!proj.id || !proj.name) {
            throw new Error('Invalid project file: missing project ID or Name.');
          }

          // Defensive defaults to prevent crashes
          if (!Array.isArray(proj.tracks)) proj.tracks = [];
          if (!Array.isArray(proj.patterns)) proj.patterns = [];
          if (!Array.isArray(proj.channels)) proj.channels = [];
          if (!Array.isArray(proj.clips)) proj.clips = [];
          if (!Array.isArray(proj.mixerChannels)) {
            const def = createDefaultProject();
            proj.mixerChannels = def.mixerChannels;
          }
          if (!proj.bpm) proj.bpm = 120;
          if (!proj.timeSignature) proj.timeSignature = [4, 4];
          if (!proj.activePatternId && proj.patterns.length > 0) {
            proj.activePatternId = proj.patterns[0].id;
          }

          // Assign new unique ID to avoid overwriting existing
          proj.id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          proj.name = `${proj.name} (Imported)`;
          proj.updatedAt = Date.now();

          resolve(proj);
        } catch (err: any) {
          reject(new Error(err?.message || 'Failed to parse project file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk'));
      reader.readAsText(file);
    });
  }

  /**
   * Factory to create customized project from NewProjectOptions
   */
  static createNewProject(options: NewProjectOptions): Project {
    const base = createDefaultProject();
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bpm = options.bpm || (options.genre && this.getGenreDefaultBpm(options.genre)) || 120;

    const newProject: Project = {
      ...base,
      id,
      name: options.name.trim() || 'Untitled Session',
      description: options.description || '',
      projectType: options.projectType,
      genre: options.genre !== 'blank' ? options.genre : undefined,
      bpm,
      timeSignature: options.timeSignature || [4, 4],
      sampleRate: options.sampleRate || 44100,
      outputConfig: options.outputConfig || 'Stereo Master (Ch 1/2)',
      coverColor: options.coverColor || this.getProjectTypeColor(options.projectType),
      tags: options.tags || [options.projectType],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // If genre selected, apply its rhythm groove
    if (options.genre && options.genre !== 'blank') {
      const drumPattern = AlgorithmicMusicGen.generateDrumPattern(options.genre);
      if (newProject.patterns.length > 0) {
        newProject.patterns[0].drumSteps = drumPattern;
        newProject.patterns[0].name = `${options.genre.toUpperCase()} Beat`;
      }
    }

    // Configure tracks based on project type
    if (options.projectType === 'empty') {
      newProject.clips = [];
      newProject.patterns[0].drumSteps = {};
      newProject.patterns[0].notes = {};
    } else if (options.projectType === 'mastering') {
      newProject.name = options.name || 'Mastering Session';
      if (newProject.masteringSession) {
        newProject.masteringSession.bypassAll = false;
      }
    } else if (options.projectType === 'podcast') {
      newProject.bpm = 100;
      newProject.tracks = [
        { id: 't_host', name: 'Host Mic', color: '#3b82f6', volume: 0.9, pan: 0, mute: false, solo: false, height: 48 },
        { id: 't_guest', name: 'Guest Mic', color: '#10b981', volume: 0.9, pan: 0, mute: false, solo: false, height: 48 },
        { id: 't_music', name: 'Intro / Outro Music', color: '#f59e0b', volume: 0.7, pan: 0, mute: false, solo: false, height: 48 },
        { id: 't_sfx', name: 'Sound FX / Stagers', color: '#ec4899', volume: 0.75, pan: 0, mute: false, solo: false, height: 48 },
      ];
      newProject.clips = [];
    }

    return newProject;
  }

  static getGenreDefaultBpm(genre: Genre | 'blank'): number {
    switch (genre) {
      case 'dnb': return 174;
      case 'trap': return 140;
      case 'drill': return 142;
      case 'techno': return 132;
      case 'edm': return 128;
      case 'house': return 124;
      case 'rock': return 120;
      case 'pop': return 118;
      case 'bollywood': return 98;
      case 'punjabi': return 96;
      case 'ambient': return 70;
      case 'cinematic': return 80;
      case 'classical_indian': return 80;
      case 'lofi': return 85;
      case 'hiphop': return 90;
      default: return 120;
    }
  }

  static getProjectTypeColor(type: ProjectType): string {
    switch (type) {
      case 'beat': return '#f97316';
      case 'song': return '#8b5cf6';
      case 'mastering': return '#a855f7';
      case 'podcast': return '#10b981';
      case 'remix': return '#06b6d4';
      case 'live': return '#ef4444';
      case 'empty':
      default: return '#71717a';
    }
  }

  static getActiveProjectId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  }

  static setActiveProjectId(id: string): void {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }
}
