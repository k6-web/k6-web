import * as acorn from 'acorn';
import type {K6ScriptTemplate, K6TestConfig} from '../types/k6';

export const hasDynamicParameters = (scriptCode: string): boolean => {
  return (
    /`[^`]*\$\{[^}]+\}[^`]*`/.test(scriptCode) ||
    /http\.\w+\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[,)]/.test(scriptCode) ||
    /const\s+url\s*=/.test(scriptCode) ||
    /(let|var)\s+url\s*=/.test(scriptCode) ||
    /(randomInt|Math\.random|Math\.floor.*Math\.random)/.test(scriptCode) ||
    /Array\.(from|of|isArray)/.test(scriptCode) ||
    /[a-zA-Z_$][a-zA-Z0-9_$]*\s*\+\s*["'`]/.test(scriptCode) ||
    /["'`]\s*\+\s*[a-zA-Z_$][a-zA-Z0-9_$]*/.test(scriptCode) ||
    /http\.\w+\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\([^)]*\)/.test(scriptCode) ||
    /\?[^'"`]*\$\{/.test(scriptCode) ||
    /\.join\s*\(/.test(scriptCode)
  );
};

export const validateScript = (code: string): { valid: boolean; error: string | null } => {
  try {
    acorn.parse(code, {
      ecmaVersion: 2020,
      sourceType: 'module'
    });
    return {valid: true, error: null};
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Syntax error';
    const lineMatch = /\((\d+):(\d+)\)/.exec(errorMessage);
    if (lineMatch) {
      const line = lineMatch[1];
      const col = lineMatch[2];
      return {valid: false, error: `Line ${line}, Column ${col}: ${errorMessage}`};
    }
    return {valid: false, error: errorMessage};
  }
};

export const httpConfigToScript = (config: K6TestConfig): string => {
  const {
    url,
    method,
    headers,
    body,
    vusers,
    duration,
    rampUp,
    stages,
    targetTps,
    preAllocatedVUs,
    maxVUs,
    failureThreshold,
    template = 'constant-vus'
  } = config;

  let scriptCode = `import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    test: {
`;

  if (template === 'constant-tps') {
    const allocatedVUs = Math.max(preAllocatedVUs || 1, 1);
    const maximumVUs = Math.max(maxVUs || allocatedVUs, allocatedVUs);
    scriptCode += `      executor: 'constant-arrival-rate',
      rate: ${Math.max(targetTps || 1, 1)},
      timeUnit: '1s',
      duration: '${Math.max(duration, 1)}s',
      preAllocatedVUs: ${allocatedVUs},
      maxVUs: ${maximumVUs},
`;
  } else if (template === 'ramp-up') {
    const rampStages = (stages && stages.length > 0 ? stages : [
      {duration: Math.max(rampUp || 30, 1), target: vusers},
      {duration: Math.max(duration, 1), target: vusers}
    ]).map(stage => ({
      duration: Math.max(stage.duration || 1, 1),
      target: Math.max(stage.target || 0, 0)
    }));

    scriptCode += `      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
${rampStages.map(stage => `        { duration: '${stage.duration}s', target: ${stage.target} },`).join('\n')}
      ],
`;
  } else {
    scriptCode += `      executor: 'constant-vus',
      vus: ${vusers},
      duration: '${duration}s',
`;
  }

  scriptCode += `    },
  },
  setupTimeout: '60s',
  teardownTimeout: '60s',
  noConnectionReuse: false,
  batch: 20,
  batchPerHost: 20,
  thresholds: {
    http_req_failed: [
      { threshold: "rate<${failureThreshold ?? 0.05}", abortOnFail: true },
    ],
  },
};
`;

  if (headers && Object.keys(headers).length > 0) {
    scriptCode += `
const params = {
  headers: ${JSON.stringify(headers, null, 2)},
};
`;
  }

  scriptCode += `
export default function () {
`;

  const methodLower = method.toLowerCase();

  if (methodLower === 'get' || methodLower === 'head' || methodLower === 'options') {
    if (headers && Object.keys(headers).length > 0) {
      scriptCode += `  const res = http.${methodLower}('${url}', params);\n`;
    } else {
      scriptCode += `  const res = http.${methodLower}('${url}');\n`;
    }
  } else {
    let bodyString = 'null';
    if (body) {
      if (typeof body === 'string') {
        try {
          JSON.parse(body);
          bodyString = `\`${body}\``;
        } catch {
          bodyString = `'${(body as string).replace(/'/g, "\\'")}'`;
        }
      } else if (typeof body === 'object') {
        bodyString = JSON.stringify(body);
      }
    }

    if (headers && Object.keys(headers).length > 0) {
      scriptCode += `  const res = http.${methodLower}('${url}', ${bodyString}, params);\n`;
    } else {
      scriptCode += `  const res = http.${methodLower}('${url}', ${bodyString});\n`;
    }
  }

  scriptCode += `
  check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300
  });
  sleep(1);
}
`;

  return scriptCode;
};

const shellTokenize = (input: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of input.replace(/\\\r?\n/g, ' ')) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = null;
      continue;
    }
    if (/\s/.test(char) && quote === null) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (current) tokens.push(current);
  return tokens;
};

const splitHeader = (header: string): [string, string] | null => {
  const index = header.indexOf(':');
  if (index <= 0) return null;
  return [header.slice(0, index).trim(), header.slice(index + 1).trim()];
};

export const curlToHttpConfig = (curlCommand: string, baseConfig: K6TestConfig): K6TestConfig => {
  const tokens = shellTokenize(curlCommand.trim());
  if (tokens[0] !== 'curl') {
    throw new Error('curl command must start with curl');
  }

  const headers: Record<string, string> = {};
  let method = '';
  let url = '';
  let body = '';
  let basicAuth = '';

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    const readValue = () => {
      if (!next) throw new Error(`Missing value for ${token}`);
      i += 1;
      return next;
    };

    if (token === '-X' || token === '--request') {
      method = readValue().toUpperCase();
    } else if (token.startsWith('-X') && token.length > 2) {
      method = token.slice(2).toUpperCase();
    } else if (token === '-H' || token === '--header') {
      const header = splitHeader(readValue());
      if (header) headers[header[0]] = header[1];
    } else if (token.startsWith('--header=')) {
      const header = splitHeader(token.slice('--header='.length));
      if (header) headers[header[0]] = header[1];
    } else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode'].includes(token)) {
      body = readValue();
    } else if (token.startsWith('--data-raw=')) {
      body = token.slice('--data-raw='.length);
    } else if (token.startsWith('--data=')) {
      body = token.slice('--data='.length);
    } else if (token === '-u' || token === '--user') {
      basicAuth = readValue();
    } else if (token === '-I' || token === '--head') {
      method = 'HEAD';
    } else if (token === '--url') {
      url = readValue();
    } else if (!token.startsWith('-') && !url) {
      url = token;
    }
  }

  if (basicAuth) {
    headers.Authorization = `Basic ${btoa(basicAuth)}`;
  }
  if (!url) {
    throw new Error('URL not found in curl command');
  }
  if (!method) {
    method = body ? 'POST' : 'GET';
  }

  return {
    ...baseConfig,
    url,
    method,
    headers,
    body,
  };
};

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
    basic?: Array<{key?: string; value?: string}>;
    apikey?: Array<{key?: string; value?: string}>;
  };
}

const collectPostmanRequests = (items: PostmanItem[] = [], prefix = ''): Array<{name: string; request: PostmanRequest}> => {
  return items.flatMap((item) => {
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
  const path = Array.isArray(url.path) ? url.path.join('/') : '';
  const query = (url.query || [])
    .filter((q) => !q.disabled && q.key)
    .map((q) => `${encodeURIComponent(q.key || '')}=${encodeURIComponent(q.value || '')}`)
    .join('&');
  const base = `${url.protocol || 'https'}://${host}${path ? `/${path}` : ''}`;
  return query ? `${base}?${query}` : base;
};

const postmanHeaders = (request: PostmanRequest): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const header of request.header || []) {
    if (!header.disabled && header.key) headers[header.key] = header.value || '';
  }

  if (request.auth?.type === 'bearer') {
    const token = request.auth.bearer?.find((item) => item.key === 'token')?.value;
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (request.auth?.type === 'apikey') {
    const key = request.auth.apikey?.find((item) => item.key === 'key')?.value;
    const value = request.auth.apikey?.find((item) => item.key === 'value')?.value;
    if (key && value) headers[key] = value;
  }

  return headers;
};

const postmanBodyToString = (body: PostmanRequest['body']): string => {
  if (!body) return '';
  if (body.mode === 'raw') return body.raw || '';
  if (body.mode === 'urlencoded') {
    return (body.urlencoded || [])
      .filter((item) => !item.disabled && item.key)
      .map((item) => `${encodeURIComponent(item.key || '')}=${encodeURIComponent(item.value || '')}`)
      .join('&');
  }
  if (body.mode === 'formdata') {
    return (body.formdata || [])
      .filter((item) => !item.disabled && item.key && item.type !== 'file')
      .map((item) => `${encodeURIComponent(item.key || '')}=${encodeURIComponent(item.value || '')}`)
      .join('&');
  }
  return '';
};

const jsString = (value: string) => JSON.stringify(value);

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

  return `http.${method}(${jsString(url)}, ${jsString(body)}${params})`;
};

export const postmanCollectionToScript = (collection: PostmanCollection, config: K6TestConfig): string => {
  const requests = collectPostmanRequests(collection.item);
  if (requests.length === 0) {
    throw new Error('No requests found in Postman collection');
  }

  const threshold = config.failureThreshold ?? 0.05;
  const groups = requests.map(({name, request}) => `  group(${jsString(name)}, () => {
    const res = ${requestToK6Call(request)};
    check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    sleep(1);
  });`).join('\n\n');

  return `import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  vus: ${config.vusers},
  duration: '${Math.max(config.duration, 1)}s',
  thresholds: {
    http_req_failed: [
      { threshold: "rate<${threshold}", abortOnFail: true },
    ],
  },
};

export default function () {
${groups}
}
`;
};

export const getTemplateDefaults = (template: K6ScriptTemplate, current: K6TestConfig): K6TestConfig => {
  const base = {...current, template};
  if (template === 'constant-vus') return {...base, rampUp: 0};
  if (template === 'constant-tps') {
    return {
      ...base,
      targetTps: Math.max(current.targetTps || 0, 10),
      preAllocatedVUs: Math.max(current.preAllocatedVUs || current.vusers || 0, 10),
      maxVUs: Math.max(current.maxVUs || current.preAllocatedVUs || current.vusers || 0, 20),
      rampUp: 0
    };
  }
  if (template === 'ramp-up') {
    return {
      ...base,
      vusers: Math.max(current.vusers, 10),
      duration: Math.max(current.duration, 60),
      rampUp: Math.max(current.rampUp || 0, 30),
      stages: current.stages && current.stages.length > 0 ? current.stages : [
        {duration: 30, target: 10},
        {duration: 60, target: 10},
        {duration: 30, target: 0}
      ]
    };
  }
  return {...base, rampUp: current.rampUp || 0};
};

export const scriptToHttpConfig = (scriptCode: string): {config: Partial<K6TestConfig>; isDynamic: boolean} => {
  try {
    const isDynamic = hasDynamicParameters(scriptCode);

    const config: Partial<K6TestConfig> = {};

    const methodMatch = /http\.(get|post|put|patch|delete|head|options)\s*\(/i.exec(scriptCode);
    if (methodMatch) {
      config.method = methodMatch[1].toUpperCase();

      const staticUrlMatch = /http\.\w+\s*\(\s*['"`]([^'"`]+)['"`]/.exec(scriptCode);
      if (staticUrlMatch && !staticUrlMatch[1].includes('${')) {
        config.url = staticUrlMatch[1];
      } else {
        const urlVarMatch = /const\s+url\s*=\s*[`'"]([^`'"]+)[`'"]/.exec(scriptCode);
        if (urlVarMatch) {
          const urlTemplate = urlVarMatch[1];
          const baseUrlMatch = /(https?:\/\/[^$`'"/?\s]+)/.exec(urlTemplate);
          if (baseUrlMatch) {
            config.url = baseUrlMatch[1];
          } else {
            config.url = urlTemplate.substring(0, 100);
          }
        }
      }

      // Check for constant-vus executor
      const constantVusMatch = /executor:\s*['"`]constant-vus['"`]/.exec(scriptCode);
      if (constantVusMatch) {
        config.template = 'constant-vus';
        const vusMatch = /vus:\s*(\d+)/.exec(scriptCode);
        if (vusMatch) {
          config.vusers = Number.parseInt(vusMatch[1]);
        }
        const durationMatch = /duration:\s*['"`](\d+)s['"`]/.exec(scriptCode);
        if (durationMatch) {
          config.duration = Number.parseInt(durationMatch[1]);
        }
        config.rampUp = 0;
      } else {
        const constantArrivalMatch = /executor:\s*['"`]constant-arrival-rate['"`]/.exec(scriptCode);
        if (constantArrivalMatch) {
          config.template = 'constant-tps';
          const rateMatch = /rate:\s*(\d+)/.exec(scriptCode);
          if (rateMatch) {
            config.targetTps = Number.parseInt(rateMatch[1]);
          }
          const durationMatch = /duration:\s*['"`](\d+)s['"`]/.exec(scriptCode);
          if (durationMatch) {
            config.duration = Number.parseInt(durationMatch[1]);
          }
          const preAllocatedMatch = /preAllocatedVUs:\s*(\d+)/.exec(scriptCode);
          if (preAllocatedMatch) {
            config.preAllocatedVUs = Number.parseInt(preAllocatedMatch[1]);
          }
          const maxVusMatch = /maxVUs:\s*(\d+)/.exec(scriptCode);
          if (maxVusMatch) {
            config.maxVUs = Number.parseInt(maxVusMatch[1]);
          }
          config.rampUp = 0;
        } else {
          config.template = 'ramp-up';
          const stageMatches = [...scriptCode.matchAll(/\{\s*duration:\s*['"`](\d+)s['"`]\s*,\s*target:\s*(\d+)\s*\}/g)];
          if (stageMatches.length > 0) {
            config.stages = stageMatches.map(match => ({
              duration: Number.parseInt(match[1]),
              target: Number.parseInt(match[2])
            }));
            config.duration = config.stages.reduce((total, stage) => total + stage.duration, 0);
            config.vusers = Math.max(...config.stages.map(stage => stage.target), 1);
            config.rampUp = config.stages[0]?.duration || 0;
          } else {
            const targetMatch = /target:\s*(\d+)/.exec(scriptCode);
            if (targetMatch) {
              config.vusers = Number.parseInt(targetMatch[1]);
            }

            const durationMatches = scriptCode.matchAll(/duration:\s*['"`](\d+)s['"`]/g);
            let totalDuration = 0;
            let firstDuration = 0;
            let index = 0;
            for (const match of durationMatches) {
              const dur = Number.parseInt(match[1]);
              if (index === 0) {
                firstDuration = dur;
              }
              totalDuration += dur;
              index++;
            }
            if (totalDuration > 0) {
              config.duration = totalDuration;
              if (firstDuration > 0 && index > 1) {
                config.rampUp = firstDuration;
              }
            }
          }
        }
      }

      const headersMatch = /headers:\s*\{([^}]+)\}/s.exec(scriptCode);
      if (headersMatch) {
        try {
          const headersContent = headersMatch[1];
          const headers: Record<string, string> = {};

          const headerPairs = headersContent.matchAll(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g);
          for (const match of headerPairs) {
            headers[match[1]] = match[2];
          }

          if (Object.keys(headers).length > 0) {
            config.headers = headers;
          }
        } catch (e) {
          console.warn('Failed to parse headers from script:', e);
        }
      }

      if (['POST', 'PUT', 'PATCH'].includes(config.method || '')) {
        const bodyMatch = /http\.\w+\s*\([^,]+,\s*([^,)]+)/.exec(scriptCode);
        if (bodyMatch) {
          let bodyStr = bodyMatch[1].trim();
          bodyStr = bodyStr.replace(/^[`'"]/g, '').replace(/[`'"]$/g, '');
          config.body = bodyStr;
        }
      }
    }

    return {config, isDynamic};
  } catch (err) {
    console.error('Failed to extract HTTP config from script:', err);
    return {config: {}, isDynamic: false};
  }
};
