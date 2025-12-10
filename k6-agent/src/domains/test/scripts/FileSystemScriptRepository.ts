import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import logger from '@shared/logger';
import {Script} from '@domains/test/models/types';
import {ScriptRepository} from './ScriptRepository';

export class FileSystemScriptRepository implements ScriptRepository {
  private readonly scriptsDir: string;

  constructor(scriptsDir: string) {
    this.scriptsDir = scriptsDir;
  }

  private getFolderScriptPath(folderId: string, scriptId: string): string {
    return path.join(this.scriptsDir, folderId, `${scriptId}.json`);
  }

  private ensureFolderDir(folderId: string): void {
    const folderDir = path.join(this.scriptsDir, folderId);
    if (!fsSync.existsSync(folderDir)) {
      fsSync.mkdirSync(folderDir, {recursive: true});
    }
  }

  async save(script: Script): Promise<void> {
    if (!script.folderId) {
      throw new Error('Script must have a folderId');
    }

    this.ensureFolderDir(script.folderId);
    const scriptFile = this.getFolderScriptPath(script.folderId, script.scriptId);
    await fs.writeFile(scriptFile, JSON.stringify(script, null, 2));
    logger.info(`Saved script: ${script.scriptId} in folder: ${script.folderId}`);
  }

  findById(scriptId: string): Script | null {
    try {
      const folders = fsSync.readdirSync(this.scriptsDir);
      for (const folder of folders) {
        const folderPath = path.join(this.scriptsDir, folder);
        if (fsSync.statSync(folderPath).isDirectory()) {
          const scriptFile = path.join(folderPath, `${scriptId}.json`);
          if (fsSync.existsSync(scriptFile)) {
            const content = fsSync.readFileSync(scriptFile, 'utf8');
            return JSON.parse(content) as Script;
          }
        }
      }
      return null;
    } catch (err) {
      logger.error(`Failed to read script: ${(err as Error).message}`);
      return null;
    }
  }

  findAll(options?: {
    tags?: string[];
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Script[] {
    const scripts: Script[] = [];
    try {
      if (!fsSync.existsSync(this.scriptsDir)) {
        return scripts;
      }

      const folders = fsSync.readdirSync(this.scriptsDir);
      for (const folder of folders) {
        const folderPath = path.join(this.scriptsDir, folder);
        if (fsSync.statSync(folderPath).isDirectory()) {
          const files = fsSync.readdirSync(folderPath);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const scriptFile = path.join(folderPath, file);
              const content = fsSync.readFileSync(scriptFile, 'utf8');
              const script = JSON.parse(content) as Script;

              if (options?.tags && options.tags.length > 0) {
                if (!script.tags || !script.tags.some(tag => options.tags!.includes(tag))) {
                  continue;
                }
              }

              scripts.push(script);
            }
          }
        }
      }

      const sortBy = options?.sortBy || 'updatedAt';
      const sortOrder = options?.sortOrder || 'desc';

      scripts.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else {
          comparison = a[sortBy] - b[sortBy];
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

    } catch (err) {
      logger.error(`Failed to read scripts: ${(err as Error).message}`);
    }
    return scripts;
  }

  findByFolderId(folderId: string): Script[] {
    const scripts: Script[] = [];
    try {
      const folderPath = path.join(this.scriptsDir, folderId);
      if (!fsSync.existsSync(folderPath)) {
        return scripts;
      }

      const files = fsSync.readdirSync(folderPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const scriptFile = path.join(folderPath, file);
          const content = fsSync.readFileSync(scriptFile, 'utf8');
          const script = JSON.parse(content) as Script;
          scripts.push(script);
        }
      }

      scripts.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      logger.error(`Failed to read scripts for folder ${folderId}: ${(err as Error).message}`);
    }
    return scripts;
  }

  deleteById(scriptId: string): boolean {
    try {
      const folders = fsSync.readdirSync(this.scriptsDir);
      for (const folder of folders) {
        const folderPath = path.join(this.scriptsDir, folder);
        if (fsSync.statSync(folderPath).isDirectory()) {
          const scriptFile = path.join(folderPath, `${scriptId}.json`);
          if (fsSync.existsSync(scriptFile)) {
            fsSync.unlinkSync(scriptFile);
            logger.info(`Deleted script: ${scriptId} from folder: ${folder}`);
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      logger.error(`Failed to delete script: ${(err as Error).message}`);
      return false;
    }
  }

  deleteByFolderId(folderId: string): number {
    let deletedCount = 0;
    try {
      const folderPath = path.join(this.scriptsDir, folderId);
      if (fsSync.existsSync(folderPath)) {
        const files = fsSync.readdirSync(folderPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fsSync.unlinkSync(path.join(folderPath, file));
            deletedCount++;
          }
        }
        fsSync.rmdirSync(folderPath);
        logger.info(`Deleted ${deletedCount} scripts from folder: ${folderId}`);
      }
    } catch (err) {
      logger.error(`Failed to delete scripts from folder ${folderId}: ${(err as Error).message}`);
    }
    return deletedCount;
  }

  exists(scriptId: string): boolean {
    try {
      const folders = fsSync.readdirSync(this.scriptsDir);
      for (const folder of folders) {
        const folderPath = path.join(this.scriptsDir, folder);
        if (fsSync.statSync(folderPath).isDirectory()) {
          const scriptFile = path.join(folderPath, `${scriptId}.json`);
          if (fsSync.existsSync(scriptFile)) {
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      return false;
    }
  }
}
