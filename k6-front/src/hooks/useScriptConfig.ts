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
    name: ''
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

    const {name, ...otherChanges} = changes;
    const hasNonNameChanges = Object.keys(otherChanges).length > 0;

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
    handleConfigChange,
    handleScriptChange,
    updateConfigFromScript
  };
};
