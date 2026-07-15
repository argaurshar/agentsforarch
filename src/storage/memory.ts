import type { Project, ProjectSummary } from '../types';
import type { StorageAdapter } from './types';

// In-memory implementation. State lives only for the session — there is no
// localStorage/sessionStorage anywhere by design (spec §0, §6). A durable
// adapter would implement the same interface.
export class MemoryStorageAdapter implements StorageAdapter {
  private projects = new Map<string, Project>();

  async saveProject(p: Project): Promise<void> {
    // Store a structural clone so callers can't mutate our copy by reference.
    this.projects.set(p.id, structuredClone(p));
  }

  async loadProject(id: string): Promise<Project | null> {
    const found = this.projects.get(id);
    return found ? structuredClone(found) : null;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    return [...this.projects.values()]
      .map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        assetCount: p.assets.length,
        slideCount: p.slides.length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
  }
}
