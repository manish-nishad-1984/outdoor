import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import DataGrid, { formatCurrency } from '../../components/grid/DataGrid';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const COLUMNS = [
  { key: 'employee_name', header: 'Employee', width: 220, strong: true, value: r => r.employee_name || `Employee #${r.employee_id}` },
  { key: 'total_days', header: 'Days', width: 80, align: 'center' },
  { key: 'present_days', header: 'Present', width: 90, align: 'center', total: 'sum', format: 'number',
    cell: r => <span className="badge badge-green">{r.present_days || 0}</span> },
  { key: 'absent_days', header: 'Absent', width: 90, align: 'center', total: 'sum', format: 'number',
    cell: r => <span className="badge badge-red">{r.absent_days || 0}</span> },
  { key: 'monthly_salary', header: 'Gross Salary', width: 130, format: 'currency', total: 'sum' },
  { key: 'actual_salary', header: 'Actual Salary', width: 130, format: 'currency' },
  { key: 'deduction', header: 'Deduction', width: 120, format: 'currency', total: 'sum',
    cell: r => <span className="dg-neg">{formatCurrency(r.deduction)}</span> },
  { key: 'salary', header: 'Net Salary', width: 130, format: 'currency', total: 'sum',
    cell: r => <span className="dg-pos">{formatCurrency(r.salary)}</span> },
];

export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear]   = useState(now.getFullYear());
  const [rows, setRows]   = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const years = [now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/payroll', { params: { month, year } });
      setRows(r.data.data || []);
      setStats(r.data.stats || {});
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '₹0';

  const totals = {
    gross:     rows.reduce((s,r)=>s+parseFloat(r.monthly_salary||0),0),
    deduction: rows.reduce((s,r)=>s+parseFloat(r.deduction||0),0),
    net:       rows.reduce((s,r)=>s+parseFloat(r.salary||0),0),
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Salary sheet — {MONTHS[month-1]} {year}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <select className="form-select" value={month} onChange={e=>setMonth(+e.target.value)}>
            {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e=>setYear(+e.target.value)}>
            {years.map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent">
          <div className="stat-label">GROSS PAYROLL</div>
          <div className="stat-value">{cur(totals.gross)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">DEDUCTIONS</div>
          <div className="stat-value" style={{color:'#dc2626'}}>{cur(totals.deduction)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">NET PAYABLE</div>
          <div className="stat-value" style={{color:'#16a34a'}}>{cur(totals.net)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">EMPLOYEES</div>
          <div className="stat-value" style={{color:'hsl(var(--primary))'}}>{rows.length}</div>
        </div>
      </div>

      <DataGrid
        id="payroll"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'employee_name', desc: false }]}
        searchPlaceholder="Search employee…"
        emptyText={`No payroll data for ${MONTHS[month-1]} ${year}`}
        exportName={`payroll-${MONTHS[month-1]}-${year}`}
      />
    </div>
  );
}
