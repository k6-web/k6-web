import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {checkoutFolder, checkoutScript, paymentFolder, sampleFolders, sampleScripts} from './fixtures/folders';

test.describe('Folder detail', () => {
  test('renders the folder with its scripts', async ({page}) => {
    await mockApi(page, {folders: sampleFolders, scripts: sampleScripts});
    await page.goto(`/folders/${checkoutFolder.folderId}`);

    await expect(page.getByRole('heading', {name: checkoutFolder.name})).toBeVisible();
    await expect(page.getByText('1 script in this folder')).toBeVisible();
    await expect(page.getByText(checkoutScript.scriptId)).toBeVisible();
    await expect(page.getByRole('button', {name: 'Run All Scripts'})).toBeVisible();
  });

  test('shows empty state for a folder without scripts', async ({page}) => {
    await mockApi(page, {folders: [paymentFolder]});
    await page.goto(`/folders/${paymentFolder.folderId}`);

    await expect(page.getByText('No scripts in this folder.')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Create your first script'})).toBeVisible();
  });

  test('runs a single script from the table', async ({page}) => {
    await mockApi(page, {folders: sampleFolders, scripts: sampleScripts});
    await page.goto(`/folders/${checkoutFolder.folderId}`);

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', {name: 'Run', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Test Name (optional)'})).toBeVisible();
    await page.getByRole('button', {name: 'Start', exact: true}).click();

    await expect(page).toHaveURL(/\/tests\/test-created-\d+$/);
  });

  test('runs all scripts in the folder', async ({page}) => {
    const state = await mockApi(page, {folders: sampleFolders, scripts: sampleScripts});
    await page.goto(`/folders/${checkoutFolder.folderId}`);

    page.on('dialog', (dialog) => dialog.accept());
    const runAllResponse = page.waitForResponse(
      (response) => response.url().includes('/run-all') && response.request().method() === 'POST',
    );
    await page.getByRole('button', {name: 'Run All Scripts'}).click();
    await expect(page.getByRole('heading', {name: 'Schedule Run'})).toBeVisible();
    await page.getByRole('button', {name: 'Start', exact: true}).click();

    await runAllResponse;
    expect(state.tests).toHaveLength(1);
    expect(state.tests[0].scriptId).toBe(checkoutScript.scriptId);
  });
});
