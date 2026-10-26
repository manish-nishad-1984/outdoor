import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import DataGrid from '../../components/grid/DataGrid';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_MAP = { P: 'Present', A: 'Absent', L: 'Leave', H: 'Half Day' };
const BADGE = { P: 'badge-green', A: 'badge-red', L: 'badge-yellow', H: 'badge-orange' };

export default function Attendance() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear]   = useState(now.getFullYear());
  const [rows, setRows]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({});
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(false);
  const years = [now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, empRes] = await Promise.all([
        api.get('/attendance', { params: { month, year } }),
        api.get('/employees').catch(() => ({ data: [] }))
      ]);
      setRows(attRes.data || []);
      // Build today's map
      const todayRecs = (attRes.data || []).filter(r => r.inquiry_date?.slice(0,10) === todayStr);
      const map = {};
      todayRecs.forEach(r => { map[r.employee_id] = r.remark || 'P'; });
      setTodayAttendance(map);
      const emps = empRes.data || [];
      setEmployees(emps.length ? emps : []);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [month, year, todayStr]);

  useEffect(() => { load(); }, [load]);

  const mark = async (empId, status) => {
    setSaving(s => ({ ...s, [empId]: true }));
    try {
      await api.post('/attendance', { employee_id: empId, inquiry_date: todayStr, remark: status });
      setTodayAttendance(m => ({ ...m, [empId]: status }));
    } catch(e){ alert('Failed to mark attendance'); }
    finally { setSaving(s => ({ ...s, [empId]: false })); }
  };

  // Build per-employee monthly summary
  const byEmployee = rows.reduce((acc, r) => {
    const key = r.employee_id;
    if (!acc[key]) acc[key] = { name: r.employee_name || `Emp #${key}`, records: [] };
    acc[key].records.push(r);
    return acc;
  }, {});

  const summary = Object.entries(byEmployee).map(([id, { name, records }]) => ({
    id: +id, name,
    present:  records.filter(r => r.remark==='P' || !r.remark).length,
    absent:   records.filter(r => r.remark==='A').length,
    leave:    records.filter(r => r.remark==='L').length,
    half:     records.filter(r => r.remark==='H').length,
    total:    records.length
  }));

  const daysInMonth = new Date(year, month, 0).getDate();
  const pct = n => daysInMonth > 0 ? Math.round((n/daysInMonth)*100) : 0;

  // For Mark Today, use summary employees + employees from /employees if any
  const markEmployees = summary.length > 0
    ? summary
    : employees.map(e => ({ id: e.id, name: e.username || e.name || `User ${e.id}`, present:0,absent:0,leave:0,half:0,total:0 }));

  // The % column depends on the selected month's length, so the specs are built per render.
  const summaryColumns = useMemo(() => [
    { key: 'name', header: 'Employee', width: 220, strong: true },
    { key: 'present', header: 'Present', width: 90, align: 'center', format: 'number', total: 'sum',
      cell: e => <span className="badge badge-green">{e.present}</span> },
    { key: 'absent', header: 'Absent', width: 90, align: 'center', format: 'number', total: 'sum',
      cell: e => <span className="badge badge-red">{e.absent}</span> },
    { key: 'leave', header: 'Leave', width: 90, align: 'center', format: 'number', total: 'sum',
      cell: e => <span className="badge badge-yellow">{e.leave}</span> },
    { key: 'half', header: 'Half Day', width: 90, align: 'center', format: 'number', total: 'sum',
      cell: e => <span className="badge badge-orange">{e.half}</span> },
    { key: 'pct', header: '%', width: 80, align: 'center', value: e => pct(e.present),
      cell: e => <span className={pct(e.present) >= 80 ? 'dg-pos' : 'dg-neg'}>{pct(e.present)}%</span> },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [daysInMonth]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Monthly attendance register — {MONTHS[month-1]} {year}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent">
          <div className="stat-label">WORKING DAYS</div>
          <div className="stat-value">{daysInMonth}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">EMPLOYEES</div>
          <div className="stat-value" style={{color:'hsl(var(--primary))'}}>{summary.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TOTAL PRESENT (TODAY)</div>
          <div className="stat-value" style={{color:'#16a34a'}}>
            {Object.values(todayAttendance).filter(v=>v==='P').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TOTAL ABSENT (TODAY)</div>
          <div className="stat-value" style={{color:'#dc2626'}}>
            {Object.values(todayAttendance).filter(v=>v==='A').length}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>

        {/* Monthly Summary */}
        <DataGrid
          id="attendance"
          columns={summaryColumns}
          data={summary}
          loading={loading}
          defaultSort={[{ id: 'name', desc: false }]}
          searchPlaceholder="Search employee…"
          emptyText="No attendance data for this period"
        />

        {/* Mark Today */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Mark Today</div>
            <span className="badge badge-blue">{todayStr}</span>
          </div>
          <div className="card-body" style={{padding:0}}>
            {markEmployees.length === 0 ? (
              <div style={{padding:24,textAlign:'center',color:'#6b7280',fontSize:13}}>
                No employees found. Attendance data will appear after first mark.
              </div>
            ) : (
              <div>
                {markEmployees.map(emp => {
                  const current = todayAttendance[emp.id];
                  return (
                    <div key={emp.id} style={{
                      display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'10px 16px',borderBottom:'1px solid #f3f4f6'
                    }}>
                      <div>
                        <div style={{fontWeight:600,fontSize:13,color:'#111827'}}>{emp.name}</div>
                        {current && (
                          <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>
                            <span className={`badge ${BADGE[current]}`} style={{fontSize:10}}>
                              {STATUS_MAP[current]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        {['P','A','L','H'].map(s => (
                          <button key={s} title={STATUS_MAP[s]}
                            disabled={saving[emp.id]}
                            onClick={() => mark(emp.id, s)}
                            style={{
                              width:30,height:30,borderRadius:6,border:'none',cursor:'pointer',
                              fontWeight:700,fontSize:12,
                              background: current===s
                                ? s==='P'?'#16a34a':s==='A'?'#dc2626':s==='L'?'#d97706':'#7c3aed'
                                : '#f3f4f6',
                              color: current===s ? '#fff' : '#374151'
                            }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
