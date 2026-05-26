import {useState, useCallback} from 'react';
import type {K6TestConfig} from '../types/k6';
import {httpConfigToScript, scriptToHttpConfig} from '../utils/scriptUtils';

export const useScriptConfig = (initialScript: string) => {
  const [script, setScript] = useState(initialScript);
  const [httpConfig, setHttpConfig] = useState<K6TestConfig>({
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
  });
  const [isDynamicScript, setIsDynamicScript] = useState(false);

  const updateScriptFromConfig = useCallback((config: K6TestConfig) => {
    const newScript = httpConfigToScript(config);
    setScript(newScript);
  }, []);

  const updateConfigFromScript = useCallback((scriptCode: string) => {
    const {config, isDynamic} = scriptToHttpConfig(scriptCode);
    setIsDynamicScript(isDynamic);
    setHttpConfig(prev => ({
      ...prev,
      ...config
    }));
  }, []);

  const handleConfigChange = useCallback((changes: Partial<K6TestConfig>) => {
    const newConfig = {...httpConfig, ...changes};
    setHttpConfig(newConfig);

    const hasNonNameChanges = Object.keys(changes).some(key => key !== 'name');

    if (hasNonNameChanges) {
      updateScriptFromConfig(newConfig);
    }
  }, [httpConfig, updateScriptFromConfig]);

  const handleScriptChange = useCallback((newScript: string) => {
    setScript(newScript);
    updateConfigFromScript(newScript);
  }, [updateConfigFromScript]);

  return {
    script,
    httpConfig,
    isDynamicScript,
    setScript,
    setHttpConfig,
    setIsDynamicScript,
    handleConfigChange,
    handleScriptChange,
    updateConfigFromScript
  };
};
