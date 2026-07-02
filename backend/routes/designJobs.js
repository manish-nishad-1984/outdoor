const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req,res)=>{
  const {page=1,limit=25,search=''} = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`di.couple_name ILIKE $${i}`); params.push(`%${search}%`); i++; }
    const q = `SELECT d.id,d.inquiry_date,d.subtotal,u.username AS employee_name,COUNT(di.id) AS item_count FROM design_jobs d LEFT JOIN app_users u ON d.employee_id=u.id LEFT JOIN design_job_items di ON di.design_job_id=d.id WHERE ${where.join(' AND ')} GROUP BY d.id,u.username ORDER BY d.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit,offset);
    const [data,count] = await Promise.all([
      pool.query(q,params),
      pool.query(`SELECT COUNT(DISTINCT d.id) FROM design_jobs d LEFT JOIN design_job_items di ON di.design_job_id=d.id WHERE ${where.join(' AND ')}`,params.slice(0,-2))
    ]);
    res.json({data:data.rows,total:parseInt(count.rows[0].count)});
  } catch(err){res.status(500).json({error:err.message});}
});

router.get('/:id', auth, async (req,res)=>{
  try {
    const d = await pool.query('SELECT * FROM design_jobs WHERE id=$1',[req.params.id]);
    if(!d.rows.length) return res.status(404).json({error:'Not found'});
    const items = await pool.query('SELECT * FROM design_job_items WHERE design_job_id=$1',[req.params.id]);
    res.json({...d.rows[0],items:items.rows});
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM design_jobs WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
