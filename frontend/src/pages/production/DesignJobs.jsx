import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Palette, X, ChevronDown } from 'lucide-react';
import api from '../../api/axios';

const JOB_TYPES = ['Album','Video','Invitation','Reels','Canvas','Other'];
const STATUSES   = ['Pending','In Progress','Completed'];
const STATUS_BADGE = { Pending:'badge-yellow', 'In Progress':'badge-blue', Completed:'badge-green', Overdue:'badge-red' };

const EMPTY_JOB = { employee_id:'', job_type:'Album', due_date:'', status:'Pending', items:[] };
const EMPTY_ITEM = { couple_name:'', item_name:'', job_no:'', studio_name:'', unit:'pcs', quantity:1, rate:0, total:0 };

export default function DesignJobs() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY_JOB);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [employees, setEmployees] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/design-jobs', { params: { search, page, limit: 25, status: statusFilter, job_type: typeFilter } });
      setRows(r.data.data || []); setTotal(r.data.total || 0); setStats(r.data.stats || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page, statusFilter, typeFilter]);

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

  const changeStatus = async (id, status) => {
    try { await api.put(`/design-jobs/${id}/status`, { status }); load(); }
    catch { alert('Failed to update status'); }
  };

  const del = async (id) => {
    if (!confirm('Delete design job?')) return;
    await api.delete(`/design-jobs/${id}`); load();
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n!=null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '₹0';
  const subtotal = form.items.reduce((s,it)=>s+parseFloat(it.total||0),0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Design Jobs</h1>
          <p className="page-subtitle">{total} total jobs</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={16}/> New Design Job
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent"><div className="stat-label">TOTAL</div><div className="stat-value">{stats.total||0}</div></div>
        <div className="stat-card"><div className="stat-label">PENDING</div><div className="stat-value" style={{color:'#d97706'}}>{stats.pending||0}</div></div>
        <div className="stat-card"><div className="stat-label">IN PROGRESS</div><div className="stat-value" style={{color:'#2563eb'}}>{stats.in_progress||0}</div></div>
        <div className="stat-card"><div className="stat-label">COMPLETED</div><div className="stat-value" style={{color:'#16a34a'}}>{stats.completed||0}</div></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by couple name, item..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="filter-select" value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}}>
              <option value="">All Types</option>
              {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>DATE</th><th>TYPE</th><th>COUPLE / ITEM</th><th>DESIGNER</th>
                  <th>DUE DATE</th><th>ITEMS</th><th>AMOUNT</th><th>STATUS</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={9} className="table-empty"><Palette size={32}/><p>No design jobs found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td><span className="badge badge-blue">{r.job_type||'Album'}</span></td>
                      <td>{r.couple_name || '-'}</td>
                      <td>{r.employee_name || '-'}</td>
                      <td style={{color: r.status==='Overdue'?'#dc2626':'inherit'}}>{fmt(r.due_date)}</td>
                      <td><span className="badge badge-gray">{r.item_count} item(s)</span></td>
                      <td>{cur(r.subtotal)}</td>
                      <td>
                        <select
                          className="filter-select"
                          style={{fontSize:11,padding:'2px 6px',height:24,width:'auto'}}
                          value={r.status}
                          onChange={e => changeStatus(r.id, e.target.value)}>
                          {STATUSES.map(s=><option key={s}>{s}</option>)}
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>
                      <td><button className="btn-danger-soft" onClick={()=>del(r.id)}><Trash2 size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 25 && (
            <div className="pagination">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}>Prev</button>
              <span>Page {page} of {Math.ceil(total/25)}</span>
              <button disabled={page>=Math.ceil(total/25)} onClick={() => setPage(p=>p+1)}>Next</button>
            </div>
          )}
        </div>
      </div>

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
