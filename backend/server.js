const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors({ origin: 'http://localhost:5173' })); // credentials not needed for bearer tokens
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin Middleware
const isAdmin = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error checking admin status' });
  }
};


// ======================= NOTIFICATIONS HELPER =======================
const createNotification = async (userId, type, content, relatedId = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)`,
      [userId, type, content, relatedId]
    );
    io.emit('new_notification', userId);
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

// ======================= AUTH ROUTES =======================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalEmail = email || null;

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, finalEmail, hashedPassword]
    );

    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Signup successful', token, user: { id: result.insertId, username, profile_picture: null, is_admin: 0 } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await pool.query(`SELECT * FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)`, [username, username]);
    if (users.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = users[0];
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Please sign in with Google' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username, profile_picture: user.profile_picture, is_admin: user.is_admin } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google Client ID not configured on server' });
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: google_id, email, name, picture } = payload;

    // Check if user exists by google_id or email
    let [users] = await pool.query(`SELECT * FROM users WHERE google_id = ? OR email = ?`, [google_id, email]);
    
    let user;
    if (users.length > 0) {
      user = users[0];
      // If user exists but no google_id, update it
      if (!user.google_id) {
        await pool.query(`UPDATE users SET google_id = ? WHERE id = ?`, [google_id, user.id]);
      }
    } else {
      // Create new user. Append a random suffix if username exists
      let username = name || email.split('@')[0];
      let [existingUser] = await pool.query(`SELECT id FROM users WHERE username = ?`, [username]);
      if (existingUser.length > 0) {
        username = username + '_' + Math.floor(Math.random() * 10000);
      }
      
      const [result] = await pool.query(
        `INSERT INTO users (username, email, password_hash, google_id, profile_picture) VALUES (?, ?, ?, ?, ?)`,
        [username, email, null, google_id, picture]
      );
      user = { id: result.insertId, username: username, profile_picture: picture, is_admin: 0 };
    }

    const appToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Google Login successful', token: appToken, user: { id: user.id, username: user.username, profile_picture: user.profile_picture, is_admin: user.is_admin } });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Google Auth failed' });
  }
});


app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, profile_picture, is_admin, medical_verification_status FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(401).json({ error: 'User not found' });
    res.json({ user: users[0] });
  } catch(e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= USER PROFILE ROUTES =======================

app.get('/api/users/profile', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, username, email, created_at, birthdate, description, gender, profile_picture, is_medical_professional, medical_verification_status FROM users WHERE id = ?`, 
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/profile', authenticate, upload.single('profile_picture'), async (req, res) => {
  try {
    const { birthdate, description, gender } = req.body;
    
    // Ensure birthdate is valid if provided, else null
    const finalBirthdate = birthdate || null;
    const finalGender = gender || null;
    const finalDesc = description || null;

    if (req.file) {
      const profile_picture = '/uploads/' + req.file.filename;
      await pool.query(
        `UPDATE users SET birthdate = ?, description = ?, gender = ?, profile_picture = ? WHERE id = ?`,
        [finalBirthdate, finalDesc, finalGender, profile_picture, req.user.id]
      );
    } else {
      await pool.query(
        `UPDATE users SET birthdate = ?, description = ?, gender = ? WHERE id = ?`,
        [finalBirthdate, finalDesc, finalGender, req.user.id]
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/me/verify-medical', authenticate, async (req, res) => {
  try {
    const { is_medical_professional } = req.body;
    if (is_medical_professional) {
      await pool.query(
        `UPDATE users SET medical_verification_status = 'pending' WHERE id = ?`,
        [req.user.id]
      );
    } else {
      await pool.query(
        `UPDATE users SET is_medical_professional = 0, medical_verification_status = 'none' WHERE id = ?`,
        [req.user.id]
      );
    }
    res.json({ message: 'Verification status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= POST ROUTES (Legacy / Updated) =======================

app.get('/api/posts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter } = req.query; // 'global', 'communities', or 'all'

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const category = req.query.category || 'all';

    let whereConditions = [];
    let queryParams = [];

    if (filter === 'global') {
      whereConditions.push(`p.community_id IS NULL`);
    } else if (filter === 'communities') {
      whereConditions.push(`p.community_id IN (SELECT community_id FROM community_members WHERE user_id = ? AND status = 'approved')`);
      queryParams.push(userId);
    } else {
      whereConditions.push(`(p.community_id IS NULL OR p.community_id IN (SELECT community_id FROM community_members WHERE user_id = ? AND status = 'approved'))`);
      queryParams.push(userId);
    }

    if (category !== 'all') {
      whereConditions.push(`p.type = ?`);
      queryParams.push(category);
    }

    if (search) {
      whereConditions.push(`(p.title LIKE ? OR p.content LIKE ? OR p.location LIKE ?)`);
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [rows] = await pool.query(`
      SELECT p.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional, c.name as community_name,
      (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id) as vote_count,
      (SELECT vote_type FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = ?) as user_vote
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN communities c ON p.community_id = c.id
      ${whereClause}
      ORDER BY 
        p.type = 'emergency' DESC, 
        p.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, ...queryParams, limit + 1, offset]);

    const hasMore = rows.length > limit;
    const posts = hasMore ? rows.slice(0, limit) : rows;

    res.json({ posts, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Global Post
app.post('/api/posts', authenticate, async (req, res) => {
  try {
    const { title, content, type, location, community_id } = req.body;
    const author_id = req.user.id;
    const finalCommunityId = community_id || null;

    const [result] = await pool.query(
      `INSERT INTO posts (title, content, type, location, author_id, community_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, type || 'query', location || null, author_id, finalCommunityId]
    );

    if (finalCommunityId) {
      // Notify all approved members except author
      const [members] = await pool.query(
        `SELECT user_id FROM community_members WHERE community_id = ? AND status = 'approved' AND user_id != ?`,
        [finalCommunityId, author_id]
      );
      for (let m of members) {
        await createNotification(m.user_id, 'new_post', `New post: ${title}`, result.insertId);
      }
      io.emit('community_feed_updated', { communityId: finalCommunityId, action: 'add', triggerUserId: req.user.id });
    }
    
    // Always emit global feed update because community posts also show up in the global feed
    io.emit('global_feed_updated', { action: 'add', triggerUserId: req.user.id });

    res.json({ id: result.insertId, title, content, type, location, author_id, community_id: finalCommunityId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Post
app.put('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, location } = req.body;
    
    const [posts] = await pool.query('SELECT author_id, community_id FROM posts WHERE id = ?', [id]);
    if (posts.length === 0) return res.status(404).json({ error: 'Not found' });
    
    // Only the creator can edit the post
    if (posts[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    await pool.query(
      'UPDATE posts SET title = ?, content = ?, type = ?, location = ? WHERE id = ?',
      [title, content, type || 'query', location || null, id]
    );

    if (posts[0].community_id) {
      io.emit('community_feed_updated', posts[0].community_id);
    }
    io.emit('global_feed_updated', { action: 'update', triggerUserId: req.user.id });
    io.emit('post_updated', id);

    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle Post Vote (Like)
app.post('/api/posts/:id/vote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if vote exists
    const [existing] = await pool.query('SELECT id FROM post_votes WHERE post_id = ? AND user_id = ?', [id, userId]);

    if (existing.length > 0) {
      // Remove vote (Unlike)
      await pool.query('DELETE FROM post_votes WHERE post_id = ? AND user_id = ?', [id, userId]);
      const [countRows] = await pool.query('SELECT COUNT(*) as count FROM post_votes WHERE post_id = ?', [id]);
      io.emit('post_updated', id);
      return res.json({ message: 'Unliked', user_vote: null, vote_count: countRows[0].count });
    } else {
      // Add vote (Like)
      await pool.query('INSERT INTO post_votes (post_id, user_id, vote_type) VALUES (?, ?, \'like\')', [id, userId]);
      const [countRows] = await pool.query('SELECT COUNT(*) as count FROM post_votes WHERE post_id = ?', [id]);
      io.emit('post_updated', id);
      return res.json({ message: 'Liked', user_vote: 'like', vote_count: countRows[0].count });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get post details
app.get('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [posts] = await pool.query(`
      SELECT p.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional, c.name as community_name,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'like') as upvotes,
      (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id) as vote_count,
      (SELECT vote_type FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = ?) as user_vote
      FROM posts p 
      LEFT JOIN users u ON p.author_id = u.id 
      LEFT JOIN communities c ON p.community_id = c.id
      WHERE p.id = ?
    `, [userId, id]);

    if (posts.length === 0) return res.status(404).json({ error: 'Not found' });

    const [comments] = await pool.query(`
      SELECT c.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional,
      (SELECT vote_type FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.user_id = ?) as user_vote
      FROM comments c LEFT JOIN users u ON c.author_id = u.id 
      WHERE c.post_id = ? ORDER BY c.created_at ASC
    `, [userId, id]);

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
    const { content, parent_id } = req.body;
    const author_id = req.user.id;

    const [result] = await pool.query(
      `INSERT INTO comments (post_id, author_id, content, parent_id) VALUES (?, ?, ?, ?)`,
      [id, author_id, content, parent_id || null]
    );
    io.emit('post_updated', id);
    res.json({ id: result.insertId, post_id: id, author_id, content, parent_id: parent_id || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Comment Vote
app.post('/api/comments/:id/vote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote_type } = req.body; // 'like' or 'dislike' or null to remove
    const userId = req.user.id;

    // Get current vote
    const [existing] = await pool.query('SELECT vote_type FROM comment_votes WHERE comment_id = ? AND user_id = ?', [id, userId]);

    if (!vote_type) {
      // Remove vote
      if (existing.length > 0) {
        await pool.query('DELETE FROM comment_votes WHERE comment_id = ? AND user_id = ?', [id, userId]);
        const oldVote = existing[0].vote_type;
        if (oldVote === 'like') await pool.query('UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?', [id]);
        if (oldVote === 'dislike') await pool.query('UPDATE comments SET dislikes_count = dislikes_count - 1 WHERE id = ?', [id]);
      }
      io.emit('comment_updated', id);
      return res.json({ message: 'Vote removed' });
    }

    if (existing.length > 0) {
      if (existing[0].vote_type !== vote_type) {
        // Toggle vote
        await pool.query('UPDATE comment_votes SET vote_type = ? WHERE comment_id = ? AND user_id = ?', [vote_type, id, userId]);
        if (vote_type === 'like') {
          await pool.query('UPDATE comments SET likes_count = likes_count + 1, dislikes_count = dislikes_count - 1 WHERE id = ?', [id]);
        } else {
          await pool.query('UPDATE comments SET dislikes_count = dislikes_count + 1, likes_count = likes_count - 1 WHERE id = ?', [id]);
        }
      }
    } else {
      // Insert new vote
      await pool.query('INSERT INTO comment_votes (comment_id, user_id, vote_type) VALUES (?, ?, ?)', [id, userId, vote_type]);
      if (vote_type === 'like') await pool.query('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', [id]);
      else await pool.query('UPDATE comments SET dislikes_count = dislikes_count + 1 WHERE id = ?', [id]);
    }
    
    io.emit('comment_updated', id);
    res.json({ message: 'Vote recorded' });
  } catch (err) {
    console.error(err);
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

// Get community posts
app.get('/api/communities/:id/posts', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    let whereClause = `p.community_id = ?`;
    let queryParams = [userId, id];

    if (search) {
      whereClause += ` AND p.content LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    queryParams.push(limit, offset);

    const [rows] = await pool.query(`
      SELECT p.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional, c.name as community_name,
      (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id) as vote_count,
      (SELECT vote_type FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = ?) as user_vote
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN communities c ON p.community_id = c.id
      WHERE ${whereClause}
      ORDER BY 
        p.type = 'emergency' DESC, 
        p.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave community
app.post('/api/communities/:id/leave', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if the user is the creator
    const [comms] = await pool.query(`SELECT created_by FROM communities WHERE id = ?`, [id]);
    if (comms.length === 0) return res.status(404).json({ error: 'Community not found' });
    
    if (comms[0].created_by === user_id) {
      return res.status(400).json({ error: 'Creator cannot leave the community. You must delete it instead.' });
    }

    await pool.query(
      `DELETE FROM community_members WHERE community_id = ? AND user_id = ?`,
      [id, user_id]
    );

    io.emit('community_member_updated', id);
    res.json({ message: 'Successfully left the community' });
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
          await createNotification(admin.user_id, 'join_request', `User ${req.user.username} requested to join ${comms[0].name}`, id);
        }
      }
    }

    io.emit('community_member_updated', id);
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
      await createNotification(userId, 'request_approved', `Your request to join ${comms[0].name} was approved!`, id);

      io.emit('community_member_updated', id);
      res.json({ message: 'Request approved' });
    } else {
      await pool.query(`DELETE FROM community_members WHERE community_id = ? AND user_id = ?`, [id, userId]);
      io.emit('community_member_updated', id);
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
    await createNotification(targetUserId, 'made_admin', `You were made an admin of ${comms[0].name}`, id);

    io.emit('community_member_updated', id);
    res.json({ message: 'User promoted to admin' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/communities/:id/demote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUserId } = req.body;
    const adminId = req.user.id;

    const [community] = await pool.query(`SELECT created_by FROM communities WHERE id = ?`, [id]);
    if (community.length === 0) return res.status(404).json({ error: 'Community not found' });
    
    if (community[0].created_by !== adminId) {
      return res.status(403).json({ error: 'Only the creator can remove admin roles' });
    }
    
    if (parseInt(targetUserId) === adminId) {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    await pool.query(`UPDATE community_members SET role = 'member' WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, targetUserId]);

    const [comms] = await pool.query(`SELECT name FROM communities WHERE id = ?`, [id]);
    await createNotification(targetUserId, 'system', `Your admin role was removed in ${comms[0].name}`, id);

    io.emit('community_member_updated', id);
    res.json({ message: 'Admin role removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/communities/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const adminId = req.user.id;

    // Check if the requester is an admin
    const [adminCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND role = 'admin'`, [id, adminId]);
    if (adminCheck.length === 0) return res.status(403).json({ error: 'Only admins can remove members' });

    // Check target user role
    const [targetCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ?`, [id, userId]);
    if (targetCheck.length === 0) return res.status(404).json({ error: 'User is not a member of this community' });
    
    const [community] = await pool.query(`SELECT created_by FROM communities WHERE id = ?`, [id]);
    const isCreator = community[0].created_by === adminId;

    if (targetCheck[0].role === 'admin') {
      if (!isCreator) return res.status(403).json({ error: 'Only the creator can remove an admin' });
      if (parseInt(userId) === adminId) return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    // Remove the user
    await pool.query(`DELETE FROM community_members WHERE community_id = ? AND user_id = ?`, [id, userId]);

    // Send notification
    const [comms] = await pool.query(`SELECT name FROM communities WHERE id = ?`, [id]);
    const communityName = comms[0]?.name || 'a community';
    await createNotification(userId, 'system', `You have been removed from the community: ${communityName}`, id);

    io.emit('community_member_updated', id);
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
// ======================= COMMUNITY ENHANCEMENTS (EVENTS & RESOURCES) =======================

app.get('/api/communities/:id/events', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    let whereClause = `e.community_id = ?`;
    let queryParams = [req.user.id, id];

    if (search) {
      whereClause += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    queryParams.push(limit, offset);

    const [events] = await pool.query(`
      SELECT e.*, u.username as creator_name,
      (SELECT COUNT(*) FROM event_attendees ea WHERE ea.event_id = e.id) as attendee_count,
      (SELECT COUNT(*) FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = ?) as user_attending
      FROM community_events e
      JOIN users u ON e.created_by = u.id
      WHERE ${whereClause}
      ORDER BY e.event_date ASC
      LIMIT ? OFFSET ?
    `, queryParams);
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/communities/:id/events', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, location, location_lat, location_lng } = req.body;
    require('fs').appendFileSync('payload_log.txt', JSON.stringify({ method: 'POST', body: req.body }) + '\n');
    console.log("POST EVENT REQ.BODY:", req.body);
    
    // Check if user is an approved member
    const [memberCheck] = await pool.query(`SELECT status FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, req.user.id]);
    if (memberCheck.length === 0) return res.status(403).json({ error: 'Only approved members can create events' });

    const [result] = await pool.query(
      `INSERT INTO community_events (community_id, created_by, title, description, event_date, location, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, title, description, event_date, location, location_lat || null, location_lng || null]
    );

    // Notify approved community members about the new event
    try {
      const [communityRows] = await pool.query(`SELECT name FROM communities WHERE id = ?`, [id]);
      const communityName = communityRows[0]?.name || 'a community';
      const [members] = await pool.query(
        `SELECT user_id FROM community_members WHERE community_id = ? AND status = 'approved' AND user_id != ?`,
        [id, req.user.id]
      );
      for (const m of members) {
        await createNotification(m.user_id, 'community_event', `New event scheduled in ${communityName}: "${title}"`, id);
      }
    } catch (notifErr) {
      console.error('Error dispatching community event notifications:', notifErr);
    }

    io.emit('community_event_updated', { communityId: id, action: 'add', triggerUserId: req.user.id });
    res.json({ id: result.insertId, message: 'Event created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/communities/:id/events/:eventId', authenticate, async (req, res) => {
  try {
    const { id, eventId } = req.params;
    const { title, description, event_date, location, location_lat, location_lng } = req.body;
    require('fs').appendFileSync('payload_log.txt', JSON.stringify({ method: 'PUT', body: req.body }) + '\n');
    console.log("PUT EVENT REQ.BODY:", req.body);
    
    const [eventRows] = await pool.query('SELECT created_by FROM community_events WHERE id = ? AND community_id = ?', [eventId, id]);
    if (eventRows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const isCreator = eventRows[0].created_by === req.user.id;

    // Check if user is admin
    const [adminCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, req.user.id]);
    let isAdmin = adminCheck.length > 0 && adminCheck[0].role === 'admin';
    
    if (!isAdmin) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (users[0]?.is_admin === 1) isAdmin = true;
    }

    if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Not authorized to edit this event' });

    // Format event_date to standard MySQL format (YYYY-MM-DD HH:MM:SS) if it contains 'T'
    let formattedDate = event_date;
    if (formattedDate && formattedDate.includes('T')) {
      formattedDate = new Date(formattedDate).toISOString().slice(0, 19).replace('T', ' ');
    }

    await pool.query(
      `UPDATE community_events SET title = ?, description = ?, event_date = ?, location = ?, location_lat = ?, location_lng = ? WHERE id = ? AND community_id = ?`,
      [title, description, formattedDate, location, location_lat || null, location_lng || null, eventId, id]
    );

    io.emit('community_event_updated', id);
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/communities/:id/events/:eventId', authenticate, async (req, res) => {
  try {
    const { id, eventId } = req.params;
    
    const [eventRows] = await pool.query('SELECT created_by, title FROM community_events WHERE id = ? AND community_id = ?', [eventId, id]);
    if (eventRows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const isCreator = eventRows[0].created_by === req.user.id;

    // Check if user is admin
    const [adminCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, req.user.id]);
    let isAdmin = adminCheck.length > 0 && adminCheck[0].role === 'admin';
    
    if (!isAdmin) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (users[0]?.is_admin === 1) isAdmin = true;
    }

    if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Not authorized to delete this event' });

    const creatorId = eventRows[0].created_by;
    const eventTitle = eventRows[0].title || 'your event';
    
    await pool.query(`DELETE FROM community_events WHERE id = ? AND community_id = ?`, [eventId, id]);

    // Notify creator if admin deleted it
    if (creatorId !== req.user.id) {
      await createNotification(creatorId, 'system_delete', `An admin has deleted your event: "${eventTitle}"`);
    }

    io.emit('community_event_updated', id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/events/:eventId/rsvp', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { attending } = req.body;

    const [eventData] = await pool.query(`SELECT community_id FROM community_events WHERE id = ?`, [eventId]);
    if (eventData.length === 0) return res.status(404).json({ error: 'Event not found' });
    const communityId = eventData[0].community_id;

    if (attending) {
      await pool.query(`INSERT IGNORE INTO event_attendees (event_id, user_id) VALUES (?, ?)`, [eventId, req.user.id]);

      // Notify the event creator
      try {
        const [eventRows] = await pool.query(
          `SELECT e.title, e.created_by, e.community_id, c.name as community_name FROM community_events e JOIN communities c ON e.community_id = c.id WHERE e.id = ?`,
          [eventId]
        );
        if (eventRows.length > 0 && eventRows[0].created_by !== req.user.id) {
          const event = eventRows[0];
          await createNotification(event.created_by, 'event_rsvp', `${req.user.username} is attending your event "${event.title}" in ${event.community_name}`, event.community_id);
        }
      } catch (notifErr) {
        console.error('Error dispatching RSVP notification:', notifErr);
      }

      io.emit('community_event_updated', communityId);
      res.json({ message: 'RSVP successful' });
    } else {
      await pool.query(`DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?`, [eventId, req.user.id]);
      io.emit('community_event_updated', communityId);
      res.json({ message: 'RSVP cancelled' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/events/:eventId/attendees', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const [attendees] = await pool.query(
      `SELECT u.id, u.username, u.profile_picture, u.is_medical_professional 
       FROM users u 
       JOIN event_attendees ea ON u.id = ea.user_id 
       WHERE ea.event_id = ? 
       ORDER BY ea.created_at ASC`,
      [eventId]
    );
    res.json(attendees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/communities/:id/resources', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    let whereClause = `r.community_id = ?`;
    let queryParams = [id];

    if (search) {
      whereClause += ` AND (r.title LIKE ? OR r.content LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    queryParams.push(limit, offset);

    const [resources] = await pool.query(`
      SELECT r.*, u.username as creator_name
      FROM community_resources r
      JOIN users u ON r.created_by = u.id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);
    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/communities/:id/members', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    let whereClause = `cm.community_id = ? AND cm.status = 'approved'`;
    let queryParams = [id];

    if (search) {
      whereClause += ` AND u.username LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    queryParams.push(limit, offset);

    const [members] = await pool.query(`
      SELECT cm.user_id, cm.role, cm.status, u.username, u.profile_picture, u.is_medical_professional
      FROM community_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE ${whereClause}
      ORDER BY cm.role = 'creator' DESC, cm.role = 'admin' DESC, u.username ASC
      LIMIT ? OFFSET ?
    `, queryParams);
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/communities/:id/resources', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link } = req.body;
    const content = req.body.content || '';
    
    // Determine file_path and file_type
    let file_path = null;
    let file_type = null;
    
    if (req.file) {
      file_path = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith('image/')) {
        file_type = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        file_type = 'video';
      } else if (req.file.mimetype === 'application/pdf') {
        file_type = 'pdf';
      } else {
        file_type = 'other';
      }
    } else if (link && (link.includes('youtube.com/') || link.includes('youtu.be/'))) {
      file_type = 'youtube';
    } else if (link) {
      file_type = 'link';
    }

    // Check if user is an approved member
    const [memberCheck] = await pool.query(`SELECT status FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, req.user.id]);
    if (memberCheck.length === 0) return res.status(403).json({ error: 'Only approved members can add resources' });

    const [result] = await pool.query(
      `INSERT INTO community_resources (community_id, created_by, title, content, link, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, title, content, link || null, file_path, file_type]
    );

    // Notify approved community members about the new resource
    try {
      const [communityRows] = await pool.query(`SELECT name FROM communities WHERE id = ?`, [id]);
      const communityName = communityRows[0]?.name || 'a community';
      const [members] = await pool.query(
        `SELECT user_id FROM community_members WHERE community_id = ? AND status = 'approved' AND user_id != ?`,
        [id, req.user.id]
      );
      for (const m of members) {
        await createNotification(m.user_id, 'community_resource', `New resource shared in ${communityName}: "${title}"`, id);
      }
    } catch (notifErr) {
      console.error('Error dispatching community resource notifications:', notifErr);
    }

    io.emit('community_resource_updated', { communityId: id, action: 'add', triggerUserId: req.user.id });
    res.json({ id: result.insertId, message: 'Resource added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/communities/:id/resources/:resourceId', authenticate, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const { title, link } = req.body;
    const content = req.body.content || '';
    
    const [resRows] = await pool.query('SELECT created_by FROM community_resources WHERE id = ? AND community_id = ?', [resourceId, id]);
    if (resRows.length === 0) return res.status(404).json({ error: 'Resource not found' });
    const isCreator = resRows[0].created_by === req.user.id;

    // Check if user is admin
    const [adminCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, req.user.id]);
    let isAdmin = adminCheck.length > 0 && adminCheck[0].role === 'admin';
    
    if (!isAdmin) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (users[0]?.is_admin === 1) isAdmin = true;
    }

    if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Not authorized to edit this resource' });

    await pool.query(
      `UPDATE community_resources SET title = ?, content = ?, link = ? WHERE id = ? AND community_id = ?`,
      [title, content, link || null, resourceId, id]
    );

    io.emit('community_resource_updated', id);
    res.json({ message: 'Resource updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/communities/:id/resources/:resourceId', authenticate, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    
    const [resRows] = await pool.query('SELECT created_by, title FROM community_resources WHERE id = ? AND community_id = ?', [resourceId, id]);
    if (resRows.length === 0) return res.status(404).json({ error: 'Resource not found' });
    const isCreator = resRows[0].created_by === req.user.id;

    // Check if user is admin
    const [adminCheck] = await pool.query(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`, [id, req.user.id]);
    let isAdmin = adminCheck.length > 0 && adminCheck[0].role === 'admin';
    
    if (!isAdmin) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (users[0]?.is_admin === 1) isAdmin = true;
    }

    if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Not authorized to delete this resource' });

    const creatorId = resRows[0].created_by;
    const resourceTitle = resRows[0].title || 'your resource';
    
    await pool.query(`DELETE FROM community_resources WHERE id = ? AND community_id = ?`, [resourceId, id]);

    // Notify creator if admin deleted it
    if (creatorId !== req.user.id) {
      await createNotification(creatorId, 'system_delete', `An admin has deleted your resource: "${resourceTitle}"`);
    }

    io.emit('community_resource_updated', id);
    res.json({ message: 'Resource deleted successfully' });
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

app.put('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/notifications/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [id, req.user.id]);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/notifications', authenticate, async (req, res) => {
  try {
    await pool.query(`DELETE FROM notifications WHERE user_id = ?`, [req.user.id]);
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= BLOOD DONATION ROUTES =======================

app.get('/api/blood-requests', authenticate, async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = `
      SELECT b.*, u.username as requester_name 
      FROM blood_requests b 
      JOIN users u ON b.user_id = u.id 
    `;
    let queryParams = [];

    if (search) {
      query += ` WHERE b.patient_name LIKE ? OR b.blood_group LIKE ? OR b.location LIKE ? `;
      const searchStr = `%${search}%`;
      queryParams.push(searchStr, searchStr, searchStr);
    }

    query += ` ORDER BY FIELD(b.status, 'pending', 'fulfilled'), b.created_at DESC`;

    const [rows] = await pool.query(query, queryParams);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/blood-requests', authenticate, async (req, res) => {
  try {
    const { patient_name, blood_group, units_required, location, location_lat, location_lng, urgency } = req.body;
    const user_id = req.user.id;

    const [result] = await pool.query(
      `INSERT INTO blood_requests (user_id, patient_name, blood_group, units_required, location, location_lat, location_lng, urgency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, patient_name, blood_group, units_required, location, location_lat || null, location_lng || null, urgency || 'high']
    );

    // Notify all other users about urgent blood requests
    if (urgency === 'critical' || urgency === 'high') {
      const [users] = await pool.query(`SELECT id FROM users WHERE id != ?`, [user_id]);
      for (let u of users) {
        await createNotification(u.id, 'blood_request', `Urgent Blood Request: ${blood_group} needed at ${location}`, result.insertId);
      }
    }

    io.emit('blood_request_added', result.insertId);

    res.json({ id: result.insertId, message: 'Blood request created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/blood-requests/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { patient_name, blood_group, units_required, location, location_lat, location_lng, urgency } = req.body;
    
    const [requests] = await pool.query('SELECT user_id FROM blood_requests WHERE id = ?', [id]);
    if (requests.length === 0) return res.status(404).json({ error: 'Not found' });
    
    // Check auth
    let isAuthorized = requests[0].user_id === req.user.id;
    if (!isAuthorized) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      isAuthorized = users[0]?.is_admin === 1;
    }
    
    if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query(
      `UPDATE blood_requests SET patient_name = ?, blood_group = ?, units_required = ?, location = ?, location_lat = ?, location_lng = ?, urgency = ? WHERE id = ?`,
      [patient_name, blood_group, units_required, location, location_lat || null, location_lng || null, urgency, id]
    );

    io.emit('blood_request_updated', id);
    res.json({ message: 'Blood request updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/blood-requests/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get request details
    const [requests] = await pool.query(`
      SELECT b.*, u.username as requester_name 
      FROM blood_requests b 
      JOIN users u ON b.user_id = u.id 
      WHERE b.id = ?
    `, [id]);
    
    if (requests.length === 0) return res.status(404).json({ error: 'Not found' });
    const request = requests[0];

    // Get comments
    const [comments] = await pool.query(`
      SELECT c.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional 
      FROM blood_request_comments c 
      JOIN users u ON c.author_id = u.id 
      WHERE c.request_id = ? 
      ORDER BY c.created_at ASC
    `, [id]);

    // Get offers (only visible to requester, or the donor themselves)
    let offers = [];
    if (request.user_id === userId) {
      // Requester sees all offers
      const [allOffers] = await pool.query(`
        SELECT o.*, u.username as donor_name, u.profile_picture as donor_profile_picture 
        FROM blood_donation_offers o 
        JOIN users u ON o.donor_id = u.id 
        WHERE o.request_id = ? 
        ORDER BY o.created_at DESC
      `, [id]);
      offers = allOffers;
    } else {
      // User only sees their own offers
      const [userOffers] = await pool.query(`
        SELECT o.*, u.username as donor_name, u.profile_picture as donor_profile_picture 
        FROM blood_donation_offers o 
        JOIN users u ON o.donor_id = u.id 
        WHERE o.request_id = ? AND o.donor_id = ?
        ORDER BY o.created_at DESC
      `, [id, userId]);
      offers = userOffers;
    }

    res.json({ ...request, comments, offers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/blood-requests/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const author_id = req.user.id;

    const [result] = await pool.query(
      `INSERT INTO blood_request_comments (request_id, author_id, content) VALUES (?, ?, ?)`,
      [id, author_id, content]
    );

    // Notify requester
    const [requests] = await pool.query(`SELECT user_id, patient_name FROM blood_requests WHERE id = ?`, [id]);
    if (requests.length > 0 && requests[0].user_id !== author_id) {
      await createNotification(requests[0].user_id, 'blood_comment', `Someone commented on your blood request for ${requests[0].patient_name}`, id);
    }

    res.json({ id: result.insertId, message: 'Comment added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/blood-requests/:id/offers', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, email, message } = req.body;
    const donor_id = req.user.id;

    // Don't allow requester to offer to themselves
    const [requests] = await pool.query(`SELECT user_id, patient_name FROM blood_requests WHERE id = ?`, [id]);
    if (requests.length === 0) return res.status(404).json({ error: 'Not found' });
    if (requests[0].user_id === donor_id) return res.status(400).json({ error: 'Cannot offer donation to your own request' });

    const [result] = await pool.query(
      `INSERT INTO blood_donation_offers (request_id, donor_id, phone, email, message) VALUES (?, ?, ?, ?, ?)`,
      [id, donor_id, phone, email, message]
    );

    // Notify requester
    await createNotification(requests[0].user_id, 'blood_offer', `New donation offer received for ${requests[0].patient_name}`, id);

    res.json({ id: result.insertId, message: 'Donation offer sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/blood-requests/:id/offers', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const donor_id = req.user.id;

    // Check if the user has an offer for this request
    const [offers] = await pool.query(`SELECT id FROM blood_donation_offers WHERE request_id = ? AND donor_id = ?`, [id, donor_id]);
    if (offers.length === 0) {
      return res.status(404).json({ error: 'Donation offer not found' });
    }

    await pool.query(`DELETE FROM blood_donation_offers WHERE request_id = ? AND donor_id = ?`, [id, donor_id]);

    res.json({ message: 'Donation offer withdrawn successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/blood-requests/:id/toggle-status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const [requests] = await pool.query(`SELECT user_id, status FROM blood_requests WHERE id = ?`, [id]);
    if (requests.length === 0) return res.status(404).json({ error: 'Not found' });
    if (requests[0].user_id !== user_id) return res.status(403).json({ error: 'Unauthorized' });

    const newStatus = requests[0].status === 'pending' ? 'fulfilled' : 'pending';
    await pool.query(`UPDATE blood_requests SET status = ? WHERE id = ?`, [newStatus, id]);
    res.json({ message: `Marked as ${newStatus}`, status: newStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/blood-requests/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [requests] = await pool.query('SELECT user_id FROM blood_requests WHERE id = ?', [id]);
    if (requests.length === 0) return res.status(404).json({ error: 'Not found' });
    if (requests[0].user_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM blood_requests WHERE id = ?', [id]);
    res.json({ message: 'Blood request deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= GOOGLE CLOUD SPEECH-TO-TEXT ROUTE =======================

app.post('/api/speech/transcribe', authenticate, async (req, res) => {
  try {
    const { transcribeAudio } = require('./services/googleSpeechService');

    // Check if audio data was sent
    if (!req.body || !req.body.audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Extract parameters
    const audioBase64 = req.body.audio;
    const language = req.body.language || 'en-US';
    const encoding = req.body.encoding || 'WEBM_OPUS';

    // Transcribe using Google Cloud Speech-to-Text
    let transcription = await transcribeAudio(audioBase64, language, encoding);

    // Enforce target language script (pure transcription validation, no translation)
    if (transcription) {
      const langPrefix = language.split('-')[0]; // 'en', 'hi', 'as'
      if (langPrefix === 'en') {
        // Enforce Latin characters (English/ASCII)
        const isEnglish = /^[\s\w.,!?'"\-()]+$/.test(transcription);
        if (!isEnglish) {
          transcription = "";
        }
      } else if (langPrefix === 'hi') {
        // Enforce Devanagari characters (Hindi Unicode block)
        const hasDevanagari = /[\u0900-\u097F]/.test(transcription);
        if (!hasDevanagari) {
          transcription = "";
        }
      } else if (langPrefix === 'as') {
        // Enforce Bengali-Assamese characters (Assamese Unicode block)
        const hasAssamese = /[\u0980-\u09FF]/.test(transcription);
        if (!hasAssamese) {
          transcription = "";
        }
      }
    }

    res.json({ text: transcription });
  } catch (error) {
    console.error('Speech transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

// ======================= DELETE ROUTES =======================

app.delete('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [posts] = await pool.query('SELECT author_id, community_id, content FROM posts WHERE id = ?', [id]);
    if (posts.length === 0) return res.status(404).json({ error: 'Not found' });
    
    let isAuthorized = posts[0].author_id === req.user.id;
    if (!isAuthorized) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (users[0]?.is_admin === 1) isAuthorized = true;
      
      if (!isAuthorized && posts[0].community_id) {
        const [adminCheck] = await pool.query('SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND role = "admin"', [posts[0].community_id, req.user.id]);
        if (adminCheck.length > 0) isAuthorized = true;
      }
    }

    if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized' });

    const creatorId = posts[0].author_id;
    let postDesc = posts[0].content || 'your post';
    if (postDesc.length > 30) postDesc = postDesc.substring(0, 30) + '...';
    
    // Delete dependent records first to avoid foreign key constraint errors
    await pool.query('DELETE FROM comment_votes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ?)', [id]);
    await pool.query('DELETE FROM comments WHERE post_id = ?', [id]);
    await pool.query('DELETE FROM post_votes WHERE post_id = ?', [id]);
    
    // Now delete the post
    await pool.query('DELETE FROM posts WHERE id = ?', [id]);
    
    // Notify creator if admin deleted it
    if (creatorId !== req.user.id) {
      await createNotification(creatorId, 'system_delete', `An admin has deleted your post: "${postDesc}"`);
    }

    if (posts[0].community_id) {
      io.emit('community_feed_updated', posts[0].community_id);
    }
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/comments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [comments] = await pool.query('SELECT c.author_id, c.post_id, p.community_id FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = ?', [id]);
    if (comments.length === 0) return res.status(404).json({ error: 'Not found' });
    
    let isAuthorized = comments[0].author_id === req.user.id;
    if (!isAuthorized) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (users[0]?.is_admin === 1) isAuthorized = true;
      
      if (!isAuthorized && comments[0].community_id) {
        const [adminCheck] = await pool.query('SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND role = "admin"', [comments[0].community_id, req.user.id]);
        if (adminCheck.length > 0) isAuthorized = true;
      }
    }

    if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM comments WHERE id = ?', [id]);
    io.emit('post_updated', comments[0].post_id);
    io.emit('comment_updated', id);
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

app.put('/api/communities/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Community name is required' });
    }

    // Check if the user is an admin of the community
    const [adminCheck] = await pool.query(
      `SELECT role FROM community_members WHERE community_id = ? AND user_id = ? AND status = 'approved'`,
      [id, req.user.id]
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only community admins can edit community details' });
    }

    // Update community
    await pool.query(
      `UPDATE communities SET name = ?, description = ? WHERE id = ?`,
      [name.trim(), description ? description.trim() : null, id]
    );

    res.json({ message: 'Community updated successfully', name: name.trim(), description: description ? description.trim() : null });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Community name already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= HEALTH MOMENTS (INSTAGRAM-STYLE) =======================

app.get('/api/health-shares', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    let whereClause = '';
    let queryParams = [userId];

    if (search) {
      whereClause = `WHERE hs.content LIKE ? OR u.username LIKE ?`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    queryParams.push(limit + 1, offset);

    const [rows] = await pool.query(`
      SELECT hs.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional,
      (SELECT COUNT(*) FROM health_share_comments hsc WHERE hsc.share_id = hs.id) as comment_count,
      (SELECT vote_type FROM health_share_votes hsv WHERE hsv.share_id = hs.id AND hsv.user_id = ?) as user_vote
      FROM health_shares hs
      JOIN users u ON hs.author_id = u.id
      ${whereClause}
      ORDER BY hs.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    const hasMore = rows.length > limit;
    const shares = hasMore ? rows.slice(0, limit) : rows;

    res.json({ shares, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health-shares/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const [rows] = await pool.query(`
      SELECT hs.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional,
      (SELECT COUNT(*) FROM health_share_comments hsc WHERE hsc.share_id = hs.id) as comment_count,
      (SELECT vote_type FROM health_share_votes hsv WHERE hsv.share_id = hs.id AND hsv.user_id = ?) as user_vote
      FROM health_shares hs
      JOIN users u ON hs.author_id = u.id
      WHERE hs.id = ?
    `, [userId, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/health-shares', authenticate, upload.single('media'), async (req, res) => {
  try {
    const { content } = req.body;
    const author_id = req.user.id;
    
    let media_url = null;
    let media_type = null;

    if (req.file) {
      media_url = '/uploads/' + req.file.filename;
      if (req.file.mimetype.startsWith('image/')) media_type = 'image';
      else if (req.file.mimetype.startsWith('video/')) media_type = 'video';
      else if (req.file.mimetype.startsWith('audio/')) media_type = 'audio';
    }

    const [result] = await pool.query(
      `INSERT INTO health_shares (author_id, content, media_url, media_type) VALUES (?, ?, ?, ?)`,
      [author_id, content, media_url, media_type]
    );

    io.emit('health_share_added', { action: 'add', triggerUserId: req.user.id });

    res.json({ id: result.insertId, message: 'Share posted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/health-shares/:id', authenticate, upload.single('media'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content, remove_media } = req.body;
    const author_id = req.user.id;

    const [shares] = await pool.query('SELECT author_id, media_url, media_type FROM health_shares WHERE id = ?', [id]);
    if (shares.length === 0) return res.status(404).json({ error: 'Not found' });
    
    let isAuthorized = shares[0].author_id === req.user.id;
    if (!isAuthorized) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (users[0]?.is_admin === 1) isAuthorized = true;
    }

    if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized' });

    let media_url = shares[0].media_url;
    let media_type = shares[0].media_type;

    if (remove_media === 'true') {
      media_url = null;
      media_type = null;
    } else if (req.file) {
      media_url = '/uploads/' + req.file.filename;
      if (req.file.mimetype.startsWith('image/')) media_type = 'image';
      else if (req.file.mimetype.startsWith('video/')) media_type = 'video';
      else if (req.file.mimetype.startsWith('audio/')) media_type = 'audio';
    }

    await pool.query(
      `UPDATE health_shares SET content = ?, media_url = ?, media_type = ? WHERE id = ?`,
      [content, media_url, media_type, id]
    );

    io.emit('health_share_added', { action: 'update', triggerUserId: req.user.id });

    res.json({ message: 'Share updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/health-shares/:id/vote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote_type } = req.body; // 'like' or 'dislike' or null
    const userId = req.user.id;

    const [existing] = await pool.query('SELECT vote_type FROM health_share_votes WHERE share_id = ? AND user_id = ?', [id, userId]);

    if (!vote_type) {
      if (existing.length > 0) {
        await pool.query('DELETE FROM health_share_votes WHERE share_id = ? AND user_id = ?', [id, userId]);
        const oldVote = existing[0].vote_type;
        if (oldVote === 'like') await pool.query('UPDATE health_shares SET likes_count = likes_count - 1 WHERE id = ?', [id]);
        if (oldVote === 'dislike') await pool.query('UPDATE health_shares SET dislikes_count = dislikes_count - 1 WHERE id = ?', [id]);
      }
      io.emit('health_share_updated', id);
      return res.json({ message: 'Vote removed' });
    }

    if (existing.length > 0) {
      if (existing[0].vote_type !== vote_type) {
        await pool.query('UPDATE health_share_votes SET vote_type = ? WHERE share_id = ? AND user_id = ?', [vote_type, id, userId]);
        if (vote_type === 'like') await pool.query('UPDATE health_shares SET likes_count = likes_count + 1, dislikes_count = dislikes_count - 1 WHERE id = ?', [id]);
        else await pool.query('UPDATE health_shares SET dislikes_count = dislikes_count + 1, likes_count = likes_count - 1 WHERE id = ?', [id]);
      }
    } else {
      await pool.query('INSERT INTO health_share_votes (share_id, user_id, vote_type) VALUES (?, ?, ?)', [id, userId, vote_type]);
      if (vote_type === 'like') await pool.query('UPDATE health_shares SET likes_count = likes_count + 1 WHERE id = ?', [id]);
      else await pool.query('UPDATE health_shares SET dislikes_count = dislikes_count + 1 WHERE id = ?', [id]);
    }
    io.emit('health_share_updated', id);
    res.json({ message: 'Vote recorded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health-shares/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [comments] = await pool.query(`
      SELECT c.*, u.username as author_name 
      FROM health_share_comments c 
      JOIN users u ON c.author_id = u.id 
      WHERE c.share_id = ? 
      ORDER BY c.created_at ASC
    `, [id]);
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/health-shares/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const author_id = req.user.id;

    const [result] = await pool.query(
      `INSERT INTO health_share_comments (share_id, author_id, content) VALUES (?, ?, ?)`,
      [id, author_id, content]
    );
    io.emit('health_share_updated', id);
    res.json({ id: result.insertId, message: 'Comment added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/health-share-comments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [comments] = await pool.query('SELECT author_id, share_id FROM health_share_comments WHERE id = ?', [id]);
    if (comments.length === 0) return res.status(404).json({ error: 'Not found' });
    
    // Check if the current user is the author or admin
    let isAuthorized = comments[0].author_id === req.user.id;
    if (!isAuthorized) {
      const [users] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      isAuthorized = users[0]?.is_admin === 1;
    }
    
    if (!isAuthorized) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM health_share_comments WHERE id = ?', [id]);
    io.emit('health_share_updated', comments[0].share_id);
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/health-shares/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [shares] = await pool.query('SELECT author_id FROM health_shares WHERE id = ?', [id]);
    if (shares.length === 0) return res.status(404).json({ error: 'Not found' });
    if (shares[0].author_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM health_shares WHERE id = ?', [id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public User Profile
app.get('/api/users/:id/public', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get public info
    const [users] = await pool.query(
      `SELECT id, username, created_at, description, gender, profile_picture, is_medical_professional FROM users WHERE id = ?`, 
      [id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Get user stats (post count and total upvotes)
    const [postCountRows] = await pool.query(`SELECT COUNT(*) as count FROM posts WHERE author_id = ?`, [id]);
    const [upvoteCountRows] = await pool.query(`SELECT COUNT(*) as count FROM post_votes WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)`, [id]);
    
    // Get their joined communities
    const [communities] = await pool.query(
      `SELECT c.id, c.name, c.description FROM communities c JOIN community_members cm ON c.id = cm.community_id WHERE cm.user_id = ? AND cm.status = 'approved'`,
      [id]
    );

    // Get their recent public posts
    const [posts] = await pool.query(
      `SELECT p.*, u.username as author_name, u.profile_picture as author_profile_picture, u.is_medical_professional,
       (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
       (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id) as vote_count
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.author_id = ? AND p.community_id IS NULL
       ORDER BY p.created_at DESC LIMIT 10`,
       [id]
    );
    
    res.json({
      user: users[0],
      stats: {
        posts_count: postCountRows[0].count,
        upvotes_count: upvoteCountRows[0].count
      },
      communities: communities,
      recent_posts: posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================= ADMIN ROUTES =======================

app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const [[{ users_count }]] = await pool.query('SELECT COUNT(*) as users_count FROM users');
    const [[{ posts_count }]] = await pool.query('SELECT COUNT(*) as posts_count FROM posts');
    const [[{ communities_count }]] = await pool.query('SELECT COUNT(*) as communities_count FROM communities');
    const [[{ blood_requests_count }]] = await pool.query('SELECT COUNT(*) as blood_requests_count FROM blood_requests');
    
    res.json({
      users: users_count,
      posts: posts_count,
      communities: communities_count,
      bloodRequests: blood_requests_count
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, is_admin, created_at, profile_picture, is_medical_professional FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/users/:id/promote', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_admin = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User promoted to admin' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/posts', authenticate, isAdmin, async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, u.username as author_name, c.name as community_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN communities c ON p.community_id = c.id
      ORDER BY p.created_at DESC LIMIT 100
    `);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/posts/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/communities', authenticate, isAdmin, async (req, res) => {
  try {
    const [communities] = await pool.query(`
      SELECT c.*, u.username as creator_name
      FROM communities c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `);
    res.json(communities);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/communities/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM communities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Community deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/blood-requests', authenticate, isAdmin, async (req, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT b.*, u.username as requester_name
      FROM blood_requests b
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/blood-requests/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM blood_requests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Blood request deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/medical-requests', authenticate, isAdmin, async (req, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT id, username, email, profile_picture, created_at 
      FROM users 
      WHERE medical_verification_status = 'pending'
      ORDER BY created_at DESC
    `);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/users/:id/approve-medical', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE users SET is_medical_professional = 1, medical_verification_status = 'approved' WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Medical verification approved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/users/:id/reject-medical', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE users SET is_medical_professional = 0, medical_verification_status = 'rejected' WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Medical verification rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/medical-verified-users', authenticate, isAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT id, username, email, profile_picture, created_at 
      FROM users 
      WHERE medical_verification_status = 'approved'
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/users/:id/unverify-medical', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE users SET is_medical_professional = 0, medical_verification_status = 'none' WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Medical verification revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/health-shares', authenticate, isAdmin, async (req, res) => {
  try {
    const [shares] = await pool.query(`
      SELECT h.*, u.username as author_name 
      FROM health_shares h 
      LEFT JOIN users u ON h.author_id = u.id 
      ORDER BY h.created_at DESC
    `);
    res.json(shares);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/health-shares/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM health_shares WHERE id = ?', [req.params.id]);
    res.json({ message: 'Health share deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
