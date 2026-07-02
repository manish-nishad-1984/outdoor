const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { search = '' } = req.query;
  try {
    let where = ['1=1'], params = [], i = 1;
    if (search) { where.push(`(a.account_name ILIKE $${i} OR a.mobile_no ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const result = await pool.query(
      `SELECT a.id,a.account_name,a.mobile_no,a.email,a.permanent_address,a.opening_balance,a.credit_debit,a.remark,a.status_flag FROM accounts a WHERE ${where.join(' AND ')} ORDER BY a.account_name`,
      params
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { account_name, mobile_no, email, permanent_address, opening_balance, credit_debit, remark } = req.body;
    const result = await pool.query(
      `INSERT INTO accounts(account_name,mobile_no,email,permanent_address,opening_balance,credit_debit,remark,status_flag,entered_by) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8) RETURNING *`,
      [account_name, mobile_no||'', email||'', permanent_address||'', opening_balance||0, credit_debit||'Dr', remark||'', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { account_name, mobile_no, email, permanent_address, opening_balance, credit_debit, remark, status_flag } = req.body;
    const result = await pool.query(
      `UPDATE accounts SET account_name=$1,mobile_no=$2,email=$3,permanent_address=$4,opening_balance=$5,credit_debit=$6,remark=$7,status_flag=$8 WHERE id=$9 RETURNING *`,
      [account_name, mobile_no||'', email||'', permanent_address||'', opening_balance||0, credit_debit||'Dr', remark||'', status_flag!==false, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req,res)=>{
  try { await pool.query('DELETE FROM accounts WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
