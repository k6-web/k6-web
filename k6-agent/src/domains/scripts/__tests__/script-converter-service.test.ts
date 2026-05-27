import {describe, expect, it} from '@jest/globals';
import {ScriptConverterService} from '../script-converter-service';

describe('ScriptConverterService', () => {
  describe('convertPostmanToScripts', () => {
    it('should convert Postman requests into individual k6 scripts with common options', () => {
      const service = new ScriptConverterService();
      const collection = {
        item: [
          {
            name: 'Users',
            item: [
              {
                name: 'List Users',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/users',
                },
              },
              {
                name: 'Create User',
                request: {
                  method: 'POST',
                  url: 'https://api.example.com/users',
                  header: [{key: 'Content-Type', value: 'application/json'}],
                  body: {
                    mode: 'raw',
                    raw: '{"name":"kim"}',
                  },
                },
              },
            ],
          },
        ],
      };

      const scripts = service.convertPostmanToScripts(collection, {
        template: 'constant-vus',
        vusers: 5,
        duration: 60,
        failureThreshold: 0.1,
      });

      expect(scripts).toHaveLength(2);
      expect(scripts[0].scriptIdBase).toBe('users-list-users');
      expect(scripts[0].script).toContain("vus: 5");
      expect(scripts[0].script).toContain("duration: '60s'");
      expect(scripts[0].script).toContain('https://api.example.com/users');
      expect(scripts[1].scriptIdBase).toBe('users-create-user');
      expect(scripts[1].script).toContain('Content-Type');
      expect(scripts[1].script).toContain('JSON.stringify');
    });

    it('should generate ramp-up options using the same transition stages as the editor', () => {
      const service = new ScriptConverterService();
      const collection = {
        item: [
          {
            name: 'Ramp Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/ramp',
            },
          },
        ],
      };

      const scripts = service.convertPostmanToScripts(collection, {
        template: 'ramp-up',
        stages: [
          {duration: 30, target: 10},
          {duration: 60, target: 10},
          {duration: 30, target: 0},
        ],
      });

      expect(scripts[0].script).toContain("executor: 'ramping-vus'");
      expect(scripts[0].script).toContain("{ duration: '1s', target: 10 }");
      expect(scripts[0].script).toContain("{ duration: '30s', target: 10 }");
      expect(scripts[0].script).toContain("{ duration: '60s', target: 10 }");
      expect(scripts[0].script).toContain("{ duration: '1s', target: 0 }");
    });
  });
});
