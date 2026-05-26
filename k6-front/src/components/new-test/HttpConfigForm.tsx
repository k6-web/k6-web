import {useTranslation} from 'react-i18next';
import {useState} from 'react';
import type {K6ScriptTemplate, K6TestConfig} from '../../types/k6';

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
  const [curlCommand, setCurlCommand] = useState('');
  const stages = config.stages && config.stages.length > 0 ? config.stages : [
    {duration: 30, target: 10},
    {duration: 60, target: 10},
    {duration: 30, target: 0}
  ];
  const updateStage = (index: number, changes: Partial<(typeof stages)[number]>) => {
    onConfigChange({
      stages: stages.map((stage, stageIndex) => stageIndex === index ? {...stage, ...changes} : stage)
    });
  };
  const addStage = () => {
    const lastTarget = stages[stages.length - 1]?.target ?? 10;
    onConfigChange({stages: [...stages, {duration: 30, target: lastTarget}]});
  };
  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    onConfigChange({stages: stages.filter((_, stageIndex) => stageIndex !== index)});
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{marginTop: 0, marginBottom: '1rem'}}>{t('httpConfig.title')}</h2>

      {isDynamic ? (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '4px',
          padding: '0.75rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: '#92400e'
        }}>
          {t('httpConfig.dynamicScriptNote')}
        </div>
      ) : (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '4px',
          padding: '0.75rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: '#1e40af'
        }}>
          {t('httpConfig.dynamicScriptNote')}
        </div>
      )}

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#f9fafb'
      }}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          {t('httpConfig.curlImport')}
        </label>
        <textarea
          value={curlCommand}
          onChange={(e) => setCurlCommand(e.target.value)}
          placeholder={t('httpConfig.curlPlaceholder')}
          rows={4}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            marginBottom: '0.5rem'
          }}
        />
        <button
          type="button"
          onClick={() => onConvertCurl(curlCommand)}
          disabled={!curlCommand.trim()}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: curlCommand.trim() ? '#6366f1' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: curlCommand.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            fontWeight: 'bold'
          }}
        >
          {t('httpConfig.convertCurl')}
        </button>
      </div>

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#f9fafb'
      }}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          {t('httpConfig.postmanImport')}
        </label>
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              onImportPostman(JSON.parse(await file.text()));
            } catch {
              alert(t('httpConfig.invalidPostmanFile'));
            } finally {
              e.target.value = '';
            }
          }}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}
        />
        <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
          {t('httpConfig.postmanDescription')}
        </div>
      </div>

      <div style={{marginBottom: '1rem'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          {t('httpConfig.template')}
        </label>
        <select
          value={config.template || 'constant-vus'}
          disabled={isDynamic}
          onChange={(e) => onTemplateChange(e.target.value as K6ScriptTemplate)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '1rem',
            backgroundColor: isDynamic ? '#f3f4f6' : 'white',
            cursor: isDynamic ? 'not-allowed' : 'pointer',
            color: isDynamic ? '#6b7280' : '#000'
          }}
        >
          <option value="constant-vus">{t('httpConfig.templateConstantVus')}</option>
          <option value="constant-tps">{t('httpConfig.templateConstantTps')}</option>
          <option value="ramp-up">{t('httpConfig.templateRampUp')}</option>
        </select>
        <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
          {t('httpConfig.templateDescription')}
        </div>
      </div>

      <div style={{marginBottom: '1rem'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          {t('httpConfig.url')} *
        </label>
        <input
          type="url"
          required
          value={config.url}
          disabled={isDynamic}
          onChange={(e) => onConfigChange({url: e.target.value})}
          placeholder={t('httpConfig.urlPlaceholder')}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '1rem',
            backgroundColor: isDynamic ? '#f3f4f6' : 'white',
            cursor: isDynamic ? 'not-allowed' : 'text',
            color: isDynamic ? '#6b7280' : '#000'
          }}
        />
      </div>

      <div style={{marginBottom: '1rem'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          {t('httpConfig.method')}
        </label>
        <select
          value={config.method}
          disabled={isDynamic}
          onChange={(e) => onConfigChange({method: e.target.value})}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '1rem',
            backgroundColor: isDynamic ? '#f3f4f6' : 'white',
            cursor: isDynamic ? 'not-allowed' : 'pointer',
            color: isDynamic ? '#6b7280' : '#000'
          }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
      </div>

      <div style={{marginBottom: '1rem'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          {t('httpConfig.headers')}
        </label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input
            type="text"
            placeholder={t('httpConfig.headerKeyPlaceholder')}
            value={headerKey}
            disabled={isDynamic}
            onChange={(e) => onHeaderKeyChange(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: isDynamic ? '#f3f4f6' : 'white',
              cursor: isDynamic ? 'not-allowed' : 'text',
              color: isDynamic ? '#6b7280' : '#000'
            }}
          />
          <input
            type="text"
            placeholder={t('httpConfig.headerValuePlaceholder')}
            value={headerValue}
            disabled={isDynamic}
            onChange={(e) => onHeaderValueChange(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: isDynamic ? '#f3f4f6' : 'white',
              cursor: isDynamic ? 'not-allowed' : 'text',
              color: isDynamic ? '#6b7280' : '#000'
            }}
          />
          <button
            type="button"
            disabled={isDynamic}
            onClick={onAddHeader}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isDynamic ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDynamic ? 'not-allowed' : 'pointer'
            }}
          >
            {t('httpConfig.addHeader')}
          </button>
        </div>
        {config.headers && Object.keys(config.headers).length > 0 && (
          <div style={{marginTop: '0.5rem'}}>
            {Object.entries(config.headers).map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  marginBottom: '0.25rem'
                }}
              >
                <span style={{fontSize: '0.875rem'}}>
                  <strong>{key}:</strong> {value}
                </span>
                <button
                  type="button"
                  disabled={isDynamic}
                  onClick={() => onRemoveHeader(key)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: isDynamic ? '#9ca3af' : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isDynamic ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  {t('httpConfig.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {['POST', 'PUT', 'PATCH'].includes(config.method) && (
        <div style={{marginBottom: '1rem'}}>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
            {t('httpConfig.requestBody')}
          </label>
          <textarea
            value={config.body as string}
            disabled={isDynamic}
            onChange={(e) => onConfigChange({body: e.target.value})}
            placeholder={t('httpConfig.requestBodyPlaceholder')}
            rows={5}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              backgroundColor: isDynamic ? '#f3f4f6' : 'white',
              cursor: isDynamic ? 'not-allowed' : 'text',
              color: isDynamic ? '#6b7280' : '#000'
            }}
          />
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
        gap: '1rem'
      }}>
        {config.template !== 'constant-tps' && config.template !== 'ramp-up' && (
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
              {t('httpConfig.vusers')} *
            </label>
            <input
              type="number"
              required
              min="1"
              value={config.vusers}
              disabled={isDynamic}
              onChange={(e) => onConfigChange({vusers: Number.parseInt(e.target.value)})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                cursor: isDynamic ? 'not-allowed' : 'text',
                color: isDynamic ? '#6b7280' : '#000'
              }}
            />
          </div>
        )}
        {config.template !== 'ramp-up' && config.template !== 'constant-tps' && (
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
              {t('httpConfig.duration')} *
            </label>
            <input
              type="number"
              required
              min="1"
              value={config.duration}
              disabled={isDynamic}
              onChange={(e) => onConfigChange({duration: Number.parseInt(e.target.value)})}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                cursor: isDynamic ? 'not-allowed' : 'text',
                color: isDynamic ? '#6b7280' : '#000'
              }}
            />
          </div>
        )}
        {config.template === 'constant-tps' && (
          <>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                {t('httpConfig.targetTps')} *
              </label>
              <input
                type="number"
                required
                min="1"
                value={config.targetTps || 1}
                disabled={isDynamic}
                onChange={(e) => onConfigChange({targetTps: Number.parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                  cursor: isDynamic ? 'not-allowed' : 'text',
                  color: isDynamic ? '#6b7280' : '#000'
                }}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                {t('httpConfig.duration')} *
              </label>
              <input
                type="number"
                required
                min="1"
                value={config.duration}
                disabled={isDynamic}
                onChange={(e) => onConfigChange({duration: Number.parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                  cursor: isDynamic ? 'not-allowed' : 'text',
                  color: isDynamic ? '#6b7280' : '#000'
                }}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                {t('httpConfig.preAllocatedVUs')} *
              </label>
              <input
                type="number"
                required
                min="1"
                value={config.preAllocatedVUs || 1}
                disabled={isDynamic}
                onChange={(e) => onConfigChange({preAllocatedVUs: Number.parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                  cursor: isDynamic ? 'not-allowed' : 'text',
                  color: isDynamic ? '#6b7280' : '#000'
                }}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                {t('httpConfig.maxVUs')} *
              </label>
              <input
                type="number"
                required
                min={config.preAllocatedVUs || 1}
                value={config.maxVUs || config.preAllocatedVUs || 1}
                disabled={isDynamic}
                onChange={(e) => onConfigChange({maxVUs: Number.parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                  cursor: isDynamic ? 'not-allowed' : 'text',
                  color: isDynamic ? '#6b7280' : '#000'
                }}
              />
            </div>
          </>
        )}
        {config.template === 'ramp-up' && (
          <div style={{gridColumn: '1 / -1'}}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '0.5rem'
            }}>
              <label style={{fontWeight: 'bold'}}>
                {t('httpConfig.stages')}
              </label>
              <button
                type="button"
                disabled={isDynamic}
                onClick={addStage}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: isDynamic ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isDynamic ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {t('httpConfig.addStage')}
              </button>
            </div>
            <div style={{display: 'grid', gap: '0.5rem'}}>
              {stages.map((stage, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                    gap: '0.5rem',
                    alignItems: 'end'
                  }}
                >
                  <div>
                    <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#4b5563'}}>
                      {t('httpConfig.stageDuration')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={stage.duration}
                      disabled={isDynamic}
                      onChange={(e) => updateStage(index, {duration: Number.parseInt(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                        cursor: isDynamic ? 'not-allowed' : 'text',
                        color: isDynamic ? '#6b7280' : '#000'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#4b5563'}}>
                      {t('httpConfig.stageTarget')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stage.target}
                      disabled={isDynamic}
                      onChange={(e) => updateStage(index, {target: Number.parseInt(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: isDynamic ? '#f3f4f6' : 'white',
                        cursor: isDynamic ? 'not-allowed' : 'text',
                        color: isDynamic ? '#6b7280' : '#000'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isDynamic || stages.length <= 1}
                    onClick={() => removeStage(index)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: isDynamic || stages.length <= 1 ? '#9ca3af' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isDynamic || stages.length <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {t('httpConfig.remove')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
            {t('httpConfig.failureThreshold')}
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={((config.failureThreshold ?? 0.05) * 100).toFixed(0)}
            disabled={isDynamic}
            onChange={(e) => onConfigChange({failureThreshold: Number.parseInt(e.target.value) / 100})}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: isDynamic ? '#f3f4f6' : 'white',
              cursor: isDynamic ? 'not-allowed' : 'text',
              color: isDynamic ? '#6b7280' : '#000'
            }}
          />
          <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
            {t('httpConfig.failureThresholdDescription')}
          </div>
        </div>
      </div>
    </div>
  );
};
