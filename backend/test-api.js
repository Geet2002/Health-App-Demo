const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 1, username: 'test' }, 'fallback_secret', { expiresIn: '7d' });

axios.get('http://localhost:5000/api/blood-requests', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => {
  if (res.data.length === 0) return console.log("No requests");
  const id = res.data[0].id;
  return axios.get(`http://localhost:5000/api/blood-requests/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}).then(res => {
  if (res) console.log("Success:", res.data);
}).catch(err => {
  console.error("Error:", err.response ? err.response.data : err.message);
});
