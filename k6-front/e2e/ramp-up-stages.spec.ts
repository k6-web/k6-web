import {expect, test} from '@playwright/test';
import {mockApi} from './helpers/mock-api';
import {sampleFolders, sampleScripts, checkoutScript} from './fixtures/folders';

/**
 * Generated scripts insert a 1s transition stage before every target change so
 * the Quick Start rows read as "hold this target for N seconds". Parsing has to
 * collapse those again, otherwise stages multiply on every round-trip.
 */
const readStages = async (page: import('@playwright/test').Page) => {
  const durations = await page.getByLabel('Duration (seconds)').all();
  const targets = await page.getByLabel('Target VUs').all();

  return Promise.all(
    durations.map(async (duration, index) => ({
      duration: await duration.inputValue(),
      target: await targets[index].inputValue()
    }))
  );
};

test.describe('Ramp-up stages', () => {
  test('stages survive a script round-trip', async ({page}) => {
    await mockApi(page, {folders: sampleFolders});
    await page.goto('/new-test');

    await page.getByLabel('Test Mode').selectOption('ramp-up');
    await expect(page.getByLabel('Target VUs').first()).toBeVisible();

    const before = await readStages(page);
    expect(before).toEqual([
      {duration: '30', target: '10'},
      {duration: '60', target: '10'},
      {duration: '30', target: '0'}
    ]);

    // Touching the script forces a re-parse of the generated stages.
    const editor = page.locator('textarea').last();
    await editor.fill(`${await editor.inputValue()}\n`);
    await expect(page.getByLabel('Target VUs').first()).toBeVisible();

    expect(await readStages(page)).toEqual(before);
  });

  test('editing an existing script shows collapsed hold stages', async ({page}) => {
    const rampScript = `import http from 'k6/http';

export const options = {
  scenarios: {
    test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1s', target: 20 },
        { duration: '45s', target: 20 },
        { duration: '1s', target: 0 },
        { duration: '10s', target: 0 },
      ],
    },
  },
};

export default function () {
  http.get('https://example.com');
}
`;

    await mockApi(page, {
      folders: sampleFolders,
      scripts: [{...sampleScripts[0], script: rampScript}]
    });
    await page.goto(`/scripts/${checkoutScript.scriptId}?edit=true`);
    await expect(page.getByLabel('Target VUs').first()).toBeVisible();

    expect(await readStages(page)).toEqual([
      {duration: '45', target: '20'},
      {duration: '10', target: '0'}
    ]);
  });

  test('shows the real total runtime including transitions', async ({page}) => {
    await mockApi(page, {folders: sampleFolders});
    await page.goto('/new-test');

    await page.getByLabel('Test Mode').selectOption('ramp-up');

    // 120s of holds plus two 1s transitions.
    await expect(page.getByText(/Total 122s/)).toBeVisible();
  });
});
