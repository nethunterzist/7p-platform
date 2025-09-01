import { Pool, QueryResult } from 'pg';

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

class DatabaseAdapter {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Safe query builder with WHERE clause validation
  async findMany(table: string, options: QueryOptions = {}): Promise<QueryResult> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Validate and build WHERE clause
    if (options.where && 
        typeof options.where === "object" && 
        Object.keys(options.where).length > 0) {
      
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY clause
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    // Add LIMIT clause
    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    // Add OFFSET clause
    if (options.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    return this.query(sql, params);
  }

  async findById(table: string, id: number | string): Promise<QueryResult> {
    const sql = `SELECT * FROM ${table} WHERE id = $1`;
    return this.query(sql, [id]);
  }

  async create(table: string, data: Record<string, any>): Promise<QueryResult> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    return this.query(sql, values);
  }

  async update(table: string, id: number | string, data: Record<string, any>): Promise<QueryResult> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`);

    const sql = `
      UPDATE ${table}
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    return this.query(sql, [id, ...values]);
  }

  async delete(table: string, id: number | string): Promise<QueryResult> {
    const sql = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    return this.query(sql, [id]);
  }

  // Safe aggregation functions
  async count(table: string, options: QueryOptions = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    if (options.where && 
        typeof options.where === "object" && 
        Object.keys(options.where).length > 0) {
      
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.query(sql, params);
    return parseInt(result.rows[0].count || "0", 10);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new DatabaseAdapter();

// Safe aggregation utilities
export const safeSum = (items: any[], field: string): number => {
  return items.reduce((sum, item) => {
    const value = item[field];
    return sum + (typeof value === 'number' ? value : parseInt(value || "0", 10));
  }, 0);
};

export const safeCount = (items: any[], field?: string): number => {
  if (!field) return items.length;
  return items.filter(item => item[field] != null).length;
};