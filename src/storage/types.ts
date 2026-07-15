import type { Project, ProjectSummary } from '../types';

// The storage seam (spec §6). Do NOT use localStorage/sessionStorage anywhere.
// A local-disk or cloud implementation can drop in later without touching
// components — the store is the only caller.
export interface StorageAdapter {
  saveProject(p: Project): Promise<void>;
  loadProject(id: string): Promise<Project | null>;
  listProjects(): Promise<ProjectSummary[]>;
  deleteProject(id: string): Promise<void>;
}
