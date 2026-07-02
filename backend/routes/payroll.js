const router = require('express').Router();
const pool   = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { month, year } = req.query;
  const m = month || new Date().getMonth()+1;
  const y = year  || new Date().getFullYear();
  try {
    const r = await pool.query(`
      SELECT ep.*, u.username AS employee_name
      FROM employee_payroll ep
      LEFT JOIN app_users u ON ep.employee_id=u.id
      WHERE EXTRACT(MONTH FROM ep.salary_date)=$1 AND EXTRACT(YEAR FROM ep.salary_date)=$2
      ORDER BY u.username
    `, [m, y]);
    const rows = r.rows;
    const stats = {
      gross:     rows.reduce((s,r)=>s+parseFloat(r.monthly_salary||0),0),
      deduction: rows.reduce((s,r)=>s+parseFloat(r.deduction||0),0),
      net:       rows.reduce((s,r)=>s+parseFloat(r.salary||0),0),
      total_days: rows[0]?.total_days || 26
    };
    res.json({ data: rows, stats });
  } catch(err){ res.status(500).json({ error: err.message }); }
});

module.exports = router;
