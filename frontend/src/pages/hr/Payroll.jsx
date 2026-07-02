import { useState, useEffect, useCallback } from 'react';
import { Wallet, Download } from 'lucide-react';
import api from '../../api/axios';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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
          <div className="stat-value" style={{color:'#2563eb'}}>{rows.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Salary Sheet — {MONTHS[month-1]} {year}</div>
        </div>
        <div className="card-body" style={{padding:0}}>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>EMPLOYEE</th>
                  <th style={{textAlign:'center'}}>DAYS</th>
                  <th style={{textAlign:'center'}}>PRESENT</th>
                  <th style={{textAlign:'center'}}>ABSENT</th>
                  <th style={{textAlign:'right'}}>GROSS SALARY</th>
                  <th style={{textAlign:'right'}}>ACTUAL SALARY</th>
                  <th style={{textAlign:'right'}}>DEDUCTION</th>
                  <th style={{textAlign:'right'}}>NET SALARY</th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="table-empty">
                      <Wallet size={36}/>
                      <p>No payroll data for {MONTHS[month-1]} {year}</p>
                    </td></tr>
                  )}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.employee_name || `Employee #${r.employee_id}`}</strong></td>
                      <td style={{textAlign:'center'}}>{r.total_days || '-'}</td>
                      <td style={{textAlign:'center'}}>
                        <span className="badge badge-green">{r.present_days || 0}</span>
                      </td>
                      <td style={{textAlign:'center'}}>
                        <span className="badge badge-red">{r.absent_days || 0}</span>
                      </td>
                      <td style={{textAlign:'right'}}>{cur(r.monthly_salary)}</td>
                      <td style={{textAlign:'right'}}>{cur(r.actual_salary)}</td>
                      <td style={{textAlign:'right',color:'#dc2626'}}>{cur(r.deduction)}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'#16a34a'}}>{cur(r.salary)}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr style={{background:'#f9fafb',fontWeight:700,borderTop:'2px solid #e5e7eb'}}>
                      <td colSpan={4}>Total ({rows.length} employees)</td>
                      <td style={{textAlign:'right'}}>{cur(totals.gross)}</td>
                      <td></td>
                      <td style={{textAlign:'right',color:'#dc2626'}}>{cur(totals.deduction)}</td>
                      <td style={{textAlign:'right',color:'#16a34a'}}>{cur(totals.net)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
