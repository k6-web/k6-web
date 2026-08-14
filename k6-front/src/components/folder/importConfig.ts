import type {K6RampUpStage, K6TestConfig} from '../../types/k6';

export type ImportConfig = Pick<
  K6TestConfig,
  'template' | 'vusers' | 'duration' | 'rampUp' | 'stages' | 'targetTps' | 'preAllocatedVUs' | 'maxVUs' | 'failureThreshold'
>;

export const DEFAULT_STAGES: K6RampUpStage[] = [
  {duration: 30, target: 10},
  {duration: 60, target: 10},
  {duration: 30, target: 0}
];

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  template: 'constant-vus',
  vusers: 1,
  duration: 30,
  rampUp: 30,
  stages: DEFAULT_STAGES,
  targetTps: 10,
  preAllocatedVUs: 10,
  maxVUs: 20,
  failureThreshold: 0.05
};
