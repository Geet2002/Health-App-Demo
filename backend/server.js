const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // necessary for cookies
app.use(express.json());
app.use(cookieParser());

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'healthcare_db'
};

let pool = mysql.createPool(dbConfig);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ======================= AUTH ROUTES =======================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
      [username, hashedPassword]
    );

    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 3600000 });
    res.json({ message: 'Signup successful', user: { id: result.insertId, username } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await pool.query(`SELECT * FROM users WHERE username = ?`, [username]);
    if (users.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 3600000 });
    res.json({ message: 'Login successful', user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// ======================= POST ROUTES (Legacy / Updated) =======================

// Get all general posts (where community_id is null)
app.get('/api/posts', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.username as author_name,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.community_id IS NULL
      ORDER BY 
        p.type = 'emergency' DESC, 
        p.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Global Post
app.post('/api/posts', authenticate, async (req, res) => {
  try {
    const { title, content, type, location } = req.body;
    const author_id = req.user.id;
    const [result] = await pool.query(
      `INSERT INTO posts (title, content, type, location, author_id, community_id) VALUES (?, ?, ?, ?, ?, NULL)`,
      [title, content, type || 'query', location || null, author_id]
    );
    res.json({ id: result.insertId, title, content, type, location, author_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get post details
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [posts] = await pool.query(`
      SELECT p.*, u.username as author_name 
      FROM posts p LEFT JOIN users u ON p.author_id = u.id 
      WHERE p.id = ?
    `, [id]);

    if (posts.length === 0) return res.status(404).json({ error: 'Not found' });

    const [comments] = await pool.query(`
      SELECT c.*, u.username as author_name 
      FROM comments c LEFT JOIN users u ON c.author_id = u.id 
      WHERE c.post_id = ? ORDER BY c.created_at ASC
    `, [id]);

    res.json({ ...posts[0], comments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
app.post('/api/posts/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const author_id = req.user.id;

    const [result] = await pool.query(
      `INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)`,
      [id, author_id, content]
    );
    res.json({ id: result.insertId, post_id: id, author_id, content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= COMMUNITY ROUTES =======================

app.post('/api/communities', authenticate, async (req, res) => {
  try {
    const { name, description, is_private } = req.body;
    const author_id = req.user.id;

    // Create community
    const [result] = await pool.query(
      `INSERT INTO communities (name, description, is_private, created_by) VALUES (?, ?, ?, ?)`,
      [name, description, is_private || false, author_id]
    );
    const commId = result.insertId;

    // Add creator as admin
    await pool.query(
      `INSERT INTO community_members (community_id, user_id, role, status) VALUES (?, ?, 'admin', 'approved')`,
      [commId, author_id]
    );

    res.json({ id: commId, name, description, is_private, created_by: author_id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Community name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/communities', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(`
      SELECT c.*, u.username as creator_name,
      (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id AND cm.status = 'approved') as member_count,
      (SELECT status FROM community_members cm WHERE cm.community_id = c.id AND cm.user_id = ?) as user_status
      FROM communities c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `, [userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/communities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [comms] = await pool.query(`
      SELECT c.*, u.username as creator_name 
      FROM communities c LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.id = ?
    `, [id]);

    if (comms.length === 0) return res.status(404).json({ error: 'Not found' });

    const [members] = await pool.query(`
      SELECT cm.user_id, cm.role, cm.status, u.username
      FROM community_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.community_id = ?
    `, [id]);

    res.json({ ...comms[0], members });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/communities/:id/join', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const [comms] = await pool.query(`SELECT * FROM communities WHERE id = ?`, [id]);
    if (comms.length === 0) return res.status(404).json({ error: 'Community not found' });

    const isPrivate = comms[0].is_private;
    const status = isPrivate ? 'pending' : 'approved';

    await pool.query(
      `INSERT IGNORE INTO community_members (community_id, user_id, role, status) VALUES (?, ?, 'member', ?)`,
      [id, user_id, status]
    );

    if (isPrivate) {
      // Notify all admins of the community
      const [admins] = await pool.query(`SELECT user_id FROM community_members WHERE community_id = ? AND role = 'admin'`, [id]);
      for (let admin of admins) {
        if (admin.user_id !== user_id) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, 'join_request', ?, ?)`,
            [admin.user_id, `User ${req.user.username} requested to join ${comms[0].name}`, id]
          );
        }
      }
    }

    res.json({ message: status === 'pending' ? 'Request sent to admins' : 'Joined successfully', status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin approves or rejects request
app.post('/api/communities/:id/requests/:userId', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const admin_id = req.user.id;

    // Verify admin
    const [adminCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ?`, [id, admin_id]);
    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can perform this action' });
    }

    if (action === 'approve') {
      await pool.query(`UPDATE community_members SET status = 'approved' WHERE community_id = ? AND user_id = ?`, [id, userId]);

      const [comms] = await pool.query(`SELECT name FROM communities WHERE id = ?`, [id]);
      await pool.query(
        `INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, 'request_approved', ?, ?)`,
        [userId, `Your request to join ${comms[0].name} was approved!`, id]
      );

      res.json({ message: 'Request approved' });
    } else {
      await pool.query(`DELETE FROM community_members WHERE community_id = ? AND user_id = ?`, [id, userId]);
      res.json({ message: 'Request rejected' });
    }
  } catch (error) {
    console.error('------- APPROVE ERROR -------');
    console.error(error);
    console.error('------- END APPROVE ERROR -------');
    res.status(500).json({ error: error.message || 'Server error', stack: error.stack });
  }
});

app.post('/api/communities/:id/admin', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUserId } = req.body;
    const admin_id = req.user.id;

    const [adminCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ?`, [id, admin_id]);
    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') return res.status(403).json({ error: 'Only admins can perform this action' });

    await pool.query(`UPDATE community_members SET role = 'admin' WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, targetUserId]);

    const [comms] = await pool.query(`SELECT name FROM communities WHERE id = ?`, [id]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, 'made_admin', ?, ?)`,
      [targetUserId, `You were made an admin of ${comms[0].name}`, id]
    );

    res.json({ message: 'User promoted to admin' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= NOTIFICATION ROUTES =======================

app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= DELETE ROUTES =======================

app.delete('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [posts] = await pool.query('SELECT author_id FROM posts WHERE id = ?', [id]);
    if (posts.length === 0) return res.status(404).json({ error: 'Not found' });
    if (posts[0].author_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM posts WHERE id = ?', [id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/comments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [comments] = await pool.query('SELECT author_id FROM comments WHERE id = ?', [id]);
    if (comments.length === 0) return res.status(404).json({ error: 'Not found' });
    if (comments[0].author_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM comments WHERE id = ?', [id]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/communities/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [comms] = await pool.query('SELECT created_by FROM communities WHERE id = ?', [id]);
    if (comms.length === 0) return res.status(404).json({ error: 'Not found' });
    if (comms[0].created_by !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM communities WHERE id = ?', [id]);
    res.json({ message: 'Community deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
