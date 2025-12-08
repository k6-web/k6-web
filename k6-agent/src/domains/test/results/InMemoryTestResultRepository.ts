import {TestResult} from '@domains/test/models/types';
import {TestResultRepository} from './TestResultRepository';

/**
 * In-memory implementation of the test result repository.
 * Useful for testing, development, or scenarios where persistence is not required.
 *
 * Note: Data is lost when the process restarts.
 */
export class InMemoryTestResultRepository implements TestResultRepository {
  private readonly storage: Map<string, TestResult>;
  private readonly maxResults: number;

  constructor(maxResults: number = 100) {
    this.storage = new Map();
    this.maxResults = maxResults;
  }

  async save(testId: string, result: TestResult): Promise<void> {
    this.storage.set(testId, result);
    await this.cleanupOldResults();
  }

  findById(testId: string): TestResult | null {
    return this.storage.get(testId) ?? null;
  }

  findAll(): TestResult[] {
    return Array.from(this.storage.values());
  }

  deleteById(testId: string): boolean {
    return this.storage.delete(testId);
  }

  private async cleanupOldResults(): Promise<void> {
    if (this.storage.size <= this.maxResults) {
      return;
    }

    const results = Array.from(this.storage.entries())
      .sort(([, a], [, b]) => b.endTime - a.endTime);

    const toDelete = results.slice(this.maxResults);
    for (const [testId] of toDelete) {
      this.storage.delete(testId);
    }
  }
}
