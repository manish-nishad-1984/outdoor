const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { search = '', type = '' } = req.query;
  try {
    let where = ['1=1']; let params = []; let i = 1;
    if (search) { where.push(`(a.name ILIKE $${i} OR a.mobile ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (type) { where.push(`a.party_type = $${i}`); params.push(type); i++; }
    const result = await pool.query(`SELECT a.*, ag.name AS group_name FROM accounts a LEFT JOIN account_groups ag ON a.group_id=ag.id WHERE ${where.join(' AND ')} ORDER BY a.name`, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, mobile, email, address, party_type, group_id, gst_no } = req.body;
    const result = await pool.query(`
      INSERT INTO accounts (name,mobile,email,address,party_type,group_id,gst_no,entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [name, mobile, email, address, party_type, group_id, gst_no, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, mobile, email, address, gst_no } = req.body;
    const result = await pool.query(`UPDATE accounts SET name=$1,mobile=$2,email=$3,address=$4,gst_no=$5,updated_by=$6,updated_at=NOW() WHERE id=$7 RETURNING *`,
      [name, mobile, email, address, gst_no, req.user.id, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
