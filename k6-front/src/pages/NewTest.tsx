import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { k6Api } from '../services/api';
import type { HttpTestConfig, TestResult } from '../types';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';
import * as acorn from 'acorn';

SyntaxHighlighter.registerLanguage('javascript', javascript);


export const NewTest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  const [httpConfig, setHttpConfig] = useState<HttpTestConfig>({
    url: '',
    method: 'GET',
    headers: {},
    body: '',
    vusers: 1,
    duration: 10,
    rampUp: 0,
    name: ''
  });

  const [showRecentTests, setShowRecentTests] = useState(false);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [loadingRecentTests, setLoadingRecentTests] = useState(false);
  const [isDynamicScript, setIsDynamicScript] = useState(false); // Dynamic script detection
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  const [script, setScript] = useState(`import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
  ],
};

export default function () {
  const res = http.get('https://test.k6.io');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
`);

  useEffect(() => {
    const rerunScript = sessionStorage.getItem('rerunScript');
    const rerunConfigStr = sessionStorage.getItem('rerunConfig');

    if (rerunScript) {
      setScript(rerunScript);
      sessionStorage.removeItem('rerunScript');

      if (rerunConfigStr) {
        try {
          const rerunConfig = JSON.parse(rerunConfigStr);
          setHttpConfig({
            url: rerunConfig.url || '',
            method: rerunConfig.method || 'GET',
            headers: rerunConfig.headers || {},
            body: rerunConfig.body || '',
            vusers: rerunConfig.vusers || 1,
            duration: rerunConfig.duration || 10,
            rampUp: rerunConfig.rampUp || 0,
            name: rerunConfig.name || ''
          });
          sessionStorage.removeItem('rerunConfig');
        } catch (err) {
          console.error('Failed to parse rerun config:', err);
        }
      } else {
        scriptToHttpConfig(rerunScript);
      }
    }
  }, []);

  useEffect(() => {
    if (script) {
      validateScript(script);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateScript(script)) {
      setError('Script has syntax errors. Please fix and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await k6Api.runScript(script, {
        name: httpConfig.name,
        config: httpConfig
      });
      navigate(`/tests/${result.testId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const addHeader = () => {
    if (headerKey && headerValue) {
      setHttpConfig({
        ...httpConfig,
        headers: { ...httpConfig.headers, [headerKey]: headerValue }
      });
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    const { [key]: _, ...rest } = httpConfig.headers || {};
    setHttpConfig({ ...httpConfig, headers: rest });
  };

  const validateScript = (code: string) => {
    try {
      acorn.parse(code, {
        ecmaVersion: 2020,
        sourceType: 'module'
      });
      setSyntaxError(null);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Syntax error';
      const lineMatch = /\((\d+):(\d+)\)/.exec(errorMessage);
      if (lineMatch) {
        const line = lineMatch[1];
        const col = lineMatch[2];
        setSyntaxError(`Line ${line}, Column ${col}: ${errorMessage}`);
      } else {
        setSyntaxError(errorMessage);
      }
      return false;
    }
  };

  const httpConfigToScript = (config: HttpTestConfig): string => {
    const { url, method, headers, body, vusers, duration, rampUp } = config;

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
      scriptCode += `    { duration: '0s', target: ${vusers} },\n`;
      scriptCode += `    { duration: '${duration}s', target: ${vusers} },\n`;
    }

    scriptCode += `  ],
};

export default function () {
`;

    if (headers && Object.keys(headers).length > 0) {
      scriptCode += `  const params = {
    headers: ${JSON.stringify(headers, null, 6)},
  };
`;
    }

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
            bodyString = `'${body.replace(/'/g, "\\'")}'`;
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
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
`;

    return scriptCode;
  };

  const scriptToHttpConfig = (scriptCode: string) => {
    try {
      // 동적 스크립트 패턴 감지 (더 포괄적으로)
      const hasDynamicUrl =
        // 템플릿 리터럴에 변수가 있는 경우
        /`[^`]*\$\{[^}]+\}[^`]*`/.test(scriptCode) ||
        // http 메소드 호출 시 변수를 직접 사용하는 경우 (http.get(url) 등)
        /http\.\w+\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[,)]/.test(scriptCode) ||
        // const url = 로 시작하는 URL 변수 선언이 있는 경우
        /const\s+url\s*=/.test(scriptCode) ||
        // let/var로 URL 변수 선언
        /(let|var)\s+url\s*=/.test(scriptCode) ||
        // 랜덤 함수 사용
        /(randomInt|Math\.random|Math\.floor.*Math\.random)/.test(scriptCode) ||
        // Array 생성 함수 (동적 데이터)
        /Array\.(from|of|isArray)/.test(scriptCode) ||
        // 문자열 템플릿 연산
        /[a-zA-Z_$][a-zA-Z0-9_$]*\s*\+\s*["'`]/.test(scriptCode) ||
        /["'`]\s*\+\s*[a-zA-Z_$][a-zA-Z0-9_$]*/.test(scriptCode) ||
        // 함수 호출로 URL 생성
        /http\.\w+\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\([^)]*\)/.test(scriptCode) ||
        // URL에 동적 파라미터 추가 패턴
        /\?[^'"`]*\$\{/.test(scriptCode) ||
        // .join() 메소드 사용 (배열을 문자열로 변환)
        /\.join\s*\(/.test(scriptCode);

      setIsDynamicScript(hasDynamicUrl);

      const methodMatch = /http\.(get|post|put|patch|delete|head|options)\s*\(/i.exec(scriptCode);
      if (methodMatch) {
        const newConfig: Partial<HttpTestConfig> = {
          method: methodMatch[1].toUpperCase()
        };

        const staticUrlMatch = /http\.\w+\s*\(\s*['"`]([^'"`]+)['"`]/.exec(scriptCode);
        if (staticUrlMatch && !staticUrlMatch[1].includes('${')) {
          newConfig.url = staticUrlMatch[1];
        } else {
          const urlVarMatch = /const\s+url\s*=\s*[`'"]([^`'"]+)[`'"]/.exec(scriptCode);
          if (urlVarMatch) {
            const urlTemplate = urlVarMatch[1];
            const baseUrlMatch = /(https?:\/\/[^$`'"\/?\s]+)/.exec(urlTemplate);
            if (baseUrlMatch) {
              newConfig.url = baseUrlMatch[1];
            } else {
              newConfig.url = urlTemplate.substring(0, 100);
            }
          }
        }

        const vusMatch = /target:\s*(\d+)/.exec(scriptCode);
        if (vusMatch) {
          newConfig.vusers = Number.parseInt(vusMatch[1]);
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
          newConfig.duration = totalDuration;
          if (firstDuration > 0 && index > 1) {
            newConfig.rampUp = firstDuration;
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
              newConfig.headers = headers;
            }
          } catch (e) {
          }
        }

        if (['POST', 'PUT', 'PATCH'].includes(newConfig.method || '')) {
          const bodyMatch = /http\.\w+\s*\([^,]+,\s*([^,)]+)/.exec(scriptCode);
          if (bodyMatch) {
            let bodyStr = bodyMatch[1].trim();
            bodyStr = bodyStr.replace(/^[`'"]/g, '').replace(/[`'"]$/g, '');
            newConfig.body = bodyStr;
          }
        }

        setHttpConfig(prev => ({
          ...prev,
          method: newConfig.method || prev.method,
          url: newConfig.url || prev.url,
          vusers: newConfig.vusers !== undefined ? newConfig.vusers : prev.vusers,
          duration: newConfig.duration !== undefined ? newConfig.duration : prev.duration,
          rampUp: newConfig.rampUp !== undefined ? newConfig.rampUp : prev.rampUp,
          headers: newConfig.headers || prev.headers || {},
          body: newConfig.body !== undefined ? newConfig.body : prev.body || ''
        }));
      }

      return hasDynamicUrl;
    } catch (err) {
      console.error('Failed to extract HTTP config from script:', err);
      return false;
    }
  };

  const loadRecentTests = async () => {
    setLoadingRecentTests(true);
    try {
      const response = await k6Api.getTests(null, 10);
      const completedTests = response.tests.filter(t => t.status !== 'running');

      const testsWithResults = await Promise.all(
        completedTests.slice(0, 10).map(async (test) => {
          try {
            return await k6Api.getTestResult(test.testId);
          } catch (err) {
            return null;
          }
        })
      );

      setRecentTests(testsWithResults.filter(t => t !== null) as TestResult[]);
      setShowRecentTests(true);
    } catch (err) {
      console.error('Failed to load recent tests:', err);
      alert('Failed to load recent tests.');
    } finally {
      setLoadingRecentTests(false);
    }
  };

  const toggleScriptExpand = (testId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent parent div click event
    const newExpanded = new Set(expandedScripts);

    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }

    setExpandedScripts(newExpanded);
  };

  const copyScriptFromTest = (testResult: TestResult) => {
    setScript(testResult.script);

    if (testResult.config) {
      setHttpConfig({
        url: testResult.config.url || '',
        method: testResult.config.method || 'GET',
        headers: testResult.config.headers || {},
        body: testResult.config.body || '',
        vusers: testResult.config.vusers || 1,
        duration: testResult.config.duration || 10,
        rampUp: testResult.config.rampUp || 0,
        name: testResult.config.name || ''
      });
      const isDynamic = scriptToHttpConfig(testResult.script);
      setIsDynamicScript(isDynamic);
    } else {
      scriptToHttpConfig(testResult.script);
    }

    setShowRecentTests(false);
  };


  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Create New Test</h1>
        <button
          type="button"
          onClick={loadRecentTests}
          disabled={loadingRecentTests}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loadingRecentTests ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: loadingRecentTests ? 0.6 : 1,
            fontSize: 'clamp(0.875rem, 2vw, 1rem)'
          }}
        >
          {loadingRecentTests ? 'Loading...' : '📋 Copy Recent Script'}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>HTTP Test Configuration</h2>

            {isDynamicScript ? (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '4px',
                padding: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                ⚠️ <strong>Dynamic Script Detected:</strong> This script uses dynamic URLs or complex logic.
                HTTP settings are read-only and can only be modified in Custom Script. (Test name can be changed)
              </div>
            ) : (
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                padding: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: '#1e40af'
              }}>
                💡 <strong>Tip:</strong> If you need dynamic URLs or complex logic, write a Custom Script directly.
                This configuration is for quickly generating simple HTTP tests.
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Test Name (Optional)
              </label>
              <input
                type="text"
                value={httpConfig.name}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 50); // Max 50 characters limit
                  setHttpConfig({ ...httpConfig, name: value });
                }}
                placeholder="e.g., API Performance Test"
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {httpConfig.name?.length || 0}/50 characters
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                URL *
              </label>
              <input
                type="url"
                required
                value={httpConfig.url}
                disabled={isDynamicScript}
                onChange={(e) => {
                  setHttpConfig({ ...httpConfig, url: e.target.value });
                  if (httpConfig.url || e.target.value) {
                    const generatedScript = httpConfigToScript({ ...httpConfig, url: e.target.value });
                    setScript(generatedScript);
                  }
                }}
                placeholder="https://api.example.com/endpoint"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                  cursor: isDynamicScript ? 'not-allowed' : 'text',
                  color: isDynamicScript ? '#6b7280' : '#000'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Method
              </label>
              <select
                value={httpConfig.method}
                disabled={isDynamicScript}
                onChange={(e) => {
                  setHttpConfig({ ...httpConfig, method: e.target.value });
                  const generatedScript = httpConfigToScript({ ...httpConfig, method: e.target.value });
                  setScript(generatedScript);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                  cursor: isDynamicScript ? 'not-allowed' : 'pointer',
                  color: isDynamicScript ? '#6b7280' : '#000'
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Headers
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Header name"
                  value={headerKey}
                  disabled={isDynamicScript}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                    cursor: isDynamicScript ? 'not-allowed' : 'text',
                    color: isDynamicScript ? '#6b7280' : '#000'
                  }}
                />
                <input
                  type="text"
                  placeholder="Header value"
                  value={headerValue}
                  disabled={isDynamicScript}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                    cursor: isDynamicScript ? 'not-allowed' : 'text',
                    color: isDynamicScript ? '#6b7280' : '#000'
                  }}
                />
                <button
                  type="button"
                  disabled={isDynamicScript}
                  onClick={() => {
                    addHeader();
                    if (headerKey && headerValue) {
                      const newHeaders = { ...httpConfig.headers, [headerKey]: headerValue };
                      const generatedScript = httpConfigToScript({ ...httpConfig, headers: newHeaders });
                      setScript(generatedScript);
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: isDynamicScript ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isDynamicScript ? 'not-allowed' : 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
              {httpConfig.headers && Object.keys(httpConfig.headers).length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  {Object.entries(httpConfig.headers).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '4px',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <span style={{ fontSize: '0.875rem' }}>
                        <strong>{key}:</strong> {value}
                      </span>
                      <button
                        type="button"
                        disabled={isDynamicScript}
                        onClick={() => {
                          removeHeader(key);
                          const { [key]: _, ...rest } = httpConfig.headers || {};
                          const generatedScript = httpConfigToScript({ ...httpConfig, headers: rest });
                          setScript(generatedScript);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: isDynamicScript ? '#9ca3af' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isDynamicScript ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {['POST', 'PUT', 'PATCH'].includes(httpConfig.method) && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Request Body
                </label>
                <textarea
                  value={httpConfig.body as string}
                  disabled={isDynamicScript}
                  onChange={(e) => {
                    setHttpConfig({ ...httpConfig, body: e.target.value });
                    const generatedScript = httpConfigToScript({ ...httpConfig, body: e.target.value });
                    setScript(generatedScript);
                  }}
                  placeholder='{"key": "value"}'
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                    cursor: isDynamicScript ? 'not-allowed' : 'text',
                    color: isDynamicScript ? '#6b7280' : '#000'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Virtual Users *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={httpConfig.vusers}
                  disabled={isDynamicScript}
                  onChange={(e) => {
                    setHttpConfig({ ...httpConfig, vusers: Number.parseInt(e.target.value) });
                    const generatedScript = httpConfigToScript({ ...httpConfig, vusers: Number.parseInt(e.target.value) });
                    setScript(generatedScript);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                    cursor: isDynamicScript ? 'not-allowed' : 'text',
                    color: isDynamicScript ? '#6b7280' : '#000'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Duration (seconds) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={httpConfig.duration}
                  disabled={isDynamicScript}
                  onChange={(e) => {
                    setHttpConfig({ ...httpConfig, duration: Number.parseInt(e.target.value) });
                    const generatedScript = httpConfigToScript({ ...httpConfig, duration: Number.parseInt(e.target.value) });
                    setScript(generatedScript);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                    cursor: isDynamicScript ? 'not-allowed' : 'text',
                    color: isDynamicScript ? '#6b7280' : '#000'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Ramp-up (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={httpConfig.rampUp}
                  disabled={isDynamicScript}
                  onChange={(e) => {
                    setHttpConfig({ ...httpConfig, rampUp: Number.parseInt(e.target.value) });
                    const generatedScript = httpConfigToScript({ ...httpConfig, rampUp: Number.parseInt(e.target.value) });
                    setScript(generatedScript);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: isDynamicScript ? '#f3f4f6' : 'white',
                    cursor: isDynamicScript ? 'not-allowed' : 'text',
                    color: isDynamicScript ? '#6b7280' : '#000'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Custom Script */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Custom k6 Script</h2>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                k6 Script *
              </label>
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#f9fafb',
                flex: 1,
                minHeight: '600px',
                overflow: 'auto'
              }}>
                <Editor
                  value={script}
                  onValueChange={(code) => {
                    setScript(code);
                    scriptToHttpConfig(code);
                    validateScript(code);
                  }}
                  highlight={(code) => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
                  padding={16}
                  style={{
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    minHeight: '600px',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    color: '#1f2937'
                  }}
                  textareaClassName="code-editor-textarea"
                />
              </div>

              {/* Syntax error message */}
              {syntaxError && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <div>
                    <strong>Syntax Error:</strong> {syntaxError}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                💡 Tip: Changing HTTP settings will automatically generate the script, and modifying the script will automatically extract HTTP settings.
              </div>
            </div>
          </div>
        </div>

        {/* Run button */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 'clamp(1rem, 3vw, 1.125rem)',
              fontWeight: 'bold',
              width: '100%',
              maxWidth: '300px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? '🚀 Starting Test...' : '🚀 Start Load Test'}
          </button>
          <div style={{ marginTop: '0.75rem', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#6b7280' }}>
            Run load test with the configured script above
          </div>
        </div>
      </form>

      {/* Recent tests modal */}
      {showRecentTests && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Recent Test Scripts</h2>
              <button
                onClick={() => setShowRecentTests(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✕ Close
              </button>
            </div>

            {recentTests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                No recent tests found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentTests.map((test) => {
                  const isExpanded = expandedScripts.has(test.testId);

                  return (
                    <div
                      key={test.testId}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '1rem',
                        transition: 'all 0.2s',
                        backgroundColor: 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>
                            {test.name || test.testId}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {new Date(test.startTime).toLocaleString()}
                          </div>
                        </div>
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: test.status === 'completed' ? '#dcfce7' : '#fee2e2',
                          color: test.status === 'completed' ? '#166534' : '#991b1b',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {test.status.toUpperCase()}
                        </div>
                      </div>

                      {test.config && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}>
                          <span>📍 {test.config.method} {test.config.url}</span>
                          <span>👥 {test.config.vusers} VUs</span>
                          <span>⏱️ {test.config.duration}s</span>
                        </div>
                      )}

                      <div style={{ marginTop: '0.75rem' }}>
                        <button
                          onClick={(e) => toggleScriptExpand(test.testId, e)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}
                        >
                          {isExpanded ? '▼' : '▶'} Script
                        </button>

                        {isExpanded ? (
                          <div style={{
                            marginTop: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <SyntaxHighlighter
                              language="javascript"
                              customStyle={{
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                margin: 0,
                                backgroundColor: '#f6f8fa',
                                maxHeight: '300px',
                                overflow: 'auto'
                              }}
                              showLineNumbers={true}
                            >
                              {test.script}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <div style={{
                            padding: '0.5rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#374151',
                            marginBottom: '0.75rem'
                          }}>
                            {test.script.substring(0, 100)}...
                          </div>
                        )}
                      </div>

                      <div style={{
                        marginTop: '0.75rem',
                        textAlign: 'right'
                      }}>
                        <button
                          onClick={() => copyScriptFromTest(test)}
                          style={{
                            padding: '0.5rem 1.5rem',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#7c3aed';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#8b5cf6';
                          }}
                        >
                          📋 Copy Script
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
