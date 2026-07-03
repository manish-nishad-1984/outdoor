const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { page=1, limit=25, search='' } = req.query;
  const offset = (page-1)*limit;
  try {
    let where=['1=1'], params=[], i=1;
    if (search) { where.push(`(s.order_no ILIKE $${i} OR s.customer_address ILIKE $${i} OR s.customer_contact ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT s.id,s.order_no,s.customer_address AS customer_name,s.customer_contact,s.inquiry_date,s.gross_total,s.status FROM studio_orders s WHERE ${where.join(' AND ')} ORDER BY s.inquiry_date DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit,offset);
    const [data,count] = await Promise.all([
      pool.query(q,params),
      pool.query(`SELECT COUNT(*) FROM studio_orders s WHERE ${where.join(' AND ')}`,params.slice(0,-2))
    ]);
    res.json({data:data.rows,total:parseInt(count.rows[0].count)});
  } catch(err){res.status(500).json({error:err.message});}
});

router.get('/:id', auth, async (req,res)=>{
  try {
    const s = await pool.query('SELECT * FROM studio_orders WHERE id=$1',[req.params.id]);
    if(!s.rows.length) return res.status(404).json({error:'Not found'});
    const items = await pool.query('SELECT * FROM studio_order_items WHERE studio_order_id=$1',[req.params.id]);
    res.json({...s.rows[0],items:items.rows});
  } catch(err){res.status(500).json({error:err.message});}
});

router.post('/', auth, async (req,res)=>{
  try {
    const {customer_name,customer_contact,order_date,delivery_date,gross_total} = req.body;
    const cnt = await pool.query('SELECT COUNT(*) FROM studio_orders');
    const order_no = `STU-${String(parseInt(cnt.rows[0].count)+1).padStart(3,'0')}`;
    const r = await pool.query(
      `INSERT INTO studio_orders(order_no,customer_address,customer_contact,inquiry_date,delivery_date,gross_total,subtotal) VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [order_no,customer_name,customer_contact,order_date||new Date(),delivery_date,gross_total||0]
    );
    res.status(201).json(r.rows[0]);
  } catch(err){res.status(500).json({error:err.message});}
});

router.put('/:id', auth, async (req,res)=>{
  try {
    const {customer_name,customer_contact,delivery_date,gross_total,status} = req.body;
    const r = await pool.query(
      `UPDATE studio_orders SET customer_address=$1,customer_contact=$2,delivery_date=$3,gross_total=$4,subtotal=$4,status=$5 WHERE id=$6 RETURNING *`,
      [customer_name,customer_contact,delivery_date,gross_total||0,status||false,req.params.id]
    );
    res.json(r.rows[0]);
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM studio_orders WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
