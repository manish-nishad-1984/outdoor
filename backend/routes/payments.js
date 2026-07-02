const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { page=1, limit=25, search='' } = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`(a.account_name ILIKE $${i} OR p.voucher_no ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT p.id,p.voucher_no,p.amount,p.payment_type,p.payment_date,p.cheque_no,p.remark,a.account_name AS party_name
               FROM payments p LEFT JOIN accounts a ON p.party_id=a.id
               WHERE ${where.join(' AND ')} ORDER BY p.payment_date DESC, p.id DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count, stats] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM payments p LEFT JOIN accounts a ON p.party_id=a.id WHERE ${where.join(' AND ')}`, params.slice(0,-2)),
      pool.query(`SELECT
        COALESCE(SUM(amount),0) AS total,
        COALESCE(SUM(amount) FILTER (WHERE payment_type='Cash'),0) AS cash,
        COALESCE(SUM(amount) FILTER (WHERE payment_type='UPI'),0) AS upi,
        COALESCE(SUM(amount) FILTER (WHERE payment_type='Cheque'),0) AS cheque
        FROM payments`)
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), stats: stats.rows[0] });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.get('/accounts-list', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, account_name FROM accounts WHERE status_flag=true ORDER BY account_name`);
    res.json(r.rows);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { voucher_no, party_id, amount, payment_type, payment_date, cheque_no, remark } = req.body;
  try {
    let vno = voucher_no;
    if (!vno) {
      const cnt = await pool.query('SELECT COUNT(*) FROM payments');
      vno = `PAY-${String(parseInt(cnt.rows[0].count)+1).padStart(4,'0')}`;
    }
    const r = await pool.query(
      `INSERT INTO payments(voucher_no,party_id,amount,payment_type,payment_date,cheque_no,remark,inquiry_date)
       VALUES($1,$2,$3,$4,$5,$6,$7,$5) RETURNING *`,
      [vno, party_id||null, amount, payment_type||'Cash', payment_date, cheque_no||null, remark||'']
    );
    res.status(201).json(r.rows[0]);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req,res) => {
  try { await pool.query('DELETE FROM payments WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
