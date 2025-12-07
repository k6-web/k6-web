require('dotenv').config();
const path = require('path');

const PORT = process.env.PORT || 3000;
const K6_BASE_PATH = process.env.K6_BASE_PATH || '/home/k6';
const RESULTS_DIR = process.env.RESULTS_DIR || path.join(K6_BASE_PATH, 'k6-results');
const SCRIPTS_DIR = process.env.SCRIPTS_DIR || path.join(K6_BASE_PATH, 'k6-scripts');
const MAX_RESULT_FILES = parseInt(process.env.MAX_RESULT_FILES || '500', 10);

module.exports = {
  PORT,
  K6_BASE_PATH,
  RESULTS_DIR,
  SCRIPTS_DIR,
  MAX_RESULT_FILES,
};

