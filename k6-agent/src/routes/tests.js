const express = require('express');
const {getAllTestResults, getTestResult} = require('../services/testResultService');
const {getAllRunningTests, getRunningTest} = require('../services/testExecutionService');

const router = express.Router();

router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit || '100', 10);
    const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;

    const tests = [];
    const runningTests = getAllRunningTests();

    for (const [testId, test] of runningTests.entries()) {
        tests.push({
            testId,
            status: test.status,
            startTime: test.startTime,
            script: test.script.substring(0, 100) + '...',
            name: test.name
        });
    }

    const fileResults = getAllTestResults();
    for (const result of fileResults) {
        if (!runningTests.has(result.testId)) {
            tests.push({
                testId: result.testId,
                status: result.status,
                startTime: result.startTime,
                endTime: result.endTime,
                exitCode: result.exitCode,
                name: result.name,
                summary: result.summary
            });
        }
    }

    const sortedTests = tests.sort((a, b) => b.startTime - a.startTime);

    let filteredTests = sortedTests;
    if (cursor !== null) {
        const cursorIndex = sortedTests.findIndex(t => t.startTime === cursor);
        if (cursorIndex !== -1) {
            filteredTests = sortedTests.slice(cursorIndex + 1);
        }
    }

    const paginatedTests = filteredTests.slice(0, limit);

    const hasMore = filteredTests.length > limit;
    const nextCursor = hasMore && paginatedTests.length > 0
        ? paginatedTests[paginatedTests.length - 1].startTime
        : null;

    res.json({
        count: sortedTests.length,
        tests: paginatedTests,
        pagination: {
            limit,
            cursor,
            nextCursor,
            hasMore
        }
    });
});

router.get('/:testId', (req, res) => {
    const testId = req.params.testId;

    const runningTest = getRunningTest(testId);
    if (runningTest) {
        return res.json({
            testId,
            status: runningTest.status,
            startTime: runningTest.startTime,
            script: runningTest.script,
            name: runningTest.name
        });
    }

    const result = getTestResult(testId);
    if (result) {
        return res.json(result);
    }

    res.status(404).json({error: 'Test not found'});
});

router.get('/:testId/result', (req, res) => {
    const testId = req.params.testId;
    const result = getTestResult(testId);

    if (result) {
        res.json(result);
    } else {
        res.status(404).json({error: 'Test result not found'});
    }
});

module.exports = router;

