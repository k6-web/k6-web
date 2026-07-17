import {expect, test} from '@playwright/test';
import {mockApi, mockApiFailure} from './helpers/mock-api';
import {completedTest, failedTest, makeCompletedTests, sampleTests} from './fixtures/tests';

test.describe('Test list', () => {
  test('renders test history with summary metrics', async ({page}) => {
    await mockApi(page, {tests: sampleTests});
    await page.goto('/');

    await expect(page.getByRole('heading', {name: 'Test History'})).toBeVisible();

    const completedRow = page.getByRole('row').filter({hasText: completedTest.testId});
    await expect(completedRow.getByText(completedTest.name!)).toBeVisible();
    await expect(completedRow.getByText('completed', {exact: true})).toBeVisible();
    await expect(completedRow.getByText('201')).toBeVisible(); // TPS (rate 200.5 rounded)
    await expect(completedRow.getByText('48.20ms')).toBeVisible(); // avg latency
    await expect(completedRow.getByText('99.5%')).toBeVisible(); // checks success rate

    const failedRow = page.getByRole('row').filter({hasText: failedTest.testId});
    await expect(failedRow.getByText('failed', {exact: true})).toBeVisible();
  });

  test('shows empty state when there are no tests', async ({page}) => {
    await mockApi(page, {tests: []});
    await page.goto('/');

    await expect(page.getByText('No tests found.')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Create your first test'})).toBeVisible();
  });

  test('shows error state when the API fails', async ({page}) => {
    await mockApiFailure(page);
    await page.goto('/');

    await expect(page.getByText(/Error:/)).toBeVisible();
  });

  test('navigates to the test detail page from a row link', async ({page}) => {
    await mockApi(page, {tests: sampleTests});
    await page.goto('/');

    await page.getByRole('link', {name: completedTest.name!}).click();

    await expect(page).toHaveURL(`/tests/${completedTest.testId}`);
    await expect(page.getByText(completedTest.name!).first()).toBeVisible();
  });

  test('re-runs a completed test through the name modal', async ({page}) => {
    const state = await mockApi(page, {tests: sampleTests});
    await page.goto('/');

    const completedRow = page.getByRole('row').filter({hasText: completedTest.testId});
    await completedRow.getByRole('button', {name: 'Re-run'}).click();

    await expect(page.getByPlaceholder('e.g., Homepage Load Test')).toHaveValue(completedTest.name!);
    await page.getByRole('button', {name: 'Start', exact: true}).click();

    await expect(page).toHaveURL(/\/tests\/test-created-\d+$/);
    expect(state.tests[0].script).toBe(completedTest.script);
  });

  test('compares selected tests with summary results', async ({page}) => {
    await mockApi(page, {tests: makeCompletedTests(3)});
    await page.goto('/');

    await expect(page.getByText(/0\/5 selected/)).toBeVisible();

    const checkboxes = page.getByRole('checkbox', {name: 'Select test for comparison'});
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await expect(page.getByText(/2\/5 selected/)).toBeVisible();
    await expect(page.getByText('Summary Metric Comparison')).toBeVisible();
  });

  test('loads the next page when scrolling to the bottom', async ({page}) => {
    await mockApi(page, {tests: makeCompletedTests(35)});
    await page.goto('/');

    await expect(page.getByText('test-gen-001')).toBeVisible();
    await expect(page.getByText('test-gen-031')).not.toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    await expect(page.getByText('test-gen-031')).toBeVisible();
    await expect(page.getByText('All tests loaded')).toBeVisible();
  });
});
