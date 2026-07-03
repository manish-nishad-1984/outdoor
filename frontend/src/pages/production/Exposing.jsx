import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Printer, X } from 'lucide-react';
import api from '../../api/axios';

const JOB_TYPES = ['Photos','Album','Flex','Canvas','Other'];
const EMPTY = { party_name:'', contact:'', address:'', job_type:'Photos', remark:'', items:[] };
const EMPTY_ITEM = { file_name:'', order_date:'', paid_amount:0, net_amount:0, amount:0 };

export default function Exposing() {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState({});
  const [search, setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/exposing', { params: { search, page, limit: 25, job_type: typeFilter } });
      setRows(r.data.data || []); setTotal(r.data.total || 0); setStats(r.data.stats || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    setForm({ ...EMPTY, items: [{ ...EMPTY_ITEM, order_date: new Date().toISOString().slice(0,10) }] });
    setErr(''); setModal(true);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = idx => setForm(f => ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));
  const setItem = (idx, key, val) => {
    setForm(f => {
      const items = f.items.map((it,i) => {
        if (i!==idx) return it;
        return { ...it, [key]: val };
      });
      return { ...f, items };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.party_name) return setErr('Party name is required');
    setSaving(true); setErr('');
    try {
      await api.post('/exposing', form);
      setModal(false); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete print job?')) return;
    await api.delete(`/exposing/${id}`); load();
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n!=null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '₹0';
  const subtotal = form.items.reduce((s,it)=>s+parseFloat(it.amount||0),0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Exposing / Printing</h1>
          <p className="page-subtitle">{total} total print jobs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent"><div className="stat-label">TOTAL JOBS</div><div className="stat-value">{stats.total||0}</div></div>
        <div className="stat-card"><div className="stat-label">PHOTOS</div><div className="stat-value" style={{color:'#2563eb'}}>{stats.photos||0}</div></div>
        <div className="stat-card"><div className="stat-label">ALBUM</div><div className="stat-value" style={{color:'#7c3aed'}}>{stats.album||0}</div></div>
        <div className="stat-card"><div className="stat-label">TOTAL VALUE</div><div className="stat-value" style={{color:'#16a34a'}}>{cur(stats.total_value)}</div></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by party name, contact..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openModal}><Plus size={16}/> New Print Job</button>
            <select className="filter-select" value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}}>
              <option value="">All Types</option>
              {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>

          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>PARTY NAME</th><th>CONTACT</th><th>TYPE</th>
                  <th>DATE</th><th>ITEMS</th><th>SUBTOTAL</th><th>REMARK</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8} className="table-empty"><Printer size={32}/><p>No print jobs found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.party_name}</strong></td>
                      <td>{r.contact||'-'}</td>
                      <td><span className="badge badge-blue">{r.job_type||'Photos'}</span></td>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td><span className="badge badge-gray">{r.item_count} item(s)</span></td>
                      <td>{cur(r.subtotal)}</td>
                      <td>{r.remark||'-'}</td>
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
          <div className="modal" style={{maxWidth:680,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Print Job</h2>
              <button className="modal-close" onClick={()=>setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Party Name *</label>
                  <input value={form.party_name} onChange={set('party_name')} placeholder="Customer / lab name" required/>
                </div>
                <div className="form-group">
                  <label>Contact</label>
                  <input value={form.contact} onChange={set('contact')} placeholder="Phone number"/>
                </div>
                <div className="form-group">
                  <label>Print Type</label>
                  <select value={form.job_type} onChange={set('job_type')}>
                    {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input value={form.address} onChange={set('address')} placeholder="Lab address"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Remark</label>
                  <input value={form.remark} onChange={set('remark')} placeholder="Any notes..."/>
                </div>
              </div>

              {/* Items */}
              <div style={{marginTop:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <strong style={{fontSize:13}}>Print Items</strong>
                  <button type="button" className="btn btn-ghost" style={{fontSize:12,padding:'4px 10px'}} onClick={addItem}>
                    <Plus size={13}/> Add Row
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table" style={{fontSize:12}}>
                    <thead><tr>
                      <th>FILE / DESCRIPTION</th><th>ORDER DATE</th>
                      <th>PAID AMT</th><th>NET AMT</th><th>AMOUNT</th><th></th>
                    </tr></thead>
                    <tbody>
                      {form.items.map((it,idx) => (
                        <tr key={idx}>
                          <td><input value={it.file_name} onChange={e=>setItem(idx,'file_name',e.target.value)} placeholder="File/desc" style={{width:'100%',border:'none',background:'transparent'}}/></td>
                          <td><input type="date" value={it.order_date} onChange={e=>setItem(idx,'order_date',e.target.value)} style={{border:'none',background:'transparent'}}/></td>
                          <td><input type="number" value={it.paid_amount} onChange={e=>setItem(idx,'paid_amount',e.target.value)} style={{width:70,border:'none',background:'transparent'}}/></td>
                          <td><input type="number" value={it.net_amount}  onChange={e=>setItem(idx,'net_amount',e.target.value)}  style={{width:70,border:'none',background:'transparent'}}/></td>
                          <td><input type="number" value={it.amount}      onChange={e=>setItem(idx,'amount',e.target.value)}      style={{width:70,border:'none',background:'transparent'}}/></td>
                          <td><button type="button" className="btn-danger-soft" onClick={()=>removeItem(idx)} style={{padding:'2px 6px'}}><X size={12}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:'#f9fafb',fontWeight:700}}>
                        <td colSpan={4} style={{textAlign:'right'}}>Subtotal</td>
                        <td>₹{subtotal.toFixed(0)}</td><td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Print Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
