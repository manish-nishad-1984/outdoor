import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import api from '../../api/axios';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Attendance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear]   = useState(now.getFullYear());
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/attendance', { params: { month, year } });
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';

  const byEmployee = rows.reduce((acc, r) => {
    const key = r.employee_name || `Emp #${r.employee_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const years = [now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">{rows.length} records for {MONTHS[month-1]} {year}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="table-loading">Loadingâ€¦</div> : (
        Object.keys(byEmployee).length === 0
          ? <div className="card"><div className="card-body"><div className="table-empty"><Clock size={32}/><p>No attendance records for this period</p></div></div></div>
          : Object.entries(byEmployee).map(([emp, records]) => (
            <div className="card" key={emp} style={{marginBottom:16}}>
              <div className="card-body">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <h3 style={{fontSize:14,fontWeight:600,color:'#111827'}}>{emp}</h3>
                  <div style={{display:'flex',gap:8}}>
                    <span className="badge badge-green">P: {records.filter(r=>r.remark==='P'||!r.remark).length}</span>
                    <span className="badge badge-red">A: {records.filter(r=>r.remark==='A').length}</span>
                    <span className="badge badge-yellow">H: {records.filter(r=>r.remark==='H').length}</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>DATE</th><th>STATUS</th></tr></thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id}>
                          <td>{fmt(r.inquiry_date)}</td>
                          <td>
                            <span className={`badge ${r.remark==='A'?'badge-red':r.remark==='H'?'badge-yellow':'badge-green'}`}>
                              {r.remark==='A'?'Absent':r.remark==='H'?'Half Day':'Present'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  );
}
