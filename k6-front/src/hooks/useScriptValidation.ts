import {useState, useCallback} from 'react';
import {validateScript} from '../utils/scriptUtils';

export const useScriptValidation = () => {
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  const validate = useCallback((code: string): boolean => {
    const result = validateScript(code);
    setSyntaxError(result.error);
    return result.valid;
  }, []);

  return {syntaxError, validate};
};
