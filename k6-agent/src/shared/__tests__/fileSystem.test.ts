import {describe, it, expect, afterEach} from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('fileSystem', () => {
  const testResultsDir = path.join(__dirname, '__test_results__');
  const testScriptsDir = path.join(__dirname, '__test_scripts__');

  afterEach(() => {
    [testResultsDir, testScriptsDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir);
      }
    });
  });

  describe('initializeDirectories', () => {
    it('should create results and scripts directories if they do not exist', () => {
      const originalResultsDir = process.env.RESULTS_DIR;
      const originalScriptsDir = process.env.SCRIPTS_DIR;

      process.env.RESULTS_DIR = testResultsDir;
      process.env.SCRIPTS_DIR = testScriptsDir;

      expect(fs.existsSync(testResultsDir)).toBe(false);
      expect(fs.existsSync(testScriptsDir)).toBe(false);

      jest.isolateModules(() => {
        const {initializeDirectories} = require('../fileSystem');
        initializeDirectories();
      });

      expect(fs.existsSync(testResultsDir)).toBe(true);
      expect(fs.existsSync(testScriptsDir)).toBe(true);

      process.env.RESULTS_DIR = originalResultsDir;
      process.env.SCRIPTS_DIR = originalScriptsDir;
    });

    it('should not error if directories already exist', () => {
      fs.mkdirSync(testResultsDir, {recursive: true});
      fs.mkdirSync(testScriptsDir, {recursive: true});

      const originalResultsDir = process.env.RESULTS_DIR;
      const originalScriptsDir = process.env.SCRIPTS_DIR;

      process.env.RESULTS_DIR = testResultsDir;
      process.env.SCRIPTS_DIR = testScriptsDir;

      expect(() => {
        jest.isolateModules(() => {
          const {initializeDirectories} = require('../fileSystem');
          initializeDirectories();
        });
      }).not.toThrow();

      process.env.RESULTS_DIR = originalResultsDir;
      process.env.SCRIPTS_DIR = originalScriptsDir;
    });
  });
});
