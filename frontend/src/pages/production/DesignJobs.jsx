import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import DataGrid, { formatDate } from '../../components/grid/DataGrid';

const JOB_TYPES = ['Album','Video','Invitation','Reels','Canvas','Other'];
const STATUSES   = ['Pending','In Progress','Completed'];

const EMPTY_JOB = { employee_id:'', job_type:'Album', due_date:'', status:'Pending', items:[] };
const EMPTY_ITEM = { couple_name:'', item_name:'', job_no:'', studio_name:'', unit:'pcs', quantity:1, rate:0, total:0 };

// Status cell is an inline select, so the column spec is built with the change handler.
const buildColumns = changeStatus => [
  { key: 'inquiry_date', header: 'Date', width: 110, format: 'date' },
  { key: 'job_type', header: 'Type', width: 120, value: r => r.job_type || 'Album',
    cell: r => <span className="badge badge-blue">{r.job_type || 'Album'}</span> },
  { key: 'couple_name', header: 'Couple / Item', width: 220, strong: true },
  { key: 'employee_name', header: 'Designer', width: 150 },
  { key: 'due_date', header: 'Due Date', width: 110, format: 'date',
    cell: r => <span className={r.status === 'Overdue' ? 'dg-neg' : undefined}>{r.due_date ? formatDate(r.due_date) : '—'}</span> },
  { key: 'item_count', header: 'Items', width: 100, align: 'center',
    cell: r => <span className="badge badge-gray">{r.item_count} item(s)</span> },
  { key: 'subtotal', header: 'Amount', width: 120, format: 'currency', total: 'sum', strong: true },
  { key: 'status', header: 'Status', width: 140,
    cell: r => (
      <select
        className="filter-select"
        style={{fontSize:11,padding:'2px 6px',height:24,width:'auto'}}
        value={r.status}
        onChange={e => changeStatus(r.id, e.target.value)}>
        {STATUSES.map(s=><option key={s}>{s}</option>)}
        <option value="Overdue">Overdue</option>
      </select>
    ) },
];

export default function DesignJobs() {
  const [rows, setRows]     = useState([]);
  const [stats, setStats]   = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY_JOB);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [employees, setEmployees] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/design-jobs', { params: { limit: 5000, status: statusFilter, job_type: typeFilter } });
      setRows(r.data.data || []); setStats(r.data.stats || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openModal = async () => {
    setForm({ ...EMPTY_JOB, items: [{ ...EMPTY_ITEM }] });
    setErr('');
    if (!employees.length) {
      try { const r = await api.get('/employees'); setEmployees(r.data||[]); } catch {}
    }
    setModal(true);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = idx => setForm(f => ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));
  const setItem = (idx, key, val) => {
    setForm(f => {
      const items = f.items.map((it,i) => {
        if (i!==idx) return it;
        const updated = { ...it, [key]: val };
        if (key==='quantity'||key==='rate') updated.total = parseFloat(updated.quantity||0)*parseFloat(updated.rate||0);
        return updated;
      });
      return { ...f, items };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.items.length) return setErr('Add at least one item');
    setSaving(true); setErr('');
    try {
      await api.post('/design-jobs', form);
      setModal(false); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const changeStatus = useCallback(async (id, status) => {
    try { await api.put(`/design-jobs/${id}/status`, { status }); load(); }
    catch { alert('Failed to update status'); }
  }, [load]);

  const columns = useMemo(() => buildColumns(changeStatus), [changeStatus]);

  const del = async (id) => {
    if (!confirm('Delete design job?')) return;
    await api.delete(`/design-jobs/${id}`); load();
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const subtotal = form.items.reduce((s,it)=>s+parseFloat(it.total||0),0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Design Jobs</h1>
          <p className="page-subtitle">{rows.length} total jobs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent"><div className="stat-label">TOTAL</div><div className="stat-value">{stats.total||0}</div></div>
        <div className="stat-card"><div className="stat-label">PENDING</div><div className="stat-value" style={{color:'#d97706'}}>{stats.pending||0}</div></div>
        <div className="stat-card"><div className="stat-label">IN PROGRESS</div><div className="stat-value" style={{color:'hsl(var(--primary))'}}>{stats.in_progress||0}</div></div>
        <div className="stat-card"><div className="stat-label">COMPLETED</div><div className="stat-value" style={{color:'#16a34a'}}>{stats.completed||0}</div></div>
      </div>

      <DataGrid
        id="design-jobs"
        columns={columns}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'inquiry_date', desc: true }]}
        searchPlaceholder="Search couple, designer, type…"
        emptyText="No design jobs found"
        actionsWidth={56}
        rowActions={r => (
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        )}
        toolbar={<>
          <select className="filter-select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
            <option value="Overdue">Overdue</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={openModal}><Plus size={16}/> New Design Job</button>
        </>}
      />

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal" style={{maxWidth:740,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Design Job</h2>
              <button className="modal-close" onClick={()=>setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Job Type</label>
                  <select value={form.job_type} onChange={set('job_type')}>
                    {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Designer</label>
                  <select value={form.employee_id} onChange={set('employee_id')}>
                    <option value="">— Assign Designer —</option>
                    {employees.map(e=><option key={e.id} value={e.id}>{e.username||e.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.due_date} onChange={set('due_date')}/>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={set('status')}>
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div style={{marginTop:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <strong style={{fontSize:13}}>Job Items</strong>
                  <button type="button" className="btn btn-ghost" style={{fontSize:12,padding:'4px 10px'}} onClick={addItem}>
                    <Plus size={13}/> Add Item
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table" style={{fontSize:12}}>
                    <thead><tr>
                      <th>COUPLE NAME</th><th>ITEM NAME</th><th>JOB NO</th>
                      <th>QTY</th><th>RATE</th><th>TOTAL</th><th></th>
                    </tr></thead>
                    <tbody>
                      {form.items.map((it,idx) => (
                        <tr key={idx}>
                          <td><input value={it.couple_name} onChange={e=>setItem(idx,'couple_name',e.target.value)} placeholder="Couple name" style={{width:'100%',border:'none',background:'transparent'}}/></td>
                          <td><input value={it.item_name}   onChange={e=>setItem(idx,'item_name',e.target.value)}   placeholder="Item" style={{width:'100%',border:'none',background:'transparent'}}/></td>
                          <td><input value={it.job_no}      onChange={e=>setItem(idx,'job_no',e.target.value)}      placeholder="Job#" style={{width:70,border:'none',background:'transparent'}}/></td>
                          <td><input type="number" value={it.quantity} onChange={e=>setItem(idx,'quantity',e.target.value)} style={{width:55,border:'none',background:'transparent'}}/></td>
                          <td><input type="number" value={it.rate}     onChange={e=>setItem(idx,'rate',e.target.value)}     style={{width:70,border:'none',background:'transparent'}}/></td>
                          <td style={{fontWeight:600}}>₹{parseFloat(it.total||0).toFixed(0)}</td>
                          <td><button type="button" className="btn-danger-soft" onClick={()=>removeItem(idx)} style={{padding:'2px 6px'}}><X size={12}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:'#f9fafb',fontWeight:700}}>
                        <td colSpan={5} style={{textAlign:'right'}}>Subtotal</td>
                        <td>₹{subtotal.toFixed(0)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
