import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {spawn} from 'child_process';
import {BadRequestError} from '@shared/http/errors';
import logger from '@shared/logger/logger';

interface ConvertPostmanRequest {
  collection: unknown;
  environment?: unknown;
}

const runCommand = (command: string, args: string[], cwd: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {cwd});
    let stderr = '';

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
};

const runPostmanToK6 = async (workDir: string, args: string[]): Promise<void> => {
  const configuredBin = process.env.POSTMAN_TO_K6_BIN;
  if (configuredBin) {
    await runCommand(configuredBin, args, workDir);
    return;
  }

  try {
    await runCommand('postman-to-k6', args, workDir);
  } catch (globalError) {
    logger.debug(`postman-to-k6 global command failed: ${globalError}`);
    await runCommand('npx', ['--no-install', 'postman-to-k6', ...args], workDir);
  }
};

export class ScriptConverterService {
  async convertPostman(request: ConvertPostmanRequest): Promise<string> {
    if (!request.collection || typeof request.collection !== 'object') {
      throw new BadRequestError('Postman collection JSON is required');
    }

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'k6-postman-'));
    const collectionPath = path.join(workDir, 'collection.json');
    const outputPath = path.join(workDir, 'script.js');

    try {
      await fs.writeFile(collectionPath, JSON.stringify(request.collection), 'utf8');

      const args = [collectionPath, '-o', outputPath];
      if (request.environment && typeof request.environment === 'object') {
        const environmentPath = path.join(workDir, 'environment.json');
        await fs.writeFile(environmentPath, JSON.stringify(request.environment), 'utf8');
        args.push('-e', environmentPath);
      }

      await runPostmanToK6(workDir, args);
      return await fs.readFile(outputPath, 'utf8');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert Postman collection';
      throw new BadRequestError(`Postman conversion failed. Install postman-to-k6 or set POSTMAN_TO_K6_BIN. ${message}`);
    } finally {
      await fs.rm(workDir, {recursive: true, force: true});
    }
  }
}

export const scriptConverterService = new ScriptConverterService();
