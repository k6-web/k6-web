import {LogListener, TestInfo, TestMetadata} from '@domains/test/models/types';

export interface K6TestExecutor {

  /**
   * Execute a k6 test script
   * @param script - The k6 test script content
   * @param metadata - Optional test metadata
   * @returns testId - Unique identifier for the test
   */
  runTest(script: string, metadata: TestMetadata): string;

  /**
   * Stop a running test
   * @param testId - The test identifier
   * @returns true if test was stopped, false if test not found
   */
  stopTest(testId: string): boolean;

  /**
   * Stop all running tests
   * @returns Array of test IDs that were stopped
   */
  stopAllTests(): string[];

  /**
   * Get information about a running test
   * @param testId - The test identifier
   * @returns TestInfo if found, undefined otherwise
   */
  getRunningTest(testId: string): TestInfo | undefined;

  /**
   * Get all running tests
   * @returns Map of testId to TestInfo
   */
  getAllRunningTests(): Map<string, TestInfo>;

  /**
   * Add a log listener to a running test
   * @param testId - The test identifier
   * @param listener - The log listener callback
   * @returns true if listener was added, false if test not found
   */
  addLogListener(testId: string, listener: LogListener): boolean;

  /**
   * Remove a log listener from a running test
   * @param testId - The test identifier
   * @param listener - The log listener callback to remove
   * @returns true if listener was removed, false if test not found
   */
  removeLogListener(testId: string, listener: LogListener): boolean;

}
