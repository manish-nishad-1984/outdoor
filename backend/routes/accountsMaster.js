const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { search='' } = req.query;
  try {
    let where=['a.delete_flag=false'], params=[], i=1;
    if (search) { where.push(`(a.account_name ILIKE $${i} OR a.mobile_no ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const r = await pool.query(`SELECT a.id,a.account_name,a.mobile_no,a.opening_balance,a.credit_debit,a.status_flag,g.group_name FROM accounts a LEFT JOIN account_groups g ON a.agent_id=g.id WHERE ${where.join(' AND ')} ORDER BY a.account_name`,params);
    res.json(r.rows);
  } catch(err){res.status(500).json({error:err.message});}
});

router.post('/', auth, async (req,res)=>{
  try {
    const {account_name,mobile_no,opening_balance,credit_debit,remark} = req.body;
    const r = await pool.query(
      `INSERT INTO accounts(account_name,mobile_no,opening_balance,credit_debit,remark,delete_flag,status_flag,entered_by) VALUES($1,$2,$3,$4,$5,false,true,$6) RETURNING *`,
      [account_name,mobile_no||'',opening_balance||0,credit_debit||'Dr',remark||'',req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch(err){res.status(500).json({error:err.message});}
});

router.put('/:id', auth, async (req,res)=>{
  try {
    const {account_name,mobile_no,opening_balance,credit_debit,remark,status_flag} = req.body;
    const r = await pool.query(
      `UPDATE accounts SET account_name=$1,mobile_no=$2,opening_balance=$3,credit_debit=$4,remark=$5,status_flag=$6,updated_by=$7 WHERE id=$8 RETURNING *`,
      [account_name,mobile_no||'',opening_balance||0,credit_debit||'Dr',remark||'',status_flag!==false,req.user.id,req.params.id]
    );
    res.json(r.rows[0]);
  } catch(err){res.status(500).json({error:err.message});}
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('UPDATE accounts SET delete_flag=true WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
