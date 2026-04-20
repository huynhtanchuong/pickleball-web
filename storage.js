// ============================================================
//  Storage Adapter - Unified interface for localStorage and Supabase
//  Provides abstraction layer for data persistence
// ============================================================

/**
 * StorageAdapter - Main adapter class that provides unified interface
 * Automatically detects mode (Supabase vs localStorage) and delegates to appropriate provider
 */
class StorageAdapter {
  constructor(supabaseClient = null) {
    // Detect mode based on Supabase client availability
    if (supabaseClient && this._isValidSupabaseClient(supabaseClient)) {
      this.mode = 'supabase';
      this.provider = new SupabaseProvider(supabaseClient);
    } else {
      this.mode = 'localStorage';
      this.provider = new LocalStorageProvider();
    }
  }

  _isValidSupabaseClient(client) {
    // Check if client has required methods
    return client && 
           typeof client.from === 'function' &&
           typeof client.channel === 'function';
  }

  getMode() {
    return this.mode;
  }

  // ── CRUD Operations ──────────────────────────────────────────

  /**
   * Create one or more records
   * @param {string} table - Table name
   * @param {object|array} data - Single object or array of objects to create
   * @returns {Promise<object|array>} Created record(s) with generated IDs
   */
  async create(table, data) {
    return await this.provider.create(table, data);
  }

  /**
   * Read records with optional filtering
   * @param {string} table - Table name
   * @param {object} filters - Filter conditions (e.g., {tournament_id: 1, tier: 2})
   * @returns {Promise<array>} Array of matching records
   */
  async read(table, filters = {}) {
    return await this.provider.read(table, filters);
  }

  /**
   * Update a record by ID
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @param {object} data - Fields to update
   * @returns {Promise<object>} Updated record
   */
  async update(table, id, data) {
    return await this.provider.update(table, id, data);
  }

  /**
   * Delete a record by ID
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(table, id) {
    return await this.provider.delete(table, id);
  }

  // ── Transaction Support ──────────────────────────────────────

  /**
   * Execute multiple operations as a transaction
   * @param {array} operations - Array of {action, table, data, id} objects
   * @returns {Promise<array>} Results of all operations
   */
  async transaction(operations) {
    return await this.provider.transaction(operations);
  }

  // ── Realtime Subscriptions ───────────────────────────────────

  /**
   * Subscribe to changes on a table
   * @param {string} table - Table name
   * @param {function} callback - Callback function(event, payload)
   * @returns {object} Subscription channel (use for unsubscribe)
   */
  subscribe(table, callback) {
    return this.provider.subscribe(table, callback);
  }

  /**
   * Unsubscribe from a channel
   * @param {object} channel - Channel returned from subscribe()
   */
  unsubscribe(channel) {
    return this.provider.unsubscribe(channel);
  }
}

/**
 * LocalStorageProvider - Implementation for localStorage (demo mode)
 */
class LocalStorageProvider {
  constructor() {
    this.prefix = 'pb_';
    this.listeners = new Map(); // Track storage event listeners
  }

  _getKey(table) {
    return `${this.prefix}${table}`;
  }

  _getData(table) {
    const key = this._getKey(table);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _setData(table, data) {
    const key = this._getKey(table);
    localStorage.setItem(key, JSON.stringify(data));
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: key,
      newValue: JSON.stringify(data),
      storageArea: localStorage
    }));
  }

  _generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async create(table, data) {
    const records = this._getData(table);
    const isArray = Array.isArray(data);
    const items = isArray ? data : [data];
    
    const created = items.map(item => {
      const record = {
        ...item,
        id: item.id || this._generateId(),
        created_at: item.created_at || new Date().toISOString()
      };
      records.push(record);
      return record;
    });

    this._setData(table, records);
    return isArray ? created : created[0];
  }

  async read(table, filters = {}) {
    const records = this._getData(table);
    
    // Apply filters
    if (Object.keys(filters).length === 0) {
      return records;
    }

    return records.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        // Handle special case for 'id' filter
        if (key === 'id') {
          return record.id === value || record.id == value;
        }
        // Handle query filter (substring search on name)
        if (key === 'query' && record.name) {
          return record.name.toLowerCase().includes(value.toLowerCase());
        }
        // Handle tierFilter
        if (key === 'tierFilter' && value !== null && value !== undefined) {
          return record.tier === value || record.tier == value;
        }
        // Standard equality check
        return record[key] === value || record[key] == value;
      });
    });
  }

  async update(table, id, data) {
    const records = this._getData(table);
    const index = records.findIndex(r => r.id === id || r.id == id);
    
    if (index === -1) {
      throw new Error(`Record with id ${id} not found in ${table}`);
    }

    records[index] = {
      ...records[index],
      ...data,
      updated_at: new Date().toISOString()
    };

    this._setData(table, records);
    return records[index];
  }

  async delete(table, id) {
    const records = this._getData(table);
    const filtered = records.filter(r => r.id !== id && r.id != id);
    
    if (filtered.length === records.length) {
      throw new Error(`Record with id ${id} not found in ${table}`);
    }

    this._setData(table, filtered);
    return true;
  }

  async transaction(operations) {
    const results = [];
    
    try {
      for (const op of operations) {
        let result;
        switch (op.action) {
          case 'create':
            result = await this.create(op.table, op.data);
            break;
          case 'update':
            result = await this.update(op.table, op.id, op.data);
            break;
          case 'delete':
            result = await this.delete(op.table, op.id);
            break;
          case 'read':
            result = await this.read(op.table, op.filters || {});
            break;
          default:
            throw new Error(`Unknown action: ${op.action}`);
        }
        results.push(result);
      }
      return results;
    } catch (error) {
      // In localStorage, we can't truly rollback, but we throw to indicate failure
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  subscribe(table, callback) {
    const key = this._getKey(table);
    
    const handler = (event) => {
      if (event.key === key && event.storageArea === localStorage) {
        const newData = event.newValue ? JSON.parse(event.newValue) : [];
        callback('UPDATE', newData);
      }
    };

    window.addEventListener('storage', handler);
    this.listeners.set(table, handler);
    
    return { table, handler };
  }

  unsubscribe(channel) {
    if (channel && channel.handler) {
      window.removeEventListener('storage', channel.handler);
      this.listeners.delete(channel.table);
    }
  }
}

/**
 * SupabaseProvider - Implementation for Supabase (production mode)
 */
class SupabaseProvider {
  constructor(supabaseClient) {
    this.client = supabaseClient;
    this.channels = new Map(); // Track realtime channels
  }

  async create(table, data) {
    const isArray = Array.isArray(data);
    const items = isArray ? data : [data];

    const { data: created, error } = await this.client
      .from(table)
      .insert(items)
      .select();

    if (error) {
      throw new Error(`Failed to create in ${table}: ${error.message}`);
    }

    return isArray ? created : created[0];
  }

  async read(table, filters = {}) {
    let query = this.client.from(table).select('*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'query') {
        // Substring search on name field
        query = query.ilike('name', `%${value}%`);
      } else if (key === 'tierFilter' && value !== null && value !== undefined) {
        query = query.eq('tier', value);
      } else if (key === 'id') {
        query = query.eq('id', value);
      } else {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to read from ${table}: ${error.message}`);
    }

    // If filtering by id, return single object or empty array
    if (filters.id !== undefined) {
      return data;
    }

    return data || [];
  }

  async update(table, id, data) {
    const { data: updated, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ${table} id ${id}: ${error.message}`);
    }

    return updated;
  }

  async delete(table, id) {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete from ${table} id ${id}: ${error.message}`);
    }

    return true;
  }

  async transaction(operations) {
    // Supabase doesn't have native transaction support in JS client
    // We execute operations sequentially and collect results
    // Note: This is not a true ACID transaction
    const results = [];
    
    try {
      for (const op of operations) {
        let result;
        switch (op.action) {
          case 'create':
            result = await this.create(op.table, op.data);
            break;
          case 'update':
            result = await this.update(op.table, op.id, op.data);
            break;
          case 'delete':
            result = await this.delete(op.table, op.id);
            break;
          case 'read':
            result = await this.read(op.table, op.filters || {});
            break;
          default:
            throw new Error(`Unknown action: ${op.action}`);
        }
        results.push(result);
      }
      return results;
    } catch (error) {
      // In case of error, we can't rollback previous operations
      // This is a limitation of the Supabase JS client
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  subscribe(table, callback) {
    const channelName = `${table}_changes_${Date.now()}`;
    
    const channel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload) => {
          callback(payload.eventType, payload.new || payload.old);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    
    return { channelName, channel };
  }

  unsubscribe(channelObj) {
    if (channelObj && channelObj.channel) {
      this.client.removeChannel(channelObj.channel);
      this.channels.delete(channelObj.channelName);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageAdapter, LocalStorageProvider, SupabaseProvider };
}
