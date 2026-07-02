const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

pool.query(`ALTER TABLE exposing_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(30) DEFAULT 'Photos'`).catch(() => {});

router.get('/', auth, async (req,res) => {
  const { page=1, limit=25, search='', job_type='' } = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search)   { where.push(`(e.party_name ILIKE $${i} OR e.contact ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (job_type) { where.push(`e.job_type=$${i}`); params.push(job_type); i++; }
    const q = `SELECT e.id,e.party_name,e.contact,e.inquiry_date,e.subtotal,e.remark,e.job_type,
                      COUNT(ei.id) AS item_count
               FROM exposing_jobs e LEFT JOIN exposing_items ei ON ei.exposing_job_id=e.id
               WHERE ${where.join(' AND ')}
               GROUP BY e.id ORDER BY e.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM exposing_jobs e WHERE ${where.join(' AND ')}`, params.slice(0,-2))
    ]);
    const stats = await pool.query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(subtotal),0) AS total_value,
      COUNT(*) FILTER (WHERE job_type='Photos') AS photos,
      COUNT(*) FILTER (WHERE job_type='Album') AS album
      FROM exposing_jobs`);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), stats: stats.rows[0] });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req,res) => {
  try {
    const e = await pool.query('SELECT * FROM exposing_jobs WHERE id=$1', [req.params.id]);
    if (!e.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query('SELECT * FROM exposing_items WHERE exposing_job_id=$1', [req.params.id]);
    res.json({ ...e.rows[0], items: items.rows });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { party_name, contact, address, job_type, remark, items=[] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subtotal = items.reduce((s,it) => s + parseFloat(it.amount||0), 0);
    const job = await client.query(
      `INSERT INTO exposing_jobs(party_name,contact,address,job_type,subtotal,remark,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$5,$6,CURRENT_DATE,$7) RETURNING *`,
      [party_name, contact||'', address||'', job_type||'Photos', subtotal, remark||'', req.user.id]
    );
    const jid = job.rows[0].id;
    for (const it of items) {
      await client.query(
        `INSERT INTO exposing_items(exposing_job_id,file_name,order_date,paid_amount,net_amount,amount)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [jid, it.file_name||'', it.order_date||null, it.paid_amount||0, it.net_amount||0, it.amount||0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(job.rows[0]);
  } catch(err){ await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.delete('/:id', auth, async (req,res) => {
  try {
    await pool.query('DELETE FROM exposing_items WHERE exposing_job_id=$1', [req.params.id]);
    await pool.query('DELETE FROM exposing_jobs WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
