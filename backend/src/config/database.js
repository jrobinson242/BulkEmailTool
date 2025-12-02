const sql = require('mssql');
const logger = require('../utils/logger');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.NODE_ENV === 'development'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      logger.info('Database connection established');
    } catch (err) {
      logger.error('Database connection failed', { error: err.message });
      throw err;
    }
  }
  return pool;
}

async function executeQuery(query, params = {}) {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add parameters
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result;
  } catch (err) {
    logger.error('Query execution failed', { error: err.message, query });
    throw err;
  }
}

module.exports = {
  getPool,
  executeQuery,
  sql
};
