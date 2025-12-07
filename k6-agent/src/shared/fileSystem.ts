import fs from 'fs';
import {RESULTS_DIR, SCRIPTS_DIR} from '@shared/configs';

export function initializeDirectories(): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, {recursive: true});
  }
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, {recursive: true});
  }
}
