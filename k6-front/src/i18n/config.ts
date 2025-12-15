import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ko from './locales/ko.json';

const LANGUAGE_KEY = 'k6-web-language';
const defaultLanguage = import.meta.env.VITE_DEFAULT_LANGUAGE || 'ko';
const savedLanguage = localStorage.getItem(LANGUAGE_KEY) || defaultLanguage;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANGUAGE_KEY, lng);
});

export default i18n;
export { LANGUAGE_KEY };
