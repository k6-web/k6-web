import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {checkoutScript, sampleScripts} from './fixtures/folders';

test.describe('Script list', () => {
  test('renders script cards', async ({page}) => {
    await mockApi(page, {scripts: sampleScripts});
    await page.goto('/scripts');

    await expect(page.getByRole('heading', {name: checkoutScript.scriptId})).toBeVisible();
    await expect(page.getByText('checkout', {exact: true})).toBeVisible();
  });

  test('runs a script from its card', async ({page}) => {
    await mockApi(page, {scripts: sampleScripts});
    await page.goto('/scripts');

    await page.getByRole('button', {name: 'Run', exact: true}).click();
    await expect(page.getByPlaceholder('e.g., Homepage Load Test')).toHaveValue(
      `[${checkoutScript.scriptId}] Test Run`,
    );
    await page.getByRole('button', {name: 'Start', exact: true}).click();

    await expect(page).toHaveURL(/\/tests\/test-created-\d+$/);
  });

  test('deletes a script after confirming the dialog', async ({page}) => {
    const state = await mockApi(page, {scripts: sampleScripts});
    await page.goto('/scripts');

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', {name: 'Delete', exact: true}).click();

    await expect(page.getByText('No scripts in this folder.')).toBeVisible();
    expect(state.scripts).toHaveLength(0);
  });
});
