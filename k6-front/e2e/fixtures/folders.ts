import type {Folder, Script} from '../../src/types/script';
import {sampleScriptContent} from './tests';

const BASE_TIME = Date.UTC(2026, 6, 1, 9, 0, 0);

export const checkoutFolder: Folder = {
  folderId: 'folder-checkout',
  name: 'Checkout APIs',
  description: 'Load test scripts for the checkout flow',
  createdAt: BASE_TIME,
  updatedAt: BASE_TIME + 86_400_000,
};

export const paymentFolder: Folder = {
  folderId: 'folder-payment',
  name: 'Payment APIs',
  description: 'Payment gateway stress tests',
  createdAt: BASE_TIME,
  updatedAt: BASE_TIME,
};

export const sampleFolders: Folder[] = [checkoutFolder, paymentFolder];

export const checkoutScript: Script = {
  scriptId: 'script-checkout-001',
  script: sampleScriptContent,
  createdAt: BASE_TIME,
  updatedAt: BASE_TIME,
  description: 'Checkout smoke script',
  tags: ['checkout', 'smoke'],
  folderId: checkoutFolder.folderId,
};

export const sampleScripts: Script[] = [checkoutScript];
