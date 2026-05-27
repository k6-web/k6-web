import {Link, NavLink, Outlet, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

export const Layout = () => {
  const {t, i18n} = useTranslation();
  const {pathname} = useLocation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const isTestsActive = pathname === '/' || pathname.startsWith('/tests');
  const isScriptsActive = pathname.startsWith('/folders') || pathname.startsWith('/scripts');

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="topbar__nav" aria-label="Main navigation">
          <div className="topbar__primary">
            <Link to="/" className="topbar__brand" aria-label="K6 Web home">
              <span className="topbar__brand-mark">K6</span>
              <span className="topbar__brand-text">
                <span>K6 Web</span>
                <small>Load test console</small>
              </span>
            </Link>

            <div className="topbar__links">
              <NavLink
                to="/tests"
                className={`topbar__link${isTestsActive ? ' topbar__link--active' : ''}`}
              >
                {t('nav.tests')}
              </NavLink>
              <NavLink
                to="/new-test"
                className={({isActive}) => `topbar__link topbar__link--primary${isActive ? ' topbar__link--active' : ''}`}
              >
                {t('nav.newTest')}
              </NavLink>
              <NavLink
                to="/folders"
                className={`topbar__link${isScriptsActive ? ' topbar__link--active' : ''}`}
              >
                {t('nav.scripts')}
              </NavLink>
            </div>
          </div>

          <div className="topbar__language" aria-label="Language selector">
            <button
              onClick={() => changeLanguage('en')}
              className={`topbar__language-button${i18n.language === 'en' ? ' topbar__language-button--active' : ''}`}
              type="button"
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('ko')}
              className={`topbar__language-button${i18n.language === 'ko' ? ' topbar__language-button--active' : ''}`}
              type="button"
            >
              KO
            </button>
          </div>
        </nav>
      </header>
      <main className="app-main">
        <Outlet/>
      </main>
    </div>
  );
};
