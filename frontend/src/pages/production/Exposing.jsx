import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import DataGrid, { formatCurrency } from '../../components/grid/DataGrid';

const JOB_TYPES = ['Photos','Album','Flex','Canvas','Other'];
const EMPTY = { party_name:'', contact:'', address:'', job_type:'Photos', remark:'', items:[] };
const EMPTY_ITEM = { file_name:'', order_date:'', paid_amount:0, net_amount:0, amount:0 };

const COLUMNS = [
  { key: 'party_name', header: 'Party Name', width: 220, strong: true },
  { key: 'contact', header: 'Contact', width: 130 },
  { key: 'job_type', header: 'Type', width: 110, value: r => r.job_type || 'Photos',
    cell: r => <span className="badge badge-blue">{r.job_type || 'Photos'}</span> },
  { key: 'inquiry_date', header: 'Date', width: 110, format: 'date' },
  { key: 'item_count', header: 'Items', width: 100, align: 'center',
    cell: r => <span className="badge badge-gray">{r.item_count} item(s)</span> },
  { key: 'subtotal', header: 'Subtotal', width: 120, format: 'currency', total: 'sum', strong: true },
  { key: 'remark', header: 'Remark', width: 200, cell: r => r.remark || <span className="dg-muted">—</span> },
];

export default function Exposing() {
  const [rows, setRows]       = useState([]);
  const [stats, setStats]     = useState({});
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/exposing', { params: { limit: 5000, job_type: typeFilter } });
      setRows(r.data.data || []); setStats(r.data.stats || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [typeFilter]);

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
  const subtotal = form.items.reduce((s,it)=>s+parseFloat(it.amount||0),0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Exposing / Printing</h1>
          <p className="page-subtitle">{rows.length} total print jobs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent"><div className="stat-label">TOTAL JOBS</div><div className="stat-value">{stats.total||0}</div></div>
        <div className="stat-card"><div className="stat-label">PHOTOS</div><div className="stat-value" style={{color:'hsl(var(--primary))'}}>{stats.photos||0}</div></div>
        <div className="stat-card"><div className="stat-label">ALBUM</div><div className="stat-value" style={{color:'#7c3aed'}}>{stats.album||0}</div></div>
        <div className="stat-card"><div className="stat-label">TOTAL VALUE</div><div className="stat-value" style={{color:'#16a34a'}}>{formatCurrency(stats.total_value)}</div></div>
      </div>

      <DataGrid
        id="exposing"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'inquiry_date', desc: true }]}
        searchPlaceholder="Search party name, contact, remark…"
        emptyText="No print jobs found"
        actionsWidth={56}
        rowActions={r => (
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        )}
        toolbar={<>
          <select className="filter-select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {JOB_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={openModal}><Plus size={16}/> New Print Job</button>
        </>}
      />

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
