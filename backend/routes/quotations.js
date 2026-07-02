const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req,res)=>{
  const {page=1,limit=25,search=''} = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`(q.order_no ILIKE $${i} OR q.company_name ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT q.id,q.order_no,q.company_name AS party_name,q.event_type,q.inquiry_date,q.gross_total,q.advance,q.total_pending FROM quotations q WHERE ${where.join(' AND ')} ORDER BY q.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit,offset);
    const [data,count] = await Promise.all([
      pool.query(q,params),
      pool.query(`SELECT COUNT(*) FROM quotations q WHERE ${where.join(' AND ')}`,params.slice(0,-2))
    ]);
    res.json({data:data.rows,total:parseInt(count.rows[0].count)});
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM quotations WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
