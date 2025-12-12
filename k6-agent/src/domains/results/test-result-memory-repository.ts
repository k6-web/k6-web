import {TestResult} from '@domains/test/test-types';
import {TestResultRepository} from './test-result-repository';

/**
 * In-memory implementation of the test result repository.
 * Useful for testing, development, or scenarios where persistence is not required.
 *
 * Note: Data is lost when the process restarts.
 */
export class TestResultMemoryRepository implements TestResultRepository {
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

  findByScriptId(scriptId: string): TestResult[] {
    const allResults = this.findAll();
    return allResults
      .filter(result => result.scriptId === scriptId)
      .sort((a, b) => b.startTime - a.startTime);
  }

  async cleanupScriptHistory(scriptId: string, limit: number): Promise<void> {
    const scriptResults = this.findByScriptId(scriptId);

    if (scriptResults.length > limit) {
      const resultsToDelete = scriptResults.slice(limit);
      for (const result of resultsToDelete) {
        this.deleteById(result.testId);
      }
    }
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
