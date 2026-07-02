const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Create table on first load if it doesn't exist
const init = pool.query(`
  CREATE TABLE IF NOT EXISTS bookings (
    id            SERIAL PRIMARY KEY,
    booking_no    VARCHAR(30) UNIQUE NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_contact VARCHAR(20),
    event_type    VARCHAR(100),
    event_date    DATE,
    venue         VARCHAR(300),
    photo_by      VARCHAR(100),
    gross_total   NUMERIC(12,2) DEFAULT 0,
    advance       NUMERIC(12,2) DEFAULT 0,
    total_pending NUMERIC(12,2) DEFAULT 0,
    payment_mode  VARCHAR(30) DEFAULT 'Cash',
    status        VARCHAR(20) DEFAULT 'Pending',
    remark        TEXT,
    inquiry_date  DATE DEFAULT CURRENT_DATE,
    entered_by    INTEGER
  )
`).catch(err => console.error('bookings table init error:', err.message));

router.get('/', auth, async (req, res) => {
  await init;
  const { page=1, limit=25, search='', status='' } = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`(b.customer_name ILIKE $${i} OR b.booking_no ILIKE $${i} OR b.customer_contact ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (status) { where.push(`b.status=$${i}`); params.push(status); i++; }
    params.push(limit, offset);
    const q = `SELECT * FROM bookings b WHERE ${where.join(' AND ')} ORDER BY b.inquiry_date DESC, b.id DESC LIMIT $${i} OFFSET $${i+1}`;
    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM bookings b WHERE ${where.join(' AND ')}`, params.slice(0,-2))
    ]);
    // Stats
    const stats = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Confirmed') AS confirmed,
        COUNT(*) FILTER (WHERE status='Pending') AS pending,
        COALESCE(SUM(total_pending),0) AS due
      FROM bookings
    `);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), stats: stats.rows[0] });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM bookings WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const cnt = await pool.query('SELECT COUNT(*) FROM bookings');
    const booking_no = `BK-${String(parseInt(cnt.rows[0].count)+1).padStart(4,'0')}`;
    const { customer_name, customer_contact, event_type, event_date, venue, photo_by,
            gross_total, advance, payment_mode, status, remark } = req.body;
    const pending = (parseFloat(gross_total)||0) - (parseFloat(advance)||0);
    const r = await pool.query(
      `INSERT INTO bookings(booking_no,customer_name,customer_contact,event_type,event_date,venue,photo_by,
        gross_total,advance,total_pending,payment_mode,status,remark,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_DATE,$14) RETURNING *`,
      [booking_no, customer_name, customer_contact||'', event_type||'', event_date||null,
       venue||'', photo_by||'', gross_total||0, advance||0, pending, payment_mode||'Cash',
       status||'Pending', remark||'', req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { customer_name, customer_contact, event_type, event_date, venue, photo_by,
            gross_total, advance, payment_mode, status, remark } = req.body;
    const pending = (parseFloat(gross_total)||0) - (parseFloat(advance)||0);
    const r = await pool.query(
      `UPDATE bookings SET customer_name=$1,customer_contact=$2,event_type=$3,event_date=$4,
        venue=$5,photo_by=$6,gross_total=$7,advance=$8,total_pending=$9,payment_mode=$10,
        status=$11,remark=$12 WHERE id=$13 RETURNING *`,
      [customer_name, customer_contact||'', event_type||'', event_date||null,
       venue||'', photo_by||'', gross_total||0, advance||0, pending,
       payment_mode||'Cash', status||'Pending', remark||'', req.params.id]
    );
    res.json(r.rows[0]);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try { await pool.query('DELETE FROM bookings WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
