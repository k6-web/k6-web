import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {checkoutFolder, paymentFolder, sampleFolders} from './fixtures/folders';

test.describe('Folder list', () => {
  test('renders folder cards', async ({page}) => {
    await mockApi(page, {folders: sampleFolders});
    await page.goto('/folders');

    await expect(page.getByRole('heading', {name: 'Script Folders'})).toBeVisible();
    await expect(page.getByText(checkoutFolder.name)).toBeVisible();
    await expect(page.getByText(checkoutFolder.description!)).toBeVisible();
    await expect(page.getByText(paymentFolder.name)).toBeVisible();
  });

  test('creates a folder through the modal', async ({page}) => {
    await mockApi(page, {folders: []});
    await page.goto('/folders');

    await page.getByRole('button', {name: 'Create your first folder'}).click();
    await page.getByPlaceholder('Enter folder name').fill('Search APIs');
    await page.getByRole('button', {name: 'Create', exact: true}).click();

    await expect(page.getByText('Search APIs')).toBeVisible();
    await expect(page.getByText('No folders found.')).not.toBeVisible();
  });

  test('deletes a folder after confirming the dialog', async ({page}) => {
    await mockApi(page, {folders: [checkoutFolder]});
    await page.goto('/folders');

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', {name: 'Delete'}).click();

    await expect(page.getByText('No folders found.')).toBeVisible();
  });
});
