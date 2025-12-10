import {Link, Outlet} from 'react-router-dom';

export const Layout = () => {
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
            }}>Tests</Link>
            <Link to="/folders" style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
            }}>Scripts</Link>
            <Link to="/new-test" style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
            }}>New Test</Link>
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
