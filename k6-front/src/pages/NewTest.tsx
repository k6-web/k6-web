import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {k6Api} from '../apis/testApi.ts';
import {scriptApi} from '../apis/scriptApi';
import type {Test} from '../types/test.ts';
import {RecentTestsModal, HttpConfigForm, ScriptEditor} from '../components/new-test';
import {Button, InfoBox} from '../components/common';
import {useScriptConfig} from '../hooks/useScriptConfig';
import {useScriptValidation} from '../hooks/useScriptValidation';
import {useTooltip} from '../hooks/useTooltip';

const DEFAULT_SCRIPT = `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
  ],
};

export default function () {
  const res = http.get('https://test.k6.io');
  check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300
  });
}
`;

export const NewTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saveAsScript, setSaveAsScript] = useState(searchParams.get('saveScript') === 'true');
  const [scriptId, setScriptId] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [scriptTags, setScriptTags] = useState('');

  const {
    script,
    httpConfig,
    isDynamicScript,
    setScript,
    setHttpConfig,
    handleConfigChange,
    handleScriptChange,
    updateConfigFromScript
  } = useScriptConfig(DEFAULT_SCRIPT);

  const {syntaxError, validate} = useScriptValidation();
  const showTooltip = useTooltip(300, 5000);

  const [showRecentTests, setShowRecentTests] = useState(false);
  const [recentTests, setRecentTests] = useState<Test[]>([]);
  const [loadingRecentTests, setLoadingRecentTests] = useState(false);

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  // Load rerun script from session storage
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
        updateConfigFromScript(rerunScript);
      }
    }
  }, [setScript, setHttpConfig, updateConfigFromScript]);

  // Validate initial script
  useEffect(() => {
    if (script) {
      validate(script);
    }
  }, []);

  const fetchRecentTests = async () => {
    setLoadingRecentTests(true);
    try {
      const data = await k6Api.getTests(null, 5);
      const testsWithScripts = data.tests.filter(test => test.script).slice(0, 5);
      setRecentTests(testsWithScripts);
    } catch (err) {
      console.error('Failed to fetch recent tests:', err);
    } finally {
      setLoadingRecentTests(false);
    }
  };

  const handleLoadRecentTest = async (testId: string) => {
    try {
      const test = await k6Api.getTest(testId);
      if (test.script) {
        setScript(test.script);
        updateConfigFromScript(test.script);
        validate(test.script);
        setShowRecentTests(false);
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    } catch (err) {
      alert('Failed to load test script');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate(script)) {
      setError('Script has syntax errors. Please fix and try again.');
      return;
    }

    if (saveAsScript && !httpConfig.name) {
      setError('Script name is required when saving as script');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let savedScriptId = scriptId;

      if (saveAsScript) {
        const trimmedScriptId = scriptId.trim();
        const trimmedDescription = scriptDescription.trim();
        const savedScript = await scriptApi.createScript({
          ...(trimmedScriptId && {scriptId: trimmedScriptId}),
          name: httpConfig.name || 'Untitled Script',
          script: script,
          config: httpConfig,
          ...(trimmedDescription && {description: trimmedDescription}),
          ...(scriptTags && {tags: scriptTags.split(',').map(t => t.trim()).filter(t => t)})
        });
        savedScriptId = savedScript.scriptId;
      }

      const result = await k6Api.runTest(script, {
        name: httpConfig.name,
        config: httpConfig
      });

      if (saveAsScript) {
        navigate(`/scripts/${savedScriptId}`);
      } else {
        navigate(`/tests/${result.testId}`);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to start test';
      setError(errorMessage);
      window.scrollTo({top: 0, behavior: 'smooth'});
    } finally {
      setLoading(false);
    }
  };

  const handleAddHeader = () => {
    if (headerKey && headerValue) {
      const newHeaders = {...httpConfig.headers, [headerKey]: headerValue};
      handleConfigChange({headers: newHeaders});
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const handleRemoveHeader = (key: string) => {
    const {[key]: _, ...rest} = httpConfig.headers || {};
    handleConfigChange({headers: rest});
  };

  const handleScriptChangeWithValidation = (newScript: string) => {
    handleScriptChange(newScript);
    validate(newScript);
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
        <h1 style={{margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2rem)'}}>Create New Test</h1>
        <div style={{position: 'relative'}}>
          <Button
            variant="purple"
            onClick={() => {
              setShowRecentTests(true);
              fetchRecentTests();
            }}
            title="View and load your 5 most recent test scripts to quickly re-run or modify them"
          >
            📋 Recent Tests
          </Button>
          {showTooltip && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              zIndex: 10,
              pointerEvents: 'none',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              💡 Quickly load your recent test scripts!
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '1rem',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid #3b82f6'
              }} />
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <InfoBox variant="error">
            {error}
          </InfoBox>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <HttpConfigForm
            config={httpConfig}
            isDynamic={isDynamicScript}
            headerKey={headerKey}
            headerValue={headerValue}
            onConfigChange={handleConfigChange}
            onHeaderKeyChange={setHeaderKey}
            onHeaderValueChange={setHeaderValue}
            onAddHeader={handleAddHeader}
            onRemoveHeader={handleRemoveHeader}
          />

          <ScriptEditor
            script={script}
            syntaxError={syntaxError}
            onScriptChange={handleScriptChangeWithValidation}
          />
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={saveAsScript}
                onChange={(e) => setSaveAsScript(e.target.checked)}
                style={{width: '18px', height: '18px'}}
              />
              <span style={{fontWeight: 'bold'}}>💾 Save as Reusable Script</span>
            </label>
            <p style={{margin: '0.5rem 0 0 1.75rem', fontSize: '0.875rem', color: '#6b7280'}}>
              Save this script to run it again later from the Script Library
            </p>
          </div>

          {saveAsScript && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              borderLeft: '4px solid #10b981'
            }}>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  Script ID (optional)
                </label>
                <input
                  type="text"
                  value={scriptId}
                  onChange={(e) => setScriptId(e.target.value)}
                  placeholder="Leave empty for auto-generation"
                  pattern="^[a-z0-9-]*$"
                  title="Only lowercase letters, numbers, and hyphens"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                <p style={{margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280'}}>
                  Custom ID for easy reference (e.g., "homepage-test")
                </p>
              </div>

              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  Description (optional)
                </label>
                <textarea
                  value={scriptDescription}
                  onChange={(e) => setScriptDescription(e.target.value)}
                  placeholder="Describe what this script tests..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  Tags (optional)
                </label>
                <input
                  type="text"
                  value={scriptTags}
                  onChange={(e) => setScriptTags(e.target.value)}
                  placeholder="api, production, critical (comma-separated)"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <Button
            type="submit"
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              fontSize: 'clamp(1rem, 3vw, 1.125rem)',
              width: '100%',
              maxWidth: '300px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? '🚀 Starting Test...' : saveAsScript ? '💾 Save & Run Test' : '🚀 Start Load Test'}
          </Button>
          <div style={{marginTop: '0.75rem', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#6b7280'}}>
            {saveAsScript ? 'Save script and run load test' : 'Run load test with the configured script above'}
          </div>
        </div>
      </form>

      <RecentTestsModal
        show={showRecentTests}
        tests={recentTests}
        loading={loadingRecentTests}
        onClose={() => setShowRecentTests(false)}
        onLoadTest={handleLoadRecentTest}
      />
    </div>
  );
};
