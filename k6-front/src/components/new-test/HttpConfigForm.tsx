import type {K6TestConfig} from '../../types/k6';

interface HttpConfigFormProps {
  config: K6TestConfig;
  isDynamic: boolean;
  headerKey: string;
  headerValue: string;
  onConfigChange: (config: Partial<K6TestConfig>) => void;
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
  onHeaderKeyChange,
  onHeaderValueChange,
  onAddHeader,
  onRemoveHeader
}: HttpConfigFormProps) => {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{marginTop: 0, marginBottom: '1rem'}}>HTTP Test Configuration</h2>

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
          ⚠️ <strong>Dynamic Script Detected:</strong> This script uses dynamic URLs or complex logic.
          HTTP settings are read-only and can only be modified in Custom Script. (Test name can be changed)
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
          💡 <strong>Tip:</strong> If you need dynamic URLs or complex logic, write a Custom Script directly.
          This configuration is for quickly generating simple HTTP tests.
        </div>
      )}

      <div style={{marginBottom: '1rem'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          Test Name (Optional)
        </label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => onConfigChange({name: e.target.value.slice(0, 50)})}
          placeholder="e.g., API Performance Test"
          maxLength={50}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
        <div style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem'}}>
          {config.name?.length || 0}/50 characters
        </div>
      </div>

      <div style={{marginBottom: '1rem'}}>
        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
          URL *
        </label>
        <input
          type="url"
          required
          value={config.url}
          disabled={isDynamic}
          onChange={(e) => onConfigChange({url: e.target.value})}
          placeholder="https://api.example.com/endpoint"
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
          Method
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
          Headers
        </label>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <input
            type="text"
            placeholder="Header name"
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
            placeholder="Header value"
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
            Add
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
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {['POST', 'PUT', 'PATCH'].includes(config.method) && (
        <div style={{marginBottom: '1rem'}}>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
            Request Body
          </label>
          <textarea
            value={config.body as string}
            disabled={isDynamic}
            onChange={(e) => onConfigChange({body: e.target.value})}
            placeholder='{"key": "value"}'
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
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
            Virtual Users *
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
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
            Duration (seconds) *
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
            Ramp-up (seconds)
          </label>
          <input
            type="number"
            min="0"
            value={config.rampUp}
            disabled={isDynamic}
            onChange={(e) => onConfigChange({rampUp: Number.parseInt(e.target.value)})}
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
      </div>
    </div>
  );
};
