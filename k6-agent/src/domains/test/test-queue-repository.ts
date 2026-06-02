import fs from 'fs';
import path from 'path';
import logger from '@shared/logger/logger';
import {TEST_QUEUE_DIR} from '@shared/configs';
import {TestQueueItem} from './test-types';

export interface TestQueueRepository {
  save(item: TestQueueItem): void;
  findById(testId: string): TestQueueItem | null;
  findAll(): TestQueueItem[];
  deleteById(testId: string): boolean;
}

export class TestQueueFilesystemRepository implements TestQueueRepository {
  constructor(private readonly queueDir: string = TEST_QUEUE_DIR) {
    if (!fs.existsSync(this.queueDir)) {
      fs.mkdirSync(this.queueDir, {recursive: true});
    }
  }

  save(item: TestQueueItem): void {
    fs.writeFileSync(this.getPath(item.testId), JSON.stringify(item));
  }

  findById(testId: string): TestQueueItem | null {
    try {
      const content = fs.readFileSync(this.getPath(testId), 'utf8');
      return JSON.parse(content) as TestQueueItem;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error(`Failed to read queued test ${testId}: ${(err as Error).message}`);
      }
      return null;
    }
  }

  findAll(): TestQueueItem[] {
    try {
      if (!fs.existsSync(this.queueDir)) {
        return [];
      }

      return fs.readdirSync(this.queueDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const content = fs.readFileSync(path.join(this.queueDir, file), 'utf8');
          return JSON.parse(content) as TestQueueItem;
        })
        .sort((a, b) => (a.queuedAt ?? a.scheduledAt ?? a.createdAt) - (b.queuedAt ?? b.scheduledAt ?? b.createdAt));
    } catch (err) {
      logger.error(`Failed to read queued tests: ${(err as Error).message}`);
      return [];
    }
  }

  deleteById(testId: string): boolean {
    try {
      fs.unlinkSync(this.getPath(testId));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      logger.error(`Failed to delete queued test ${testId}: ${(err as Error).message}`);
      return false;
    }
  }

  private getPath(testId: string): string {
    return path.join(this.queueDir, `${testId}.json`);
  }
}
