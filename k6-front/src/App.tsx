import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TestList } from './pages/TestList';
import { TestDetail } from './pages/TestDetail';
import { NewTest } from './pages/NewTest';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tests" element={<TestList />} />
        <Route path="tests/:testId" element={<TestDetail />} />
        <Route path="new-test" element={<NewTest />} />
      </Route>
    </Routes>
  );
}

export default App;
