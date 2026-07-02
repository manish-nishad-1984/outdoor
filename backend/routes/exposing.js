const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req,res)=>{
  const {page=1,limit=25,search=''} = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`(e.party_name ILIKE $${i} OR e.contact ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT e.id,e.party_name,e.contact,e.inquiry_date,e.subtotal,e.remark FROM exposing_jobs e WHERE ${where.join(' AND ')} ORDER BY e.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit,offset);
    const [data,count] = await Promise.all([
      pool.query(q,params),
      pool.query(`SELECT COUNT(*) FROM exposing_jobs e WHERE ${where.join(' AND ')}`,params.slice(0,-2))
    ]);
    res.json({data:data.rows,total:parseInt(count.rows[0].count)});
  } catch(err){res.status(500).json({error:err.message});}
});

router.get('/:id', auth, async (req,res)=>{
  try {
    const e = await pool.query('SELECT * FROM exposing_jobs WHERE id=$1',[req.params.id]);
    if(!e.rows.length) return res.status(404).json({error:'Not found'});
    const items = await pool.query('SELECT * FROM exposing_items WHERE exposing_job_id=$1',[req.params.id]);
    res.json({...e.rows[0],items:items.rows});
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM exposing_jobs WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
