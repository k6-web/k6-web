import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {completedTest, failedTest} from './fixtures/tests';

test.describe('Test detail', () => {
  test('renders summary metrics and script for a completed test', async ({page}) => {
    await mockApi(page, {tests: [completedTest]});
    await page.goto(`/tests/${completedTest.testId}`);

    await expect(page.getByText(completedTest.name!).first()).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Test Result (summary)'})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Script', exact: true})).toBeVisible();
  });

  test('renders error logs for a failed test', async ({page}) => {
    await mockApi(page, {tests: [failedTest]});
    await page.goto(`/tests/${failedTest.testId}`);

    await expect(page.getByText('connection refused')).toBeVisible();
  });

  test('shows not-found message for an unknown test id', async ({page}) => {
    await mockApi(page, {tests: []});
    await page.goto('/tests/does-not-exist');

    await expect(page.getByText(/Error:|Test not found/)).toBeVisible();
  });
});
