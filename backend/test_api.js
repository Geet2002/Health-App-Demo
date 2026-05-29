const axios = require('axios');
require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthcare_db'
  });

  const [users] = await connection.query('SELECT id FROM users LIMIT 1');
  const userId = users[0].id;
  // create token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: userId, role: 'admin' }, process.env.JWT_SECRET || 'secret');

  try {
    const res = await axios.post('http://localhost:5000/api/communities/15/events', {
      title: 'API Test Event',
      description: 'Testing',
      event_date: '2026-05-30 10:00:00',
      location: 'Test Location',
      location_lat: 26.123456,
      location_lng: 91.123456
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Response:", res.data);
  } catch(e) {
    console.log("Error:", e.response ? e.response.data : e.message);
  }

  const [rows] = await connection.query('SELECT title, location_lat, location_lng FROM community_events WHERE title="API Test Event"');
  console.log("DB rows:", rows);

  await connection.end();
}
test();
