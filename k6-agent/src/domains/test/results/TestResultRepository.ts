import {TestResult} from '@domains/test/models/types';

export interface TestResultRepository {

  save(testId: string, result: TestResult): Promise<void>;

  findById(testId: string): TestResult | null;

  findAll(): TestResult[];

  deleteById(testId: string): boolean;

  findByScriptId(scriptId: string): TestResult[];

  cleanupScriptHistory(scriptId: string, limit: number): Promise<void>;

}
