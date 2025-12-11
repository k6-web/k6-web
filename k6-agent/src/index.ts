import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import logger from '@shared/logger';
import {notFoundHandler, errorHandler} from '@shared/errorHandler';
import {PORT, K6_BASE_PATH, RESULTS_DIR, SCRIPTS_DIR, MAX_RESULT_FILES} from '@shared/configs';
import {initializeDirectories} from '@shared/fileSystem';
import {setupGracefulShutdown} from '@domains/test/shutdownHandler';
import healthRouter from '@domains/health/router';
import testRouter from '@domains/test/router';
import scriptRouter from '@domains/scripts/router';
import folderRouter from '@domains/folders/router';

const app = express();

initializeDirectories();

// Security middleware
app.use(helmet());

// CORS
app.use(cors());

// Compression
app.use(compression({
  filter: (req, res) => {
    // Don't compress SSE streams
    if (req.path.includes('/stream')) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Body parser
app.use(express.json({limit: '10mb'}));

// Routes
app.use('/health', healthRouter);
app.use('/v1/tests', testRouter);
app.use('/v1/scripts', scriptRouter);
app.use('/v1/folders', folderRouter);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`k6 agent listening on port ${PORT}`);
  logger.info(`Base directory: ${K6_BASE_PATH}`);
  logger.info(`Results directory: ${RESULTS_DIR}`);
  logger.info(`Scripts directory: ${SCRIPTS_DIR}`);
  logger.info(`Max result files: ${MAX_RESULT_FILES}`);
});

setupGracefulShutdown();
