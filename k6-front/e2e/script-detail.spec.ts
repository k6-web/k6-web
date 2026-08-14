import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {checkoutFolder, checkoutScript, sampleFolders, sampleScripts} from './fixtures/folders';
import {makeCompletedTests} from './fixtures/tests';

test.describe('Script detail', () => {
  test('renders script info with run history', async ({page}) => {
    const history = makeCompletedTests(2, {scriptId: checkoutScript.scriptId});
    await mockApi(page, {scripts: sampleScripts, folders: sampleFolders, tests: history});
    await page.goto(`/scripts/${checkoutScript.scriptId}`);

    await expect(page.getByRole('heading', {name: checkoutScript.scriptId})).toBeVisible();
    await expect(page.getByText(checkoutScript.description!)).toBeVisible();
    await expect(page.getByText('checkout', {exact: true})).toBeVisible();
    await expect(page.getByText("import http from 'k6/http'")).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Test History (2)'})).toBeVisible();
    await expect(page.getByText('Generated test #1')).toBeVisible();
  });

  test('runs the script through the name modal', async ({page}) => {
    await mockApi(page, {scripts: sampleScripts, folders: sampleFolders});
    await page.goto(`/scripts/${checkoutScript.scriptId}`);

    await page.getByRole('button', {name: 'Run Test'}).click();
    await page.getByPlaceholder('e.g., Homepage Load Test').fill('Run from script detail');
    await page.getByRole('button', {name: 'Start', exact: true}).click();

    await expect(page).toHaveURL(/\/tests\/test-created-\d+$/);
  });

  test('updates the description through edit mode', async ({page}) => {
    await mockApi(page, {scripts: sampleScripts, folders: sampleFolders});
    await page.goto(`/scripts/${checkoutScript.scriptId}`);

    await page.getByRole('button', {name: 'Edit Script'}).click();
    await page.locator('textarea').first().fill('Updated checkout description');
    await page.getByRole('button', {name: 'Save', exact: true}).click();

    await expect(page.getByText('Updated checkout description')).toBeVisible();
  });

  test('deletes the script and navigates back to its folder', async ({page}) => {
    const state = await mockApi(page, {scripts: sampleScripts, folders: sampleFolders});
    await page.goto(`/scripts/${checkoutScript.scriptId}`);

    await page.getByRole('button', {name: /Delete Script/}).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', {name: 'Delete', exact: true}).click();

    await expect(page).toHaveURL(`/folders/${checkoutFolder.folderId}`);
    expect(state.scripts).toHaveLength(0);
  });
});
