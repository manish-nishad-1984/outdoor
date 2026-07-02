const router = require('express').Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM app_users WHERE username = $1',
      [username]
    );
    if (!result.rows.length)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.username, role: user.user_type }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, user_type FROM app_users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', require('../middleware/auth'), async (req, res) => {
  const { username, password, user_type } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO app_users(username,password_hash,user_type) VALUES($1,$2,$3) RETURNING id,username,user_type`,
      [username, hash, user_type||'operator']
    );
    res.status(201).json(r.rows[0]);
  } catch(err){
    res.status(err.code==='23505'?409:500).json({ error: err.code==='23505'?'Username already exists':err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  const { current, password } = req.body;
  try {
    const u = await pool.query('SELECT password_hash FROM app_users WHERE id=$1', [req.user.id]);
    if (!u.rows.length) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(current, u.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ success: true });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
