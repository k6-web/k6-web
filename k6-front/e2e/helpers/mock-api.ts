import type {Page, Route} from '@playwright/test';
import type {Test} from '../../src/types/test';
import type {Folder, Script} from '../../src/types/script';

export interface MockApiState {
  tests: Test[];
  folders: Folder[];
  scripts: Script[];
}

// The front calls the agent at http://localhost:3000 (cross-origin from the
// preview server), so every fulfilled response needs CORS headers and OPTIONS
// preflights must be answered.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': '*',
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    headers: CORS_HEADERS,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

/**
 * Intercepts every /v1/** request with an in-memory implementation of the
 * k6-agent API. Mutating endpoints update `state`, so create/delete flows
 * are reflected in subsequent list calls. Unhandled endpoints return 404 so
 * missing mocks fail loudly instead of hanging.
 *
 * Tests created via run endpoints get status 'queued' (not 'running') so the
 * detail page does not open an SSE stream, which the mock does not serve.
 */
export const mockApi = async (page: Page, initial: Partial<MockApiState> = {}): Promise<MockApiState> => {
  const state: MockApiState = {
    tests: initial.tests ? [...initial.tests] : [],
    folders: initial.folders ? [...initial.folders] : [],
    scripts: initial.scripts ? [...initial.scripts] : [],
  };
  let sequence = 0;

  const enqueueTest = (script: string, name?: string, scriptId?: string): Test => {
    const test: Test = {
      testId: `test-created-${++sequence}`,
      name,
      scriptId,
      status: 'queued',
      startTime: Date.now(),
      queuedAt: Date.now(),
      script,
    };
    state.tests.unshift(test);
    return test;
  };

  const createScript = (folderId: string | undefined, body: Partial<Script> & {script: string}): Script => {
    const script: Script = {
      scriptId: body.scriptId || `script-created-${++sequence}`,
      script: body.script,
      config: body.config,
      description: body.description,
      tags: body.tags,
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.scripts.push(script);
    return script;
  };

  await page.route('**/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const {pathname} = url;

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS});
    }

    if (pathname === '/v1/tests' && method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? 100);
      const cursor = Number(url.searchParams.get('cursor') ?? 0);
      const pageTests = state.tests.slice(cursor, cursor + limit);
      const nextCursor = cursor + limit < state.tests.length ? cursor + limit : null;
      return json(route, {tests: pageTests, pagination: {nextCursor, hasMore: nextCursor !== null}});
    }
    if (pathname === '/v1/tests' && method === 'POST') {
      const contentType = request.headers()['content-type'] ?? '';
      const body = contentType.includes('application/json')
        ? (request.postDataJSON() as {script: string; name?: string; scriptId?: string})
        : {script: request.postData() ?? ''};
      const test = enqueueTest(body.script, body.name, body.scriptId);
      return json(route, {testId: test.testId, status: test.status});
    }

    const testMatch = pathname.match(/^\/v1\/tests\/([^/]+)$/);
    if (testMatch && method === 'GET') {
      const test = state.tests.find(({testId}) => testId === testMatch[1]);
      return test ? json(route, test) : json(route, {error: 'Test not found'}, 404);
    }
    if (testMatch && method === 'DELETE') {
      state.tests = state.tests.filter(({testId}) => testId !== testMatch[1]);
      return json(route, {message: 'Test deleted'});
    }

    if (pathname === '/v1/folders' && method === 'GET') {
      return json(route, {folders: state.folders});
    }
    if (pathname === '/v1/folders' && method === 'POST') {
      const body = request.postDataJSON() as {name: string; description?: string};
      const folder: Folder = {
        folderId: `folder-created-${++sequence}`,
        name: body.name,
        description: body.description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.folders.push(folder);
      return json(route, folder, 201);
    }

    const folderMatch = pathname.match(/^\/v1\/folders\/([^/]+)$/);
    if (folderMatch && method === 'GET') {
      const folder = state.folders.find(({folderId}) => folderId === folderMatch[1]);
      if (!folder) return json(route, {error: 'Folder not found'}, 404);
      const scripts = state.scripts.filter(({folderId}) => folderId === folder.folderId);
      return json(route, {folder, scripts, scriptCount: scripts.length});
    }
    if (folderMatch && method === 'PUT') {
      const folder = state.folders.find(({folderId}) => folderId === folderMatch[1]);
      if (!folder) return json(route, {error: 'Folder not found'}, 404);
      Object.assign(folder, request.postDataJSON(), {updatedAt: Date.now()});
      return json(route, folder);
    }
    if (folderMatch && method === 'DELETE') {
      state.folders = state.folders.filter(({folderId}) => folderId !== folderMatch[1]);
      return json(route, {message: 'Folder deleted'});
    }

    const folderScriptsMatch = pathname.match(/^\/v1\/folders\/([^/]+)\/scripts$/);
    if (folderScriptsMatch && method === 'POST') {
      const body = request.postDataJSON() as Partial<Script> & {script: string};
      return json(route, createScript(folderScriptsMatch[1], body), 201);
    }

    const folderScriptMatch = pathname.match(/^\/v1\/folders\/([^/]+)\/scripts\/([^/]+)$/);
    if (folderScriptMatch && method === 'PUT') {
      const script = state.scripts.find(({scriptId}) => scriptId === folderScriptMatch[2]);
      if (!script) return json(route, {error: 'Script not found'}, 404);
      Object.assign(script, request.postDataJSON(), {updatedAt: Date.now()});
      return json(route, script);
    }
    if (folderScriptMatch && method === 'DELETE') {
      state.scripts = state.scripts.filter(({scriptId}) => scriptId !== folderScriptMatch[2]);
      return json(route, {message: 'Script deleted'});
    }

    const runAllMatch = pathname.match(/^\/v1\/folders\/([^/]+)\/run-all$/);
    if (runAllMatch && method === 'POST') {
      const scripts = state.scripts.filter(({folderId}) => folderId === runAllMatch[1]);
      const testIds = scripts.map((script) => enqueueTest(script.script, undefined, script.scriptId).testId);
      return json(route, {testIds, message: 'All scripts queued', count: testIds.length});
    }

    if (pathname === '/v1/scripts' && method === 'GET') {
      return json(route, {scripts: state.scripts});
    }
    if (pathname === '/v1/scripts' && method === 'POST') {
      const body = request.postDataJSON() as Partial<Script> & {script: string; folderId?: string};
      return json(route, createScript(body.folderId, body), 201);
    }

    const scriptRunMatch = pathname.match(/^\/v1\/scripts\/([^/]+)\/run$/);
    if (scriptRunMatch && method === 'POST') {
      const script = state.scripts.find(({scriptId}) => scriptId === scriptRunMatch[1]);
      if (!script) return json(route, {error: 'Script not found'}, 404);
      const options = (request.postData() ? request.postDataJSON() : {}) as {name?: string};
      const test = enqueueTest(script.script, options.name, script.scriptId);
      return json(route, {testId: test.testId, status: test.status});
    }

    const scriptHistoryMatch = pathname.match(/^\/v1\/scripts\/([^/]+)\/history$/);
    if (scriptHistoryMatch && method === 'GET') {
      const tests = state.tests.filter(({scriptId}) => scriptId === scriptHistoryMatch[1]);
      return json(route, {scriptId: scriptHistoryMatch[1], tests, count: tests.length});
    }

    const scriptMatch = pathname.match(/^\/v1\/scripts\/([^/]+)$/);
    if (scriptMatch && method === 'GET') {
      const script = state.scripts.find(({scriptId}) => scriptId === scriptMatch[1]);
      return script ? json(route, script) : json(route, {error: 'Script not found'}, 404);
    }
    if (scriptMatch && method === 'DELETE') {
      state.scripts = state.scripts.filter(({scriptId}) => scriptId !== scriptMatch[1]);
      return json(route, {message: 'Script deleted'});
    }

    return json(route, {error: `No mock for ${method} ${pathname}`}, 404);
  });

  return state;
};

/** Makes every /v1/** request fail with the given status, for error-state tests. */
export const mockApiFailure = async (page: Page, status = 500) => {
  await page.route('**/v1/**', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({status: 204, headers: CORS_HEADERS})
      : json(route, {error: 'Internal server error'}, status),
  );
};
