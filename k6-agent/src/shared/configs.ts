import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const K6_BASE_PATH = process.env.K6_BASE_PATH || '/tmp/k6';
export const RESULTS_DIR = process.env.RESULTS_DIR || path.join(K6_BASE_PATH, 'k6-results');
export const SCRIPTS_DIR = process.env.SCRIPTS_DIR || path.join(K6_BASE_PATH, 'k6-scripts');
export const SCRIPTS_REPO_DIR = process.env.SCRIPTS_REPO_DIR || path.join(SCRIPTS_DIR, 'repo');
export const FOLDERS_REPO_DIR = process.env.FOLDERS_REPO_DIR || path.join(SCRIPTS_DIR, 'folders');

export const MAX_RESULT_FILES = parseInt(process.env.MAX_RESULT_FILES || '500', 10);
export const MAX_FOLDERS = parseInt(process.env.MAX_FOLDERS || '50', 10);
export const MAX_SCRIPTS_PER_FOLDER = parseInt(process.env.MAX_SCRIPTS_PER_FOLDER || '20', 10);
