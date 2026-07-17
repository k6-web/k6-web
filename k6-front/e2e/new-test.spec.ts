import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {checkoutFolder, sampleFolders} from './fixtures/folders';

test.describe('New test', () => {
  test('runs a quick start test and navigates to the detail page', async ({page}) => {
    const state = await mockApi(page);
    await page.goto('/new-test');

    await page.getByRole('button', {name: /Start Load Test/}).click();
    await expect(page.getByRole('heading', {name: 'Test Name (optional)'})).toBeVisible();
    await page.getByPlaceholder('e.g., Homepage Load Test').fill('Quick start smoke test');
    await page.getByRole('button', {name: 'Start', exact: true}).click();

    await expect(page).toHaveURL(/\/tests\/test-created-\d+$/);
    expect(state.tests[0].name).toBe('Quick start smoke test');
  });

  test('saves the script to a folder and runs it', async ({page}) => {
    const state = await mockApi(page, {folders: sampleFolders});
    await page.goto('/new-test');

    await page.getByText('Save as Reusable Script').click();
    await page
      .locator('select')
      .filter({hasText: 'Select a folder...'})
      .selectOption({label: checkoutFolder.name});
    await page.getByRole('button', {name: /Save Script & Run Test/}).click();
    await page.getByRole('button', {name: 'Start', exact: true}).click();

    await expect(page).toHaveURL(/\/tests\/test-created-\d+$/);
    expect(state.scripts).toHaveLength(1);
    expect(state.scripts[0].folderId).toBe(checkoutFolder.folderId);
    expect(state.tests[0].scriptId).toBe(state.scripts[0].scriptId);
  });

  test('saves the script only and navigates to the script detail page', async ({page}) => {
    const state = await mockApi(page, {folders: sampleFolders});
    await page.goto('/new-test');

    await page.getByText('Save as Reusable Script').click();
    await page
      .locator('select')
      .filter({hasText: 'Select a folder...'})
      .selectOption({label: checkoutFolder.name});
    await page.getByRole('button', {name: /Save Script Only/}).click();

    await expect(page).toHaveURL(/\/scripts\/script-created-\d+$/);
    expect(state.tests).toHaveLength(0);
    await expect(page.getByRole('heading', {name: state.scripts[0].scriptId})).toBeVisible();
  });
});
