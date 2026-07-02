const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req,res)=>{
  const {month, year} = req.query;
  const m = month || new Date().getMonth()+1;
  const y = year  || new Date().getFullYear();
  try {
    const r = await pool.query(`
      SELECT a.id,a.employee_id,a.inquiry_date,a.remark,u.username AS employee_name
      FROM attendance a
      LEFT JOIN app_users u ON a.employee_id=u.id
      WHERE EXTRACT(MONTH FROM a.inquiry_date)=$1 AND EXTRACT(YEAR FROM a.inquiry_date)=$2
      ORDER BY a.inquiry_date,u.username
    `,[m,y]);
    res.json(r.rows);
  } catch(err){res.status(500).json({error:err.message});}
});

router.post('/', auth, async (req,res)=>{
  try {
    const {employee_id, inquiry_date, remark} = req.body;
    const exists = await pool.query('SELECT id FROM attendance WHERE employee_id=$1 AND inquiry_date=$2',[employee_id,inquiry_date]);
    if (exists.rows.length) {
      await pool.query('UPDATE attendance SET remark=$1 WHERE id=$2',[remark||'P',exists.rows[0].id]);
    } else {
      await pool.query('INSERT INTO attendance(employee_id,inquiry_date,remark) VALUES($1,$2,$3)',[employee_id,inquiry_date,remark||'P']);
    }
    res.json({success:true});
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM attendance WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
