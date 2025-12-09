import {Script, ScriptMetadata, TestResult} from '@domains/test/models/types';
import {ScriptRepository} from './ScriptRepository';
import {FileSystemScriptRepository} from './FileSystemScriptRepository';
import {FileSystemTestResultRepository, TestResultRepository} from '@domains/test/results';
import {BadRequestError, NotFoundError} from '@shared/errors';
import {MAX_HISTORY_PER_SCRIPT, SCRIPTS_REPO_DIR} from '@shared/configs';
import logger from '@shared/logger';

export class ScriptService {
  private readonly scriptRepository: ScriptRepository;
  private readonly resultRepository: TestResultRepository;

  constructor(
    scriptRepository?: ScriptRepository,
    resultRepository?: TestResultRepository
  ) {
    this.scriptRepository = scriptRepository ?? new FileSystemScriptRepository(SCRIPTS_REPO_DIR);
    this.resultRepository = resultRepository ?? new FileSystemTestResultRepository();
  }

  async saveScript(scriptId: string | undefined, metadata: ScriptMetadata): Promise<Script> {
    if (!metadata.script || metadata.script.trim().length === 0) {
      throw new BadRequestError('Script content is required');
    }
    if (!metadata.name || metadata.name.trim().length === 0) {
      throw new BadRequestError('Script name is required');
    }

    const now = Date.now();

    if (scriptId) {
      const existing = this.scriptRepository.findById(scriptId);
      if (existing) {
        const updated: Script = {
          ...existing,
          ...metadata,
          scriptId,
          updatedAt: now,
        };
        await this.scriptRepository.save(updated);
        logger.info(`Updated script: ${scriptId}`);
        return updated;
      }
    }

    const newScriptId = scriptId || this.generateScriptId(metadata.name);

    if (this.scriptRepository.exists(newScriptId)) {
      throw new BadRequestError(`Script with ID '${newScriptId}' already exists`);
    }

    const newScript: Script = {
      scriptId: newScriptId,
      name: metadata.name,
      script: metadata.script,
      config: metadata.config,
      description: metadata.description,
      tags: metadata.tags,
      createdAt: now,
      updatedAt: now,
    };

    await this.scriptRepository.save(newScript);
    logger.info(`Created script: ${newScriptId}`);
    return newScript;
  }

  getScript(scriptId: string): Script {
    const script = this.scriptRepository.findById(scriptId);
    if (!script) {
      throw new NotFoundError(`Script not found: ${scriptId}`);
    }
    return script;
  }

  getAllScripts(options?: {
    tags?: string[];
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Script[] {
    return this.scriptRepository.findAll(options);
  }

  deleteScript(scriptId: string): void {
    const success = this.scriptRepository.deleteById(scriptId);
    if (!success) {
      throw new NotFoundError(`Script not found: ${scriptId}`);
    }
    logger.info(`Deleted script: ${scriptId}`);
  }

  getScriptHistory(scriptId: string, limit: number = MAX_HISTORY_PER_SCRIPT): TestResult[] {
    const script = this.scriptRepository.findById(scriptId);
    if (!script) {
      throw new NotFoundError(`Script not found: ${scriptId}`);
    }

    const results = this.resultRepository.findByScriptId(scriptId);
    return results.slice(0, limit);
  }

  private generateScriptId(name: string): string {
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${sanitized}-${timestamp}-${random}`;
  }
}

export const scriptService = new ScriptService();
