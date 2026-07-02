const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

// Ensure extra columns exist
pool.query(`
  ALTER TABLE design_jobs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending';
  ALTER TABLE design_jobs ADD COLUMN IF NOT EXISTS due_date DATE;
  ALTER TABLE design_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'Album';
`).catch(() => {});

router.get('/', auth, async (req,res) => {
  const { page=1, limit=25, search='', status='', job_type='' } = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search)   { where.push(`(di.couple_name ILIKE $${i} OR di.item_name ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (status)   { where.push(`d.status=$${i}`); params.push(status); i++; }
    if (job_type) { where.push(`d.job_type=$${i}`); params.push(job_type); i++; }
    const q = `SELECT d.id,d.inquiry_date,d.due_date,d.status,d.job_type,d.subtotal,
                      u.username AS employee_name,COUNT(di.id) AS item_count,
                      MAX(di.couple_name) AS couple_name
               FROM design_jobs d
               LEFT JOIN app_users u ON d.employee_id=u.id
               LEFT JOIN design_job_items di ON di.design_job_id=d.id
               WHERE ${where.join(' AND ')}
               GROUP BY d.id,u.username ORDER BY d.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(DISTINCT d.id) FROM design_jobs d LEFT JOIN design_job_items di ON di.design_job_id=d.id WHERE ${where.join(' AND ')}`, params.slice(0,-2))
    ]);
    // Mark overdue
    const now = new Date();
    const rows = data.rows.map(r => ({
      ...r,
      status: r.status !== 'Completed' && r.due_date && new Date(r.due_date) < now ? 'Overdue' : r.status
    }));
    // Stats
    const st = await pool.query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status='Pending') AS pending,
      COUNT(*) FILTER (WHERE status='In Progress') AS in_progress,
      COUNT(*) FILTER (WHERE status='Completed') AS completed
      FROM design_jobs`);
    res.json({ data: rows, total: parseInt(count.rows[0].count), stats: st.rows[0] });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req,res) => {
  try {
    const d = await pool.query('SELECT * FROM design_jobs WHERE id=$1', [req.params.id]);
    if (!d.rows.length) return res.status(404).json({ error: 'Not found' });
    const items = await pool.query('SELECT * FROM design_job_items WHERE design_job_id=$1', [req.params.id]);
    res.json({ ...d.rows[0], items: items.rows });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { employee_id, job_type, due_date, status, items=[] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subtotal = items.reduce((s,it) => s + parseFloat(it.total||0), 0);
    const job = await client.query(
      `INSERT INTO design_jobs(employee_id,job_type,due_date,status,subtotal,inquiry_date,entered_by)
       VALUES($1,$2,$3,$4,$5,CURRENT_DATE,$6) RETURNING *`,
      [employee_id||null, job_type||'Album', due_date||null, status||'Pending', subtotal, req.user.id]
    );
    const jid = job.rows[0].id;
    for (const it of items) {
      await client.query(
        `INSERT INTO design_job_items(design_job_id,couple_name,item_name,job_no,studio_name,unit,quantity,rate,total)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [jid, it.couple_name||'', it.item_name||'', it.job_no||'', it.studio_name||'', it.unit||'pcs', it.quantity||1, it.rate||0, it.total||0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(job.rows[0]);
  } catch(err){ await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    await pool.query('UPDATE design_jobs SET status=$1 WHERE id=$2', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req,res) => {
  try {
    await pool.query('DELETE FROM design_job_items WHERE design_job_id=$1', [req.params.id]);
    await pool.query('DELETE FROM design_jobs WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
