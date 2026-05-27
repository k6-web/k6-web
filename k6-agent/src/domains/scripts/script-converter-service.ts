import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {spawn} from 'child_process';
import {BadRequestError} from '@shared/http/errors';
import logger from '@shared/logger/logger';

interface ConvertPostmanRequest {
  collection: unknown;
  environment?: unknown;
}

const RAMP_TRANSITION_DURATION = '1s';

export interface ImportK6Config {
  vusers?: number;
  duration?: number;
  rampUp?: number;
  stages?: Array<{duration: number; target: number}>;
  targetTps?: number;
  preAllocatedVUs?: number;
  maxVUs?: number;
  failureThreshold?: number;
  template?: 'constant-vus' | 'constant-tps' | 'ramp-up';
}

interface PostmanCollection {
  item?: PostmanItem[];
}

interface PostmanItem {
  name?: string;
  item?: PostmanItem[];
  request?: PostmanRequest | string;
}

interface PostmanRequest {
  method?: string;
  header?: Array<{key?: string; value?: string; disabled?: boolean}>;
  url?: string | {
    raw?: string;
    protocol?: string;
    host?: string[];
    path?: string[];
    query?: Array<{key?: string; value?: string; disabled?: boolean}>;
  };
  body?: {
    mode?: string;
    raw?: string;
    urlencoded?: Array<{key?: string; value?: string; disabled?: boolean}>;
    formdata?: Array<{key?: string; value?: string; disabled?: boolean; type?: string}>;
  };
  auth?: {
    type?: string;
    bearer?: Array<{key?: string; value?: string}>;
    apikey?: Array<{key?: string; value?: string}>;
  };
}

export interface PostmanScriptDraft {
  name: string;
  scriptIdBase: string;
  description: string;
  script: string;
}

const runCommand = (command: string, args: string[], cwd: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {cwd});
    let stderr = '';

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
};

const runPostmanToK6 = async (workDir: string, args: string[]): Promise<void> => {
  const configuredBin = process.env.POSTMAN_TO_K6_BIN;
  if (configuredBin) {
    await runCommand(configuredBin, args, workDir);
    return;
  }

  try {
    await runCommand('postman-to-k6', args, workDir);
  } catch (globalError) {
    logger.debug(`postman-to-k6 global command failed: ${globalError}`);
    await runCommand('npx', ['--no-install', 'postman-to-k6', ...args], workDir);
  }
};

const methodNamePattern = /^http\.(post|put|patch|del|delete|options)\s*$/;

const findMatchingParen = (input: string, openIndex: number): number => {
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
};

const splitTopLevelArgs = (input: string, start: number, end: number): Array<{start: number; end: number}> => {
  const args: Array<{start: number; end: number}> = [];
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  let argStart = start;

  for (let index = start; index < end; index += 1) {
    const char = input[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if ('([{'.includes(char)) depth += 1;
    if (')]}'.includes(char)) depth -= 1;

    if (char === ',' && depth === 0) {
      args.push({start: argStart, end: index});
      argStart = index + 1;
    }
  }

  args.push({start: argStart, end});
  return args.map(arg => {
    let trimmedStart = arg.start;
    let trimmedEnd = arg.end;
    while (/\s/.test(input[trimmedStart])) trimmedStart += 1;
    while (/\s/.test(input[trimmedEnd - 1])) trimmedEnd -= 1;
    return {start: trimmedStart, end: trimmedEnd};
  });
};

const decodeJsStringLiteral = (literal: string): string | null => {
  const quote = literal[0];
  if ((quote !== '"' && quote !== "'" && quote !== '`') || literal[literal.length - 1] !== quote) return null;
  if (quote === '`' && literal.includes('${')) return null;

  try {
    if (quote === '"') return JSON.parse(literal);
  } catch {
    return null;
  }

  let value = '';
  for (let index = 1; index < literal.length - 1; index += 1) {
    const char = literal[index];
    if (char !== '\\') {
      value += char;
      continue;
    }

    index += 1;
    const escaped = literal[index];
    if (escaped === 'n') value += '\n';
    else if (escaped === 'r') value += '\r';
    else if (escaped === 't') value += '\t';
    else if (escaped === 'b') value += '\b';
    else if (escaped === 'f') value += '\f';
    else if (escaped === 'v') value += '\v';
    else if (escaped === 'u') {
      const hex = literal.slice(index + 1, index + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
      value += String.fromCharCode(parseInt(hex, 16));
      index += 4;
    } else if (escaped === 'x') {
      const hex = literal.slice(index + 1, index + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) return null;
      value += String.fromCharCode(parseInt(hex, 16));
      index += 2;
    } else {
      value += escaped;
    }
  }

  return value;
};

const jsonStringifyExpression = (value: unknown): string => `JSON.stringify(${JSON.stringify(value, null, 2)})`;

const jsString = (value: string): string => JSON.stringify(value);

const bodyToK6Expression = (body: string): string => {
  if (!body) return 'null';

  try {
    return jsonStringifyExpression(JSON.parse(body));
  } catch {
    return jsString(body);
  }
};

const collectPostmanRequests = (
  items: PostmanItem[] = [],
  prefix = ''
): Array<{name: string; request: PostmanRequest}> => {
  return items.flatMap(item => {
    const name = [prefix, item.name].filter(Boolean).join(' / ') || 'Request';
    if (item.item) return collectPostmanRequests(item.item, name);
    if (!item.request || typeof item.request === 'string') return [];
    return [{name, request: item.request}];
  });
};

const postmanUrlToString = (url: PostmanRequest['url']): string => {
  if (!url) return '';
  if (typeof url === 'string') return url;
  if (url.raw) return url.raw;

  const host = Array.isArray(url.host) ? url.host.join('.') : '';
  const requestPath = Array.isArray(url.path) ? url.path.join('/') : '';
  const query = (url.query || [])
    .filter(item => !item.disabled && item.key)
    .map(item => `${encodeURIComponent(item.key || '')}=${encodeURIComponent(item.value || '')}`)
    .join('&');
  const base = `${url.protocol || 'https'}://${host}${requestPath ? `/${requestPath}` : ''}`;
  return query ? `${base}?${query}` : base;
};

const postmanHeaders = (request: PostmanRequest): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const header of request.header || []) {
    if (!header.disabled && header.key) headers[header.key] = header.value || '';
  }

  if (request.auth?.type === 'bearer') {
    const token = request.auth.bearer?.find(item => item.key === 'token')?.value;
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (request.auth?.type === 'apikey') {
    const key = request.auth.apikey?.find(item => item.key === 'key')?.value;
    const value = request.auth.apikey?.find(item => item.key === 'value')?.value;
    if (key && value) headers[key] = value;
  }

  return headers;
};

const postmanBodyToString = (body: PostmanRequest['body']): string => {
  if (!body) return '';
  if (body.mode === 'raw') return body.raw || '';
  if (body.mode === 'urlencoded') {
    return (body.urlencoded || [])
      .filter(item => !item.disabled && item.key)
      .map(item => `${encodeURIComponent(item.key || '')}=${encodeURIComponent(item.value || '')}`)
      .join('&');
  }
  if (body.mode === 'formdata') {
    return (body.formdata || [])
      .filter(item => !item.disabled && item.key && item.type !== 'file')
      .map(item => `${encodeURIComponent(item.key || '')}=${encodeURIComponent(item.value || '')}`)
      .join('&');
  }
  return '';
};

const requestToK6Call = (request: PostmanRequest): string => {
  const method = (request.method || 'GET').toLowerCase();
  const url = postmanUrlToString(request.url);
  const headers = postmanHeaders(request);
  const body = postmanBodyToString(request.body);
  const hasHeaders = Object.keys(headers).length > 0;
  const params = hasHeaders ? `, { headers: ${JSON.stringify(headers, null, 6)} }` : '';

  if (['get', 'head', 'options', 'delete'].includes(method) && !body) {
    return `http.${method}(${jsString(url)}${params})`;
  }

  return `http.${method}(${jsString(url)}, ${bodyToK6Expression(body)}${params})`;
};

const k6OptionsToScript = (config: ImportK6Config = {}): string => {
  const template = config.template || 'constant-vus';
  const duration = Math.max(config.duration || 30, 1);
  const threshold = config.failureThreshold ?? 0.05;

  if (template === 'ramp-up') {
    const vusers = Math.max(config.vusers || 1, 1);
    const configuredStages = config.stages && config.stages.length > 0
      ? config.stages.map(stage => ({
        duration: Math.max(stage.duration || 1, 1),
        target: Math.max(stage.target || 0, 0),
      }))
      : [
        {duration: Math.max(config.rampUp || 30, 1), target: vusers},
        {duration, target: vusers},
      ];
    const rampStages = configuredStages.flatMap((stage, index, allStages) => {
      const previousTarget = index === 0 ? 0 : allStages[index - 1].target;
      const holdStage = {duration: `${stage.duration}s`, target: stage.target};
      if (stage.target === previousTarget) return [holdStage];
      return [
        {duration: RAMP_TRANSITION_DURATION, target: stage.target},
        holdStage,
      ];
    });

    return `export const options = {
  scenarios: {
    test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
${rampStages.map(stage => `        { duration: '${stage.duration}', target: ${stage.target} },`).join('\n')}
      ],
    },
  },
  setupTimeout: '60s',
  teardownTimeout: '60s',
  noConnectionReuse: false,
  batch: 20,
  batchPerHost: 20,
  thresholds: {
    http_req_failed: [
      { threshold: "rate<${threshold}", abortOnFail: true },
    ],
  },
};`;
  }

  if (template === 'constant-tps') {
    const rate = Math.max(config.targetTps || 1, 1);
    const preAllocatedVUs = Math.max(config.preAllocatedVUs || config.vusers || 1, 1);
    const maxVUs = Math.max(config.maxVUs || preAllocatedVUs, preAllocatedVUs);
    return `export const options = {
  scenarios: {
    test: {
      executor: 'constant-arrival-rate',
      rate: ${rate},
      timeUnit: '1s',
      duration: '${duration}s',
      preAllocatedVUs: ${preAllocatedVUs},
      maxVUs: ${maxVUs},
    },
  },
  setupTimeout: '60s',
  teardownTimeout: '60s',
  noConnectionReuse: false,
  batch: 20,
  batchPerHost: 20,
  thresholds: {
    http_req_failed: [
      { threshold: "rate<${threshold}", abortOnFail: true },
    ],
  },
};`;
  }

  return `export const options = {
  scenarios: {
    test: {
      executor: 'constant-vus',
      vus: ${Math.max(config.vusers || 1, 1)},
      duration: '${duration}s',
    },
  },
  setupTimeout: '60s',
  teardownTimeout: '60s',
  noConnectionReuse: false,
  batch: 20,
  batchPerHost: 20,
  thresholds: {
    http_req_failed: [
      { threshold: "rate<${threshold}", abortOnFail: true },
    ],
  },
};`;
};

const sanitizeScriptId = (name: string): string => {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return sanitized || 'postman-request';
};

const requestToScript = (name: string, request: PostmanRequest, config?: ImportK6Config): string => {
  return `import http from 'k6/http';
import { check, group } from 'k6';

${k6OptionsToScript(config)}

export default function () {
  group(${jsString(name)}, () => {
    const res = ${requestToK6Call(request)};
    check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });
}
`;
};

export const useJsonStringifyForJsonBodies = (script: string): string => {
  const replacements: Array<{start: number; end: number; value: string}> = [];
  const callPattern = /http\.(post|put|patch|del|delete|options)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = callPattern.exec(script)) !== null) {
    const openIndex = script.indexOf('(', match.index);
    const closeIndex = findMatchingParen(script, openIndex);
    if (closeIndex === -1) continue;

    const callee = script.slice(match.index, openIndex).trim();
    if (!methodNamePattern.test(callee)) continue;

    const args = splitTopLevelArgs(script, openIndex + 1, closeIndex);
    if (args.length < 2) continue;

    const bodyArg = args[1];
    const literal = script.slice(bodyArg.start, bodyArg.end);
    const body = decodeJsStringLiteral(literal);
    if (!body) continue;

    try {
      replacements.push({start: bodyArg.start, end: bodyArg.end, value: jsonStringifyExpression(JSON.parse(body))});
    } catch {
      continue;
    }
  }

  return replacements
    .reverse()
    .reduce((result, replacement) => (
      `${result.slice(0, replacement.start)}${replacement.value}${result.slice(replacement.end)}`
    ), script);
};

export class ScriptConverterService {
  async convertPostman(request: ConvertPostmanRequest): Promise<string> {
    if (!request.collection || typeof request.collection !== 'object') {
      throw new BadRequestError('Postman collection JSON is required');
    }

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'k6-postman-'));
    const collectionPath = path.join(workDir, 'collection.json');
    const outputPath = path.join(workDir, 'script.js');

    try {
      await fs.writeFile(collectionPath, JSON.stringify(request.collection), 'utf8');

      const args = [collectionPath, '-o', outputPath];
      if (request.environment && typeof request.environment === 'object') {
        const environmentPath = path.join(workDir, 'environment.json');
        await fs.writeFile(environmentPath, JSON.stringify(request.environment), 'utf8');
        args.push('-e', environmentPath);
      }

      await runPostmanToK6(workDir, args);
      return useJsonStringifyForJsonBodies(await fs.readFile(outputPath, 'utf8'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert Postman collection';
      throw new BadRequestError(`Postman conversion failed. Install postman-to-k6 or set POSTMAN_TO_K6_BIN. ${message}`);
    } finally {
      await fs.rm(workDir, {recursive: true, force: true});
    }
  }

  convertPostmanToScripts(collection: unknown, config?: ImportK6Config): PostmanScriptDraft[] {
    if (!collection || typeof collection !== 'object') {
      throw new BadRequestError('Postman collection JSON is required');
    }

    const requests = collectPostmanRequests((collection as PostmanCollection).item);
    if (requests.length === 0) {
      throw new BadRequestError('No requests found in Postman collection');
    }

    return requests.map(({name, request}) => ({
      name,
      scriptIdBase: sanitizeScriptId(name),
      description: `Postman: ${name}`,
      script: requestToScript(name, request, config),
    }));
  }
}

export const scriptConverterService = new ScriptConverterService();
