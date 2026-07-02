const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { page=1, limit=25, search='' } = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`p.booking_no ILIKE $${i}`); params.push(`%${search}%`); i++; }
    const q = `SELECT p.id,p.booking_no,p.inquiry_date,p.gross_total,p.discount_rs,a.account_name AS party_name FROM purchases p LEFT JOIN accounts a ON p.party_id=a.id WHERE ${where.join(' AND ')} ORDER BY p.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit,offset);
    const [data,count] = await Promise.all([
      pool.query(q,params),
      pool.query(`SELECT COUNT(*) FROM purchases p WHERE ${where.join(' AND ')}`,params.slice(0,-2))
    ]);
    res.json({data:data.rows,total:parseInt(count.rows[0].count)});
  } catch(err){res.status(500).json({error:err.message});}
});

router.get('/:id', auth, async (req,res)=>{
  try {
    const p = await pool.query('SELECT p.*,a.account_name AS party_name FROM purchases p LEFT JOIN accounts a ON p.party_id=a.id WHERE p.id=$1',[req.params.id]);
    if(!p.rows.length) return res.status(404).json({error:'Not found'});
    const items = await pool.query('SELECT * FROM purchase_items WHERE purchase_id=$1',[req.params.id]);
    res.json({...p.rows[0],items:items.rows});
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM purchases WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
