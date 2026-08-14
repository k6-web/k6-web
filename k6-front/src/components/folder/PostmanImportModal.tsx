import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import type {K6RampUpStage, K6ScriptTemplate} from '../../types/k6';
import {Button, Field, Modal} from '../common';
import {DEFAULT_IMPORT_CONFIG, DEFAULT_STAGES, type ImportConfig} from './importConfig';
import styles from './PostmanImportModal.module.css';

interface PostmanImportModalProps {
  importing: boolean;
  onClose: () => void;
  onSubmit: (collection: unknown, config: ImportConfig, tags: string[]) => void;
  onInvalidFile: () => void;
}

export const PostmanImportModal = ({importing, onClose, onSubmit, onInvalidFile}: PostmanImportModalProps) => {
  const {t} = useTranslation();
  const [collection, setCollection] = useState<unknown | null>(null);
  const [fileName, setFileName] = useState('');
  const [tags, setTags] = useState('');
  const [config, setConfig] = useState<ImportConfig>(DEFAULT_IMPORT_CONFIG);

  const stages = config.stages && config.stages.length > 0 ? config.stages : DEFAULT_STAGES;

  const handleTemplateChange = (template: K6ScriptTemplate) => {
    if (template === 'ramp-up') {
      setConfig({
        ...config,
        template,
        vusers: Math.max(config.vusers || 0, 10),
        duration: Math.max(config.duration || 0, 60),
        rampUp: Math.max(config.rampUp || 0, 30),
        stages
      });
      return;
    }

    if (template === 'constant-tps') {
      setConfig({
        ...config,
        template,
        targetTps: Math.max(config.targetTps || 0, 10),
        preAllocatedVUs: Math.max(config.preAllocatedVUs || config.vusers || 0, 10),
        maxVUs: Math.max(config.maxVUs || config.preAllocatedVUs || config.vusers || 0, 20),
        rampUp: 0
      });
      return;
    }

    setConfig({...config, template, rampUp: 0});
  };

  const updateStage = (index: number, changes: Partial<K6RampUpStage>) => {
    setConfig({
      ...config,
      stages: stages.map((stage, stageIndex) => stageIndex === index ? {...stage, ...changes} : stage)
    });
  };

  const handleFile = async (file?: File) => {
    if (!file) return;

    try {
      setCollection(JSON.parse(await file.text()));
      setFileName(file.name);
    } catch {
      setCollection(null);
      setFileName('');
      onInvalidFile();
    }
  };

  const numberField = (
    label: string,
    value: number | undefined,
    onChange: (value: number) => void,
    extra?: {min?: number; max?: number; step?: number}
  ) => (
    <Field label={label}>
      <input
        type="number"
        min={extra?.min ?? 1}
        max={extra?.max}
        step={extra?.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );

  return (
    <Modal
      title={t('folderDetail.importPostman')}
      description={t('folderDetail.importPostmanDescription')}
      size="lg"
      closeLabel={t('common.close')}
      onClose={onClose}
      footer={
        <>
          <Button variant="gray" appearance="outline" onClick={onClose} disabled={importing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => collection && onSubmit(
              collection,
              config,
              tags.split(',').map(tag => tag.trim()).filter(Boolean)
            )}
            disabled={!collection}
            loading={importing}
          >
            {importing ? t('folderDetail.importingPostman') : t('folderDetail.importPostmanSubmit')}
          </Button>
        </>
      }
    >
      <Field label={t('folderDetail.postmanCollectionFile')} required>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => handleFile(e.target.files?.[0])}
          data-autofocus
        />
      </Field>
      {fileName && <div className={styles.fileName}>{fileName}</div>}

      <div className={styles.grid}>
        <Field label={t('httpConfig.template')}>
          <select
            value={config.template}
            onChange={(e) => handleTemplateChange(e.target.value as K6ScriptTemplate)}
          >
            <option value="constant-vus">{t('httpConfig.templateConstantVus')}</option>
            <option value="constant-tps">{t('httpConfig.templateConstantTps')}</option>
            <option value="ramp-up">{t('httpConfig.templateRampUp')}</option>
          </select>
        </Field>

        {config.template === 'constant-tps' && (
          <>
            {numberField(t('httpConfig.targetTps'), config.targetTps, v => setConfig({...config, targetTps: v}))}
            {numberField(t('httpConfig.duration'), config.duration, v => setConfig({...config, duration: v}))}
            {numberField(t('httpConfig.preAllocatedVUs'), config.preAllocatedVUs, v => setConfig({...config, preAllocatedVUs: v}))}
            {numberField(t('httpConfig.maxVUs'), config.maxVUs, v => setConfig({...config, maxVUs: v}))}
          </>
        )}

        {config.template === 'ramp-up' && (
          <div className={styles.fullRow}>
            <div className={styles.stagesHeader}>
              <span className={styles.stagesLabel}>{t('httpConfig.stages')}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfig({
                  ...config,
                  stages: [...stages, {duration: 30, target: stages[stages.length - 1]?.target ?? 10}]
                })}
              >
                {t('httpConfig.addStage')}
              </Button>
            </div>

            <div className={styles.stages}>
              {stages.map((stage, index) => (
                <div key={index} className={styles.stage}>
                  {numberField(
                    t('httpConfig.stageDuration'),
                    stage.duration,
                    v => updateStage(index, {duration: v})
                  )}
                  {numberField(
                    t('httpConfig.stageTarget'),
                    stage.target,
                    v => updateStage(index, {target: v}),
                    {min: 0}
                  )}
                  <Button
                    variant="danger"
                    appearance="outline"
                    size="sm"
                    disabled={stages.length <= 1}
                    onClick={() => setConfig({
                      ...config,
                      stages: stages.filter((_, stageIndex) => stageIndex !== index)
                    })}
                    aria-label={`${t('httpConfig.remove')} ${index + 1}`}
                  >
                    {t('httpConfig.remove')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {config.template === 'constant-vus' && (
          <>
            {numberField(t('httpConfig.vusers'), config.vusers, v => setConfig({...config, vusers: v}))}
            {numberField(t('httpConfig.duration'), config.duration, v => setConfig({...config, duration: v}))}
          </>
        )}

        {numberField(
          t('httpConfig.failureThreshold'),
          config.failureThreshold,
          v => setConfig({...config, failureThreshold: v}),
          {min: 0, max: 1, step: 0.01}
        )}
      </div>

      <Field label={t('newTest.tagsOptional')}>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={t('newTest.tagsPlaceholder')}
        />
      </Field>
    </Modal>
  );
};
