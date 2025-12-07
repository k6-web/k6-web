const fs = require('fs');
const {RESULTS_DIR, SCRIPTS_DIR} = require('../configs');

function initializeDirectories() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, {recursive: true});
  }
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, {recursive: true});
  }
}

module.exports = {
  initializeDirectories
};

