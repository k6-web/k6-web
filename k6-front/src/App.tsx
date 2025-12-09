import {Route, Routes} from 'react-router-dom';
import {Layout} from './components/Layout';
import {TestList} from './pages/TestList';
import {TestDetail} from './pages/TestDetail';
import {NewTest} from './pages/NewTest';
import {ScriptList} from './pages/ScriptList';
import {ScriptDetail} from './pages/ScriptDetail';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout/>}>
        <Route path="/" element={<TestList/>}/>
        <Route path="tests/:testId" element={<TestDetail/>}/>
        <Route path="new-test" element={<NewTest/>}/>
        <Route path="scripts" element={<ScriptList/>}/>
        <Route path="scripts/:scriptId" element={<ScriptDetail/>}/>
      </Route>
    </Routes>
  );
}

export default App;
