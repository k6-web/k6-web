import {Link, Outlet} from 'react-router-dom';
import {useTranslation} from 'react-i18next';

export const Layout = () => {
  const {t, i18n} = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
      <header style={{
        backgroundColor: '#282c34',
        padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 4vw, 2rem)',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <nav style={{
          display: 'flex',
          gap: 'clamp(1rem, 3vw, 2rem)',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            gap: 'clamp(1rem, 3vw, 2rem)',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
              whiteSpace: 'nowrap'
            }}>K6 Web</h1>
            <div style={{
              display: 'flex',
              gap: 'clamp(0.75rem, 3vw, 1.5rem)',
              flexWrap: 'wrap'
            }}>
              <Link to="/" style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)'
              }}>{t('nav.scripts')}</Link>
              <Link to="/new-test" style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)'
              }}>{t('nav.newTest')}</Link>
              <Link to="/tests" style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)'
              }}>{t('nav.tests')}</Link>
            </div>
          </div>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <button
              onClick={() => changeLanguage('en')}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: i18n.language === 'en' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: '1px solid white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                fontWeight: i18n.language === 'en' ? 'bold' : 'normal'
              }}
            >
              English
            </button>
            <button
              onClick={() => changeLanguage('ko')}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: i18n.language === 'ko' ? '#3b82f6' : 'transparent',
                color: 'white',
                border: '1px solid white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                fontWeight: i18n.language === 'ko' ? 'bold' : 'normal'
              }}
            >
              한국어
            </button>
          </div>
        </nav>
      </header>
      <main style={{
        flex: 1,
        padding: 'clamp(1rem, 3vw, 2rem)',
        backgroundColor: '#f5f5f5'
      }}>
        <Outlet/>
      </main>
    </div>
  );
};
