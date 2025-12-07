const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const {SCRIPTS_DIR} = require('../commons/configs');
const {TestStatus} = require('./enums');
const {saveTestResult} = require('./resultManager');

const runningTests = new Map();

function runTest(script, metadata = {}) {
  const testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const scriptPath = path.join(SCRIPTS_DIR, `k6-script-${testId}.js`);
  const summaryPath = path.join(SCRIPTS_DIR, `k6-summary-${testId}.json`);

  fs.writeFileSync(scriptPath, script);

  const k6Process = spawn('k6', ['run', '--summary-export', summaryPath, scriptPath]);

  const testInfo = {
    testId,
    process: k6Process,
    status: TestStatus.RUNNING,
    startTime: Date.now(),
    script,
    scriptPath,
    summaryPath,
    logs: [],
    logListeners: [],
    name: metadata.name,
    config: metadata.config
  };

  runningTests.set(testId, testInfo);

  k6Process.stdout.on('data', (data) => {
    const logEntry = {
      type: 'stdout',
      timestamp: Date.now(),
      message: data.toString()
    };
    testInfo.logs.push(logEntry);

    for (const listener of testInfo.logListeners) {
      listener(logEntry);
    }
  });

  k6Process.stderr.on('data', (data) => {
    const logEntry = {
      type: 'stderr',
      timestamp: Date.now(),
      message: data.toString()
    };
    testInfo.logs.push(logEntry);

    for (const listener of testInfo.logListeners) {
      listener(logEntry);
    }
  });

  k6Process.on('close', (code) => {
    const endTime = Date.now();
    const duration = endTime - testInfo.startTime;

    let status = TestStatus.COMPLETED;
    if (code !== 0 && testInfo.status !== TestStatus.STOPPED) {
      status = TestStatus.FAILED;
    } else if (testInfo.status === TestStatus.STOPPED) {
      status = TestStatus.STOPPED;
    }

    let summary = null;
    try {
      if (fs.existsSync(testInfo.summaryPath)) {
        const summaryContent = fs.readFileSync(testInfo.summaryPath, 'utf-8');
        summary = JSON.parse(summaryContent);
      }
    } catch (err) {
      console.error(`Failed to read summary JSON: ${err.message}`);
    }

    const result = {
      testId,
      status,
      startTime: testInfo.startTime,
      endTime,
      duration,
      exitCode: code,
      script: testInfo.script,
      name: testInfo.name,
      config: testInfo.config,
      summary
    };

    saveTestResult(testId, result);

    const logEntry = {
      type: 'system',
      timestamp: Date.now(),
      message: `Test completed with exit code ${code}`
    };
    for (const listener of testInfo.logListeners) {
      listener(logEntry);
    }

    try {
      fs.unlinkSync(scriptPath);
    } catch (err) {
      console.error(`Failed to delete script file: ${err.message}`);
    }

    try {
      if (fs.existsSync(testInfo.summaryPath)) {
        fs.unlinkSync(testInfo.summaryPath);
      }
    } catch (err) {
      console.error(`Failed to delete summary file: ${err.message}`);
    }

    runningTests.delete(testId);
  });

  k6Process.on('error', (err) => {
    const logEntry = {
      type: 'error',
      timestamp: Date.now(),
      message: `Process error: ${err.message}`
    };
    testInfo.logs.push(logEntry);
    for (const listener of testInfo.logListeners) {
      listener(logEntry);
    }

    testInfo.status = TestStatus.FAILED;
  });

  return testId;
}

function stopTest(testId) {
  if (!runningTests.has(testId)) {
    return false;
  }

  const test = runningTests.get(testId);
  test.process.kill('SIGTERM');
  test.status = TestStatus.STOPPED;
  return true;
}

function stopAllTests() {
  const stoppedTests = [];

  for (const [testId, test] of runningTests.entries()) {
    try {
      test.process.kill('SIGTERM');
      test.status = TestStatus.STOPPED;
      stoppedTests.push(testId);
    } catch (err) {
      console.error(`Failed to stop test ${testId}: ${err.message}`);
    }
  }

  return stoppedTests;
}

function getRunningTest(testId) {
  return runningTests.get(testId);
}

function getAllRunningTests() {
  return runningTests;
}

function addLogListener(testId, listener) {
  const test = runningTests.get(testId);
  if (test) {
    test.logListeners.push(listener);
    return true;
  }
  return false;
}

function removeLogListener(testId, listener) {
  const test = runningTests.get(testId);
  if (test) {
    const index = test.logListeners.indexOf(listener);
    if (index > -1) {
      test.logListeners.splice(index, 1);
    }
    return true;
  }
  return false;
}

module.exports = {
  runTest,
  stopTest,
  stopAllTests,
  getRunningTest,
  getAllRunningTests,
  addLogListener,
  removeLogListener
};

