const { Pool } = require('pg');
require('dotenv').config({ path: 'functions/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('Connected! Total tables in DB:', res.rows.length);
    console.log(res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await pool.end();
  }
}
check();
