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

  async save(script: Script): Promise<void> {
    const scriptFile = path.join(this.scriptsDir, `${script.scriptId}.json`);
    await fs.writeFile(scriptFile, JSON.stringify(script, null, 2));
    logger.info(`Saved script: ${script.scriptId}`);
  }

  findById(scriptId: string): Script | null {
    const scriptFile = path.join(this.scriptsDir, `${scriptId}.json`);
    try {
      const content = fsSync.readFileSync(scriptFile, 'utf8');
      return JSON.parse(content) as Script;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
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
      const files = fsSync.readdirSync(this.scriptsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const scriptFile = path.join(this.scriptsDir, file);
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

  deleteById(scriptId: string): boolean {
    const scriptFile = path.join(this.scriptsDir, `${scriptId}.json`);
    try {
      fsSync.unlinkSync(scriptFile);
      logger.info(`Deleted script: ${scriptId}`);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      logger.error(`Failed to delete script: ${(err as Error).message}`);
      return false;
    }
  }

  exists(scriptId: string): boolean {
    const scriptFile = path.join(this.scriptsDir, `${scriptId}.json`);
    return fsSync.existsSync(scriptFile);
  }
}
