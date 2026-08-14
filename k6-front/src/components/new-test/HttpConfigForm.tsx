import {useTranslation} from 'react-i18next';
import {useState} from 'react';
import type {K6ScriptTemplate, K6TestConfig} from '../../types/k6';
import {RAMP_TRANSITION_SECONDS} from '../../utils/scriptUtils';
import {Button, Collapsible, Field, InfoBox, useToast} from '../common';
import styles from './HttpConfigForm.module.css';

const DEFAULT_STAGES = [
  {duration: 30, target: 10},
  {duration: 60, target: 10},
  {duration: 30, target: 0}
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_METHODS = ['POST', 'PUT', 'PATCH'];

interface HttpConfigFormProps {
  config: K6TestConfig;
  isDynamic: boolean;
  headerKey: string;
  headerValue: string;
  onConfigChange: (config: Partial<K6TestConfig>) => void;
  onTemplateChange: (template: K6ScriptTemplate) => void;
  onConvertCurl: (curlCommand: string) => void;
  onImportPostman: (collection: unknown) => void;
  onHeaderKeyChange: (key: string) => void;
  onHeaderValueChange: (value: string) => void;
  onAddHeader: () => void;
  onRemoveHeader: (key: string) => void;
}

export const HttpConfigForm = ({
  config,
  isDynamic,
  headerKey,
  headerValue,
  onConfigChange,
  onTemplateChange,
  onConvertCurl,
  onImportPostman,
  onHeaderKeyChange,
  onHeaderValueChange,
  onAddHeader,
  onRemoveHeader
}: HttpConfigFormProps) => {
  const {t} = useTranslation();
  const toast = useToast();
  const [curlCommand, setCurlCommand] = useState('');

  const stages = config.stages && config.stages.length > 0 ? config.stages : DEFAULT_STAGES;
  const isConstantTps = config.template === 'constant-tps';
  const isRampUp = config.template === 'ramp-up';
  const isConstantVus = !isConstantTps && !isRampUp;

  const totalHoldSeconds = stages.reduce((total, stage) => total + (stage.duration || 0), 0);
  // A transition stage is generated whenever the target actually changes.
  const transitionCount = stages.reduce((count, stage, index) => {
    const previousTarget = index === 0 ? 0 : stages[index - 1].target;
    return stage.target === previousTarget ? count : count + 1;
  }, 0);

  const updateStage = (index: number, changes: Partial<(typeof stages)[number]>) => {
    onConfigChange({
      stages: stages.map((stage, stageIndex) => stageIndex === index ? {...stage, ...changes} : stage)
    });
  };

  const numberField = (
    label: string,
    value: number | undefined,
    onChange: (value: number) => void,
    extra?: {min?: number; max?: number; step?: number; required?: boolean; hint?: string; suffix?: string}
  ) => (
    <Field label={label} required={extra?.required} hint={extra?.hint} suffix={extra?.suffix}>
      <input
        type="number"
        required={extra?.required}
        min={extra?.min ?? 1}
        max={extra?.max}
        step={extra?.step}
        value={value}
        onChange={(e) => onChange(Number.parseInt(e.target.value))}
      />
    </Field>
  );

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('httpConfig.title')}</h2>

      <InfoBox variant={isDynamic ? 'warning' : 'info'}>
        {isDynamic ? t('httpConfig.dynamicScriptLockedFields') : t('httpConfig.dynamicScriptNote')}
      </InfoBox>

      <Collapsible title={t('httpConfig.importTools')} summary={t('httpConfig.importToolsSummary')}>
        <Field label={t('httpConfig.curlImport')}>
          <textarea
            value={curlCommand}
            disabled={isDynamic}
            onChange={(e) => setCurlCommand(e.target.value)}
            placeholder={t('httpConfig.curlPlaceholder')}
            rows={4}
            className={styles.mono}
          />
        </Field>
        <Button
          variant="purple"
          size="sm"
          onClick={() => onConvertCurl(curlCommand)}
          disabled={isDynamic || !curlCommand.trim()}
        >
          {t('httpConfig.convertCurl')}
        </Button>

        <div className={styles.importDivider}/>

        <Field label={t('httpConfig.postmanImport')} hint={t('httpConfig.postmanDescription')}>
          <input
            type="file"
            accept=".json,application/json"
            disabled={isDynamic}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                onImportPostman(JSON.parse(await file.text()));
              } catch {
                toast.error(t('httpConfig.invalidPostmanFile'));
              } finally {
                e.target.value = '';
              }
            }}
          />
        </Field>
      </Collapsible>

      <Field label={t('httpConfig.template')} hint={t('httpConfig.templateDescription')}>
        <select
          value={config.template || 'constant-vus'}
          onChange={(e) => onTemplateChange(e.target.value as K6ScriptTemplate)}
        >
          <option value="constant-vus">{t('httpConfig.templateConstantVus')}</option>
          <option value="constant-tps">{t('httpConfig.templateConstantTps')}</option>
          <option value="ramp-up">{t('httpConfig.templateRampUp')}</option>
        </select>
      </Field>

      <Field label={t('httpConfig.url')} required>
        <input
          type="url"
          required
          value={config.url}
          disabled={isDynamic}
          onChange={(e) => onConfigChange({url: e.target.value})}
          placeholder={t('httpConfig.urlPlaceholder')}
        />
      </Field>

      <Field label={t('httpConfig.method')}>
        <select
          value={config.method}
          disabled={isDynamic}
          onChange={(e) => onConfigChange({method: e.target.value})}
        >
          {HTTP_METHODS.map(method => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
      </Field>

      <fieldset className={styles.headerFieldset}>
        <legend className={styles.stagesLabel}>{t('httpConfig.headers')}</legend>

        <div className={styles.headerRow}>
          <input
            type="text"
            placeholder={t('httpConfig.headerKeyPlaceholder')}
            aria-label={t('httpConfig.headerKey')}
            value={headerKey}
            disabled={isDynamic}
            onChange={(e) => onHeaderKeyChange(e.target.value)}
          />
          <input
            type="text"
            placeholder={t('httpConfig.headerValuePlaceholder')}
            aria-label={t('httpConfig.headerValue')}
            value={headerValue}
            disabled={isDynamic}
            onChange={(e) => onHeaderValueChange(e.target.value)}
          />
          <Button variant="secondary" disabled={isDynamic} onClick={onAddHeader}>
            {t('httpConfig.addHeader')}
          </Button>
        </div>

        {config.headers && Object.keys(config.headers).length > 0 && (
          <div className={styles.headerList}>
            {Object.entries(config.headers).map(([key, value]) => (
              <div key={key} className={styles.headerItem}>
                <span className={styles.headerText}>
                  <strong>{key}:</strong> {value}
                </span>
                <Button
                  variant="danger"
                  appearance="outline"
                  size="sm"
                  disabled={isDynamic}
                  onClick={() => onRemoveHeader(key)}
                  aria-label={`${t('httpConfig.remove')} ${key}`}
                >
                  {t('httpConfig.remove')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {BODY_METHODS.includes(config.method) && (
        <Field label={t('httpConfig.requestBody')}>
          <textarea
            value={config.body as string}
            disabled={isDynamic}
            onChange={(e) => onConfigChange({body: e.target.value})}
            placeholder={t('httpConfig.requestBodyPlaceholder')}
            rows={10}
            className={styles.bodyInput}
          />
        </Field>
      )}

      <div className={styles.optionsGrid}>
        {isConstantVus && (
          <>
            {numberField(t('httpConfig.vusers'), config.vusers, v => onConfigChange({vusers: v}), {required: true})}
            {numberField(t('httpConfig.duration'), config.duration, v => onConfigChange({duration: v}), {required: true})}
          </>
        )}

        {isConstantTps && (
          <>
            {numberField(t('httpConfig.targetTps'), config.targetTps || 1, v => onConfigChange({targetTps: v}), {required: true})}
            {numberField(t('httpConfig.duration'), config.duration, v => onConfigChange({duration: v}), {required: true})}
            {numberField(t('httpConfig.preAllocatedVUs'), config.preAllocatedVUs || 1, v => onConfigChange({preAllocatedVUs: v}), {required: true})}
            {numberField(
              t('httpConfig.maxVUs'),
              config.maxVUs || config.preAllocatedVUs || 1,
              v => onConfigChange({maxVUs: v}),
              {required: true, min: config.preAllocatedVUs || 1}
            )}
          </>
        )}

        {isRampUp && (
          <div className={styles.fullRow}>
            <div className={styles.stagesHeader}>
              <span className={styles.stagesLabel}>{t('httpConfig.stages')}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onConfigChange({
                  stages: [...stages, {duration: 30, target: stages[stages.length - 1]?.target ?? 10}]
                })}
              >
                {t('httpConfig.addStage')}
              </Button>
            </div>

            <p className={styles.stagesHint}>{t('httpConfig.stagesHint')}</p>

            <div className={styles.stages}>
              {stages.map((stage, index) => {
                const previousTarget = index === 0 ? 0 : stages[index - 1].target;
                const delta = stage.target - previousTarget;
                const phase = delta > 0
                  ? t('httpConfig.stageRampUp')
                  : delta < 0
                    ? t('httpConfig.stageRampDown')
                    : t('httpConfig.stageHold');

                return (
                  <div key={index} className={styles.stageRow}>
                    <div className={styles.stageMeta}>
                      <span className={styles.stageIndex}>{index + 1}</span>
                      <span className={styles.stagePhase} data-delta={delta === 0 ? 'hold' : delta > 0 ? 'up' : 'down'}>
                        {phase}
                      </span>
                      <span className={styles.stageSummary}>
                        {t('httpConfig.stageSummary', {
                          from: previousTarget,
                          to: stage.target,
                          seconds: stage.duration
                        })}
                      </span>
                    </div>

                    <div className={styles.stage}>
                      {numberField(t('httpConfig.stageDuration'), stage.duration, v => updateStage(index, {duration: v}))}
                      {numberField(t('httpConfig.stageTarget'), stage.target, v => updateStage(index, {target: v}), {min: 0})}
                      <Button
                        variant="danger"
                        appearance="outline"
                        disabled={stages.length <= 1}
                        onClick={() => onConfigChange({
                          stages: stages.filter((_, stageIndex) => stageIndex !== index)
                        })}
                        aria-label={`${t('httpConfig.remove')} ${index + 1}`}
                      >
                        {t('httpConfig.remove')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.stagesTotal}>
              {t('httpConfig.stagesTotal', {
                hold: totalHoldSeconds,
                transitions: transitionCount,
                total: totalHoldSeconds + transitionCount * RAMP_TRANSITION_SECONDS
              })}
            </div>
          </div>
        )}

        {numberField(
          t('httpConfig.failureThreshold'),
          Number(((config.failureThreshold ?? 0.05) * 100).toFixed(0)),
          v => onConfigChange({failureThreshold: v / 100}),
          {
            min: 0,
            max: 100,
            step: 1,
            suffix: '%',
            hint: t('httpConfig.failureThresholdDescription')
          }
        )}
      </div>
    </div>
  );
};
