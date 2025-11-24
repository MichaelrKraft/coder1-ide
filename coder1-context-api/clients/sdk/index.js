/**
 * Coder1 SDK - Simple JavaScript SDK for Context API
 * 
 * Usage:
 *   const { Coder1Client } = require('@coder1/sdk');
 *   const client = new Coder1Client({ apiUrl: 'http://localhost:3005' });
 *   await client.memories.create({ type: 'insight', content: {...} });
 */

class Coder1Client {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:3005';
    this.apiKey = options.apiKey;
  }

  async _fetch(path, options = {}) {
    const url = `${this.apiUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Memory operations
  get memories() {
    return {
      create: async (memory) => {
        return this._fetch('/api/v1/memory', {
          method: 'POST',
          body: JSON.stringify(memory)
        });
      },

      get: async (id) => {
        return this._fetch(`/api/v1/memory/${id}`);
      },

      search: async (query) => {
        return this._fetch('/api/v1/memory/search', {
          method: 'POST',
          body: JSON.stringify({ query })
        });
      },

      list: async () => {
        return this._fetch('/api/v1/memory');
      },

      delete: async (id) => {
        return this._fetch(`/api/v1/memory/${id}`, {
          method: 'DELETE'
        });
      }
    };
  }

  // Health check
  async health() {
    return this._fetch('/health');
  }
}

module.exports = { Coder1Client };
