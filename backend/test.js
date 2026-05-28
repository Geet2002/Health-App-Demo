const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Geet@#123Abc',
    database: 'healthcare_db'
  });
  
  const [rows] = await pool.query(`
    SELECT p.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional, c.name as community_name,
    (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
    (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id) as vote_count,
    (SELECT vote_type FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = 1) as user_vote
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN communities c ON p.community_id = c.id
    WHERE p.community_id = 15
    ORDER BY 
      p.type = 'emergency' DESC, 
      p.created_at DESC
    LIMIT 10 OFFSET 0
  `);
  console.log("Returned rows:", rows.map(r => ({ id: r.id, type: r.type, title: r.title })));
  process.exit(0);
}
test();
