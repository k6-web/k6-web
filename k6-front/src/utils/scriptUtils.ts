import * as acorn from 'acorn';
import type {K6TestConfig} from '../types/k6';

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
  const {url, method, headers, body, vusers, duration, rampUp, failureThreshold} = config;

  let scriptCode = `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
`;

  if (rampUp && rampUp > 0) {
    scriptCode += `    { duration: '${rampUp}s', target: ${vusers} },\n`;
    const maintainDuration = duration - rampUp;
    if (maintainDuration > 0) {
      scriptCode += `    { duration: '${maintainDuration}s', target: ${vusers} },\n`;
    }
  } else {
    scriptCode += `    { duration: '${duration}s', target: ${vusers} },\n`;
  }

  scriptCode += `  ],
  http: {
    timeout: '30s',
    reuseConnection: true,
  },
  noUsageReport: true,
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
}
`;

  return scriptCode;
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

      const vusMatch = /target:\s*(\d+)/.exec(scriptCode);
      if (vusMatch) {
        config.vusers = Number.parseInt(vusMatch[1]);
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
