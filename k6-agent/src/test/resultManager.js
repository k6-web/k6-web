const fs = require('fs');
const path = require('path');
const logger = require('../commons/logger');
const {RESULTS_DIR, MAX_RESULT_FILES} = require('../commons/configs');

function getAllTestResults() {
  const results = [];
  try {
    const files = fs.readdirSync(RESULTS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const resultFile = path.join(RESULTS_DIR, file);
        const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        results.push(result);
      }
    }
  } catch (err) {
    logger.error(`Failed to read test results: ${err.message}`);
  }
  return results;
}

function getTestResult(testId) {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
  if (fs.existsSync(resultFile)) {
    return JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  }
  return null;
}

function cleanupOldResults() {
  try {
    const files = fs.readdirSync(RESULTS_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(RESULTS_DIR, file),
        mtime: fs.statSync(path.join(RESULTS_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > MAX_RESULT_FILES) {
      const filesToDelete = files.slice(MAX_RESULT_FILES);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        logger.info(`Deleted old result file: ${file.name}`);
      }
      logger.info(`Cleaned up ${filesToDelete.length} old result file(s)`);
    }
  } catch (err) {
    logger.error(`Failed to cleanup old results: ${err.message}`);
  }
}

function saveTestResult(testId, result) {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  cleanupOldResults();
}

function deleteTestResult(testId) {
  const resultFile = path.join(RESULTS_DIR, `${testId}.json`);
  if (fs.existsSync(resultFile)) {
    fs.unlinkSync(resultFile);
    return true;
  }
  return false;
}

module.exports = {
  getAllTestResults,
  getTestResult,
  saveTestResult,
  deleteTestResult,
};

