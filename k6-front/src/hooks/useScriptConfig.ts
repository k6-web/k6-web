import {useState, useCallback, useRef} from 'react';
import type {K6TestConfig} from '../types/k6';
import {httpConfigToScript, scriptToHttpConfig, updateScriptOptionsFromConfig} from '../utils/scriptUtils';

/**
 * Config keys that only touch `export const options`. Changing these rewrites
 * the options block in place, leaving the rest of the script untouched.
 */
const optionConfigKeys = new Set<keyof K6TestConfig>([
  'vusers',
  'duration',
  'rampUp',
  'stages',
  'targetTps',
  'preAllocatedVUs',
  'maxVUs',
  'failureThreshold',
  'template'
]);

export const DEFAULT_HTTP_CONFIG: K6TestConfig = {
  url: '',
  method: 'GET',
  headers: {},
  body: '',
  vusers: 1,
  duration: 10,
  rampUp: 0,
  stages: [
    {duration: 30, target: 10},
    {duration: 60, target: 10},
    {duration: 30, target: 0}
  ],
  targetTps: 10,
  preAllocatedVUs: 10,
  maxVUs: 20,
  name: '',
  failureThreshold: 0.05,
  template: 'constant-vus'
};

export const useScriptConfig = (initialScript: string) => {
  const [script, setScript] = useState(initialScript);
  const [httpConfig, setHttpConfig] = useState<K6TestConfig>(DEFAULT_HTTP_CONFIG);
  const [isDynamicScript, setIsDynamicScript] = useState(false);

  /**
   * Whether the script currently in the editor was hand-written rather than
   * generated from the Quick Start form. Body-level Quick Start edits
   * regenerate the whole script, so they would silently discard such edits.
   */
  const [isScriptHandEdited, setIsScriptHandEdited] = useState(false);

  // A pending change parked while we ask the user whether to discard their edits.
  const pendingChangeRef = useRef<Partial<K6TestConfig> | null>(null);
  const [hasPendingOverwrite, setHasPendingOverwrite] = useState(false);

  const updateConfigFromScript = useCallback((scriptCode: string) => {
    const {config, isDynamic} = scriptToHttpConfig(scriptCode);
    setIsDynamicScript(isDynamic);
    setHttpConfig(prev => ({...prev, ...config}));
  }, []);

  /** Applies a config change, regenerating the script body when required. */
  const applyConfigChange = useCallback((changes: Partial<K6TestConfig>) => {
    setHttpConfig(prevConfig => {
      const newConfig = {...prevConfig, ...changes};
      const changedKeys = Object.keys(changes) as Array<keyof K6TestConfig>;
      const hasNonNameChanges = changedKeys.some(key => key !== 'name');

      if (hasNonNameChanges) {
        const onlyOptionsChanged = changedKeys.every(key => key === 'name' || optionConfigKeys.has(key));

        if (onlyOptionsChanged) {
          setScript(prevScript => updateScriptOptionsFromConfig(prevScript, newConfig));
        } else {
          setScript(httpConfigToScript(newConfig));
          // The body was regenerated, so nothing hand-written survives.
          setIsScriptHandEdited(false);
        }
      }

      return newConfig;
    });
  }, []);

  const handleConfigChange = useCallback((changes: Partial<K6TestConfig>) => {
    const changedKeys = Object.keys(changes) as Array<keyof K6TestConfig>;
    const rewritesBody = changedKeys.some(key => key !== 'name' && !optionConfigKeys.has(key));

    // Only body-rewriting changes can destroy hand-written code; ask first.
    if (rewritesBody && isScriptHandEdited) {
      pendingChangeRef.current = changes;
      setHasPendingOverwrite(true);
      return;
    }

    applyConfigChange(changes);
  }, [applyConfigChange, isScriptHandEdited]);

  const confirmPendingOverwrite = useCallback(() => {
    const pending = pendingChangeRef.current;
    pendingChangeRef.current = null;
    setHasPendingOverwrite(false);
    if (pending) applyConfigChange(pending);
  }, [applyConfigChange]);

  const cancelPendingOverwrite = useCallback(() => {
    pendingChangeRef.current = null;
    setHasPendingOverwrite(false);
  }, []);

  const handleScriptChange = useCallback((newScript: string) => {
    setScript(newScript);
    setIsScriptHandEdited(true);
    updateConfigFromScript(newScript);
  }, [updateConfigFromScript]);

  /** Replaces the script wholesale (copy, rerun, import) without flagging it as hand-edited. */
  const replaceScript = useCallback((nextScript: string) => {
    setScript(nextScript);
    setIsScriptHandEdited(false);
  }, []);

  return {
    script,
    httpConfig,
    isDynamicScript,
    isScriptHandEdited,
    hasPendingOverwrite,
    setScript: replaceScript,
    setHttpConfig,
    setIsDynamicScript,
    handleConfigChange,
    handleScriptChange,
    updateConfigFromScript,
    confirmPendingOverwrite,
    cancelPendingOverwrite
  };
};
