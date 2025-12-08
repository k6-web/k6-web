import {useState, useEffect} from 'react';

export const useTooltip = (showDelay: number = 300, hideDuration: number = 5000) => {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowTooltip(true);
    }, showDelay);

    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
    }, showDelay + hideDuration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [showDelay, hideDuration]);

  return showTooltip;
};
