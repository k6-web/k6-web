import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {sampleFolders} from './fixtures/folders';

/**
 * Quick Start edits that touch the request body regenerate the whole script.
 * These tests pin the guard that stops that from silently discarding
 * hand-written code.
 */
const HAND_WRITTEN = `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: { test: { executor: 'constant-vus', vus: 1, duration: '30s' } },
};

const MY_TOKEN = 'abc-123';

export default function () {
  const res = http.get('https://example.com', { headers: { Authorization: MY_TOKEN } });
  check(res, {'ok': (r) => r.status === 200});
  sleep(1);
}
`;

const openWithHandWrittenScript = async (page: import('@playwright/test').Page) => {
  await mockApi(page, {folders: sampleFolders});
  await page.goto('/new-test');

  const editor = page.locator('textarea').last();
  await editor.fill(HAND_WRITTEN);
  await expect(editor).toHaveValue(/MY_TOKEN/);

  return editor;
};

test.describe('New test script safety', () => {
  test('options-only edits never prompt and never clobber', async ({page}) => {
    const editor = await openWithHandWrittenScript(page);

    await page.getByLabel('Virtual Users').fill('5');
    await expect(editor).toHaveValue(/vus: 5/);

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(editor).toHaveValue(/MY_TOKEN/);
    await expect(editor).toHaveValue(/sleep\(1\)/);
  });

  test('body edits prompt, and cancelling preserves the script', async ({page}) => {
    const editor = await openWithHandWrittenScript(page);

    await page.getByLabel('Target URL').fill('https://other.example.com/api');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', {name: 'Cancel'}).click();

    await expect(dialog).toHaveCount(0);
    await expect(editor).toHaveValue(/MY_TOKEN/);
  });

  test('confirming the prompt regenerates the script', async ({page}) => {
    const editor = await openWithHandWrittenScript(page);

    await page.getByLabel('Target URL').fill('https://other.example.com/api');
    await page.getByRole('dialog').getByRole('button', {name: 'Regenerate'}).click();

    await expect(editor).toHaveValue(/other\.example\.com/);
    await expect(editor).not.toHaveValue(/MY_TOKEN/);
  });
});
