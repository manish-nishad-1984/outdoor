import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Truck, X } from 'lucide-react';
import api from '../../api/axios';

const TIME_SLOTS = ['Full Day','Half Day','Morning','Evening','Night','Custom'];
const EMPTY = { customer_name:'', order_contact:'', remark:'', items:[] };
const EMPTY_ITEM = { employee_name:'', item_name:'', place:'', order_date:'', time_slot:'Full Day', quantity:1, rate:0, total:0 };

export default function HireOrders() {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState({});
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/hire-orders', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0); setStats(r.data.stats || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

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
        const updated = { ...it, [key]: val };
        if (key==='quantity'||key==='rate') updated.total = parseFloat(updated.quantity||0)*parseFloat(updated.rate||0);
        return updated;
      });
      return { ...f, items };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.customer_name) return setErr('Customer name is required');
    setSaving(true); setErr('');
    try {
      await api.post('/hire-orders', form);
      setModal(false); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete hire order?')) return;
    await api.delete(`/hire-orders/${id}`); load();
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n!=null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '₹0';
  const subtotal = form.items.reduce((s,it)=>s+parseFloat(it.total||0),0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hire Orders</h1>
          <p className="page-subtitle">{total} total hire orders</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={16}/> New Hire Order
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent"><div className="stat-label">TOTAL ORDERS</div><div className="stat-value">{stats.total||0}</div></div>
        <div className="stat-card"><div className="stat-label">TOTAL VALUE</div><div className="stat-value" style={{color:'#2563eb'}}>{cur(stats.total_value)}</div></div>
        <div className="stat-card"></div><div className="stat-card"></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by customer, contact..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>CUSTOMER</th><th>CONTACT</th><th>DATE</th>
                  <th>FROM</th><th>TO</th><th>ITEMS</th><th>TOTAL</th><th>REMARK</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={9} className="table-empty"><Truck size={32}/><p>No hire orders found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.customer_name}</strong></td>
                      <td>{r.order_contact||'-'}</td>
                      <td>{fmt(r.inquiry_date)}</td>
                      <td>{fmt(r.from_date)}</td>
                      <td>{fmt(r.to_date)}</td>
                      <td><span className="badge badge-gray">{r.item_count} item(s)</span></td>
                      <td style={{fontWeight:600}}>{cur(r.gross_total)}</td>
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
          <div className="modal" style={{maxWidth:760,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Hire Order</h2>
              <button className="modal-close" onClick={()=>setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input value={form.customer_name} onChange={set('customer_name')} placeholder="Customer name" required/>
                </div>
                <div className="form-group">
                  <label>Contact</label>
                  <input value={form.order_contact} onChange={set('order_contact')} placeholder="Phone number"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Remark</label>
                  <input value={form.remark} onChange={set('remark')} placeholder="Notes..."/>
                </div>
              </div>

              {/* Items */}
              <div style={{marginTop:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <strong style={{fontSize:13}}>Hire Items / Staff</strong>
                  <button type="button" className="btn btn-ghost" style={{fontSize:12,padding:'4px 10px'}} onClick={addItem}>
                    <Plus size={13}/> Add Row
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="data-table" style={{fontSize:12}}>
                    <thead><tr>
                      <th>EMPLOYEE / ITEM</th><th>PLACE</th><th>DATE</th>
                      <th>SLOT</th><th>QTY</th><th>RATE</th><th>TOTAL</th><th></th>
                    </tr></thead>
                    <tbody>
                      {form.items.map((it,idx) => (
                        <tr key={idx}>
                          <td>
                            <input value={it.employee_name||it.item_name} onChange={e=>{setItem(idx,'employee_name',e.target.value);setItem(idx,'item_name',e.target.value);}}
                              placeholder="Name/item" style={{width:'100%',border:'none',background:'transparent'}}/>
                          </td>
                          <td><input value={it.place} onChange={e=>setItem(idx,'place',e.target.value)} placeholder="Venue" style={{width:80,border:'none',background:'transparent'}}/></td>
                          <td><input type="date" value={it.order_date} onChange={e=>setItem(idx,'order_date',e.target.value)} style={{border:'none',background:'transparent'}}/></td>
                          <td>
                            <select value={it.time_slot} onChange={e=>setItem(idx,'time_slot',e.target.value)} style={{border:'none',background:'transparent',fontSize:12}}>
                              {TIME_SLOTS.map(s=><option key={s}>{s}</option>)}
                            </select>
                          </td>
                          <td><input type="number" value={it.quantity} onChange={e=>setItem(idx,'quantity',e.target.value)} style={{width:50,border:'none',background:'transparent'}}/></td>
                          <td><input type="number" value={it.rate}     onChange={e=>setItem(idx,'rate',e.target.value)}     style={{width:65,border:'none',background:'transparent'}}/></td>
                          <td style={{fontWeight:600}}>₹{parseFloat(it.total||0).toFixed(0)}</td>
                          <td><button type="button" className="btn-danger-soft" onClick={()=>removeItem(idx)} style={{padding:'2px 6px'}}><X size={12}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:'#f9fafb',fontWeight:700}}>
                        <td colSpan={6} style={{textAlign:'right'}}>Subtotal</td>
                        <td>₹{subtotal.toFixed(0)}</td><td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Create Hire Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
