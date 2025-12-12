import {Route, Routes} from 'react-router-dom';
import {Layout} from './components/Layout';
import {TestList} from './pages/TestList';
import {TestDetail} from './pages/TestDetail';
import {NewTest} from './pages/NewTest';
import {ScriptDetail} from './pages/ScriptDetail';
import {FolderList} from './pages/FolderList';
import {FolderDetail} from './pages/FolderDetail';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout/>}>
        <Route path="" element={<FolderList/>}/>
        <Route path="tests" element={<TestList/>}/>
        <Route path="tests/:testId" element={<TestDetail/>}/>
        <Route path="new-test" element={<NewTest/>}/>
        <Route path="scripts/:scriptId" element={<ScriptDetail/>}/>
        <Route path="/folders" element={<FolderList/>}/>
        <Route path="folders/:folderId" element={<FolderDetail/>}/>
      </Route>
    </Routes>
  );
}

export default App;
