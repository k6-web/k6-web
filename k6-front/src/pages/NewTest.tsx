import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {k6Api} from '../apis/testApi.ts';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    setError(null);

    try {
      const result = await k6Api.runTest(script, {
        name: httpConfig.name,
        config: httpConfig
      });
      navigate(`/tests/${result.testId}`);
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
            {loading ? '🚀 Starting Test...' : '🚀 Start Load Test'}
          </Button>
          <div style={{marginTop: '0.75rem', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#6b7280'}}>
            Run load test with the configured script above
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
