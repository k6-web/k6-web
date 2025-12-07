const express = require('express');
const {deleteTestResult} = require('../services/testResultService');
const {getRunningTest} = require('../services/testExecutionService');

const router = express.Router();

router.delete('/:testId', (req, res) => {
    const testId = req.params.testId;

    if (getRunningTest(testId)) {
        return res.status(400).json({
            error: 'Cannot delete result of running test'
        });
    }

    try {
        const success = deleteTestResult(testId);

        if (success) {
            res.json({message: 'Result deleted successfully'});
        } else {
            res.status(404).json({error: 'Result not found'});
        }
    } catch (err) {
        res.status(500).json({
            error: `Failed to delete result: ${err.message}`
        });
    }
});

module.exports = router;

