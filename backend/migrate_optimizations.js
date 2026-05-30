const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('Connecting to MySQL...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthcare_db'
  });

  try {
    console.log('Adding indexes to posts table...');
    await connection.query(`ALTER TABLE posts ADD INDEX idx_posts_type (type)`);
  } catch(e) { console.log('Index idx_posts_type might already exist.'); }
  
  try {
    await connection.query(`ALTER TABLE posts ADD INDEX idx_posts_created_at (created_at)`);
  } catch(e) { console.log('Index idx_posts_created_at might already exist.'); }

  try {
    await connection.query(`ALTER TABLE posts ADD INDEX idx_posts_community_id (community_id)`);
  } catch(e) { console.log('Index idx_posts_community_id might already exist.'); }

  try {
    console.log('Adding comment_count and vote_count columns to posts...');
    await connection.query(`ALTER TABLE posts ADD COLUMN comment_count INT DEFAULT 0`);
  } catch(e) { console.log('Column comment_count might already exist.'); }

  try {
    await connection.query(`ALTER TABLE posts ADD COLUMN vote_count INT DEFAULT 0`);
  } catch(e) { console.log('Column vote_count might already exist.'); }

  console.log('Backfilling data...');
  await connection.query(`
    UPDATE posts p 
    SET 
      comment_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id),
      vote_count = (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id)
  `);

  console.log('Migration complete!');
  await connection.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
