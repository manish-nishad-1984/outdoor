const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

const init = pool.query(`
  CREATE TABLE IF NOT EXISTS accounts (
    id                 SERIAL PRIMARY KEY,
    account_name       VARCHAR(200) NOT NULL,
    agent_id           INTEGER,
    mobile_no          VARCHAR(20),
    email              VARCHAR(255),
    permanent_address  TEXT,
    opening_balance    NUMERIC(14,2) DEFAULT 0,
    credit_debit       VARCHAR(10) DEFAULT 'Dr',
    remark             VARCHAR(255),
    delete_flag        BOOLEAN DEFAULT false,
    status_flag        BOOLEAN DEFAULT true,
    entered_by         INTEGER,
    updated_by         INTEGER
  );
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS agent_id            INTEGER;
  -- agent_id links to account_groups (the Account Group master), not the unrelated/unused
  -- "agents" table a stale FK on this column pointed at.
  ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_agent_id_fkey;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS delete_flag         BOOLEAN DEFAULT false;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS entered_by          INTEGER;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_by          INTEGER;
  -- Party panel (EXPOSER/PARTY, CUSTOMER, CLIENT, RAW PARTY)
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS contact_name        VARCHAR(200);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gst_no              VARCHAR(50);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pan_no              VARCHAR(50);
  -- EXPOSER/PARTY-only extras
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS rate                NUMERIC(14,2);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS item_id             INTEGER;
  -- CUSTOMER-only extra
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit        NUMERIC(14,2);
  -- Employee panel
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS emp_address         TEXT;
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS emp_contact         VARCHAR(20);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS salary_type         VARCHAR(20);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS salary              NUMERIC(14,2);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS designation         VARCHAR(100);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS commission          NUMERIC(14,2);
  -- Partner panel
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS partner_profit_pct  NUMERIC(6,2);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS partner_loss_pct    NUMERIC(6,2);
  -- Bank panel
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_name           VARCHAR(200);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_type           VARCHAR(20);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_branch         VARCHAR(200);
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_account_no     VARCHAR(50);
  -- Loan panel
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS interest_rate       NUMERIC(6,2);
  -- Not Use flag (legacy DISPL)
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS not_use             BOOLEAN DEFAULT false;
`).catch(err => console.error('accounts table init error:', err.message));

const FIELDS = [
  'account_name', 'agent_id', 'mobile_no', 'email', 'permanent_address', 'opening_balance',
  'credit_debit', 'remark', 'contact_name', 'gst_no', 'pan_no', 'rate', 'item_id', 'credit_limit',
  'emp_address', 'emp_contact', 'salary_type', 'salary', 'designation', 'commission',
  'partner_profit_pct', 'partner_loss_pct', 'bank_name', 'bank_type', 'bank_branch',
  'bank_account_no', 'interest_rate', 'not_use',
];

router.get('/', auth, async (req, res) => {
  await init;
  const { search = '', group_id = '' } = req.query;
  try {
    let where = ['a.delete_flag=false'], params = [], i = 1;
    if (search) { where.push(`(a.account_name ILIKE $${i} OR a.mobile_no ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (group_id) { where.push(`a.agent_id=$${i}`); params.push(group_id); i++; }
    const result = await pool.query(
      `SELECT a.*, g.group_name
       FROM accounts a LEFT JOIN account_groups g ON a.agent_id=g.id
       WHERE ${where.join(' AND ')} ORDER BY a.account_name`,
      params
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  await init;
  try {
    const { account_name } = req.body;
    if (!account_name) return res.status(400).json({ error: 'Account name required' });

    const cols = ['delete_flag', 'status_flag', 'entered_by'];
    const vals = [false, true, req.user.id];
    for (const f of FIELDS) {
      cols.push(f);
      let v = req.body[f];
      if (v === undefined || v === '') v = null;
      vals.push(v);
    }
    const placeholders = vals.map((_, idx) => `$${idx + 1}`).join(',');
    const result = await pool.query(
      `INSERT INTO accounts(${cols.join(',')}) VALUES(${placeholders}) RETURNING *`,
      vals
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  await init;
  try {
    const { account_name, status_flag } = req.body;
    if (!account_name) return res.status(400).json({ error: 'Account name required' });

    const setCols = ['account_name=$1', 'status_flag=$2', 'updated_by=$3'];
    const vals = [account_name, status_flag !== false, req.user.id];
    let i = vals.length + 1;
    for (const f of FIELDS) {
      if (f === 'account_name') continue;
      setCols.push(`${f}=$${i}`);
      let v = req.body[f];
      if (v === undefined || v === '') v = null;
      vals.push(v);
      i++;
    }
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE accounts SET ${setCols.join(',')} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req,res)=>{
  await init;
  try { await pool.query('UPDATE accounts SET delete_flag=true WHERE id=$1',[req.params.id]); res.json({success:true}); }
  catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
