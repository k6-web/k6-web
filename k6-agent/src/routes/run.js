const express = require('express');
const {runTest, getRunningTest, addLogListener, removeLogListener} = require('../services/testExecutionService');
const {TestStatus} = require('../config/constants');

const router = express.Router();

router.post('/', (req, res) => {
    let script;
    let metadata = {};

    if (req.is('application/json')) {
        script = req.body.script;
        metadata = {
            name: req.body.name,
            config: req.body.config
        };
    } else {
        script = req.body;
    }

    if (!script || typeof script !== 'string') {
        return res.status(400).json({
            error: 'Invalid request. Please provide a k6 script in the request body.'
        });
    }

    try {
        const testId = runTest(script, metadata);

        res.json({
            testId,
            status: TestStatus.RUNNING,
            message: 'Test started successfully',
            streamUrl: `/stream/${testId}`,
            statusUrl: `/tests/${testId}`,
            stopUrl: `/stop/${testId}`,
            name: metadata.name
        });

    } catch (err) {
        res.status(500).json({
            error: `Failed to start test: ${err.message}`
        });
    }
});

router.get('/:testId', (req, res) => {
    const testId = req.params.testId;

    const test = getRunningTest(testId);
    if (!test) {
        return res.status(404).json({error: 'Test not found or not running'});
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for (const log of test.logs) {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    }

    const logListener = (log) => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    };

    addLogListener(testId, logListener);

    req.on('close', () => {
        removeLogListener(testId, logListener);
    });
});

module.exports = router;

