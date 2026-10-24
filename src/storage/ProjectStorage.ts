/**
 * BeatFlow Studio - Project Storage using IndexedDB & Local Storage Fallback
 */
import { Project } from '../types/project';

const DB_NAME = 'BeatFlowStudioDB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const ACTIVE_PROJECT_KEY = 'beatflow_active_project_id';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class ProjectStorage {
  static async saveProject(project: Project): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, 'readwrite');
        const store = tx.objectStore(PROJECTS_STORE);
        const req = store.put({
          ...project,
          updatedAt: Date.now(),
        });
        req.onsuccess = () => {
          localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage if IndexedDB is blocked in iframe
      localStorage.setItem(`beatflow_proj_${project.id}`, JSON.stringify(project));
      localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    }
  }

  static async loadProject(id: string): Promise<Project | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, 'readonly');
        const store = tx.objectStore(PROJECTS_STORE);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const stored = localStorage.getItem(`beatflow_proj_${id}`);
      return stored ? JSON.parse(stored) : null;
    }
  }

  static async listProjects(): Promise<{ id: string; name: string; updatedAt: number }[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, 'readonly');
        const store = tx.objectStore(PROJECTS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const projects: Project[] = req.result || [];
          resolve(
            projects
              .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
              .sort((a, b) => b.updatedAt - a.updatedAt)
          );
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  static async deleteProject(id: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, 'readwrite');
        const store = tx.objectStore(PROJECTS_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      localStorage.removeItem(`beatflow_proj_${id}`);
    }
  }

  static getActiveProjectId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  }

  static exportProjectAsJSON(project: Project): void {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_project.beatflow`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static importProjectFromJSON(file: File): Promise<Project> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!parsed.id || !parsed.tracks || !parsed.patterns) {
            throw new Error('Invalid project file format');
          }
          resolve(parsed as Project);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
