import {Script, ScriptMetadata, TestResult} from '@domains/test/test-types';
import {ScriptRepository} from './script-repository';
import {ScriptFilesystemRepository} from './script-filesystem-repository';
import {TestResultFilesystemRepository, TestResultRepository} from '@domains/results';
import {BadRequestError, NotFoundError} from '@shared/http/errors';
import {MAX_SCRIPTS_PER_FOLDER, SCRIPTS_REPO_DIR} from '@shared/configs';
import logger from '@shared/logger/logger';

export class ScriptService {
  private readonly scriptRepository: ScriptRepository;
  private readonly resultRepository: TestResultRepository;

  constructor(
    scriptRepository?: ScriptRepository,
    resultRepository?: TestResultRepository
  ) {
    this.scriptRepository = scriptRepository ?? new ScriptFilesystemRepository(SCRIPTS_REPO_DIR);
    this.resultRepository = resultRepository ?? new TestResultFilesystemRepository();
  }

  async saveScript(scriptId: string | undefined, metadata: ScriptMetadata): Promise<Script> {
    if (!metadata.script || metadata.script.trim().length === 0) {
      throw new BadRequestError('Script content is required');
    }
    if (!metadata.folderId || metadata.folderId.trim().length === 0) {
      throw new BadRequestError('Folder ID is required - scripts must belong to a folder');
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

    this.validateScriptLimitForFolder(metadata.folderId);

    const newScriptId = scriptId ? scriptId : `script-${now}`;

    if (this.scriptRepository.exists(newScriptId)) {
      throw new BadRequestError(`Script with ID '${newScriptId}' already exists`);
    }

    const newScript: Script = {
      scriptId: newScriptId,
      script: metadata.script,
      config: metadata.config,
      description: metadata.description,
      tags: metadata.tags,
      folderId: metadata.folderId,
      createdAt: now,
      updatedAt: now,
    };

    await this.scriptRepository.save(newScript);
    logger.info(`Created script: ${newScriptId} in folder: ${metadata.folderId}`);
    return newScript;
  }

  private validateScriptLimitForFolder(folderId: string): void {
    const folderScripts = this.scriptRepository.findByFolderId(folderId);
    if (folderScripts.length >= MAX_SCRIPTS_PER_FOLDER) {
      throw new BadRequestError(`Maximum number of scripts per folder (${MAX_SCRIPTS_PER_FOLDER}) reached`);
    }
  }

  getScript(scriptId: string): Script {
    const script = this.scriptRepository.findById(scriptId);
    if (!script) {
      throw new NotFoundError(`Script not found: ${scriptId}`);
    }
    return script;
  }

  deleteScript(scriptId: string): void {
    const success = this.scriptRepository.deleteById(scriptId);
    if (!success) {
      throw new NotFoundError(`Script not found: ${scriptId}`);
    }
    logger.info(`Deleted script: ${scriptId}`);
  }

  getScriptHistory(scriptId: string, limit: number): TestResult[] {
    const script = this.scriptRepository.findById(scriptId);
    if (!script) {
      throw new NotFoundError(`Script not found: ${scriptId}`);
    }

    const results = this.resultRepository.findByScriptId(scriptId);
    return results.slice(0, limit);
  }
}

export const scriptService = new ScriptService();
