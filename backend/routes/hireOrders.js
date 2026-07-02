const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req,res)=>{
  const {page=1,limit=25,search=''} = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`(h.customer_name ILIKE $${i} OR h.order_contact ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT h.id,h.customer_name,h.order_contact,h.inquiry_date,h.gross_total,h.remark FROM hire_orders h WHERE ${where.join(' AND ')} ORDER BY h.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit,offset);
    const [data,count] = await Promise.all([
      pool.query(q,params),
      pool.query(`SELECT COUNT(*) FROM hire_orders h WHERE ${where.join(' AND ')}`,params.slice(0,-2))
    ]);
    res.json({data:data.rows,total:parseInt(count.rows[0].count)});
  } catch(err){res.status(500).json({error:err.message});}
});

router.get('/:id', auth, async (req,res)=>{
  try {
    const h = await pool.query('SELECT * FROM hire_orders WHERE id=$1',[req.params.id]);
    if(!h.rows.length) return res.status(404).json({error:'Not found'});
    const items = await pool.query('SELECT * FROM hire_order_items WHERE hire_order_id=$1',[req.params.id]);
    res.json({...h.rows[0],items:items.rows});
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM hire_orders WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
