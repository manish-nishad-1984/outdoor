import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import DataGrid, { formatCurrency } from '../../components/grid/DataGrid';

const TIME_SLOTS = ['Full Day','Half Day','Morning','Evening','Night','Custom'];
const EMPTY = { customer_name:'', order_contact:'', remark:'', items:[] };
const EMPTY_ITEM = { employee_name:'', item_name:'', place:'', order_date:'', time_slot:'Full Day', quantity:1, rate:0, total:0 };

const COLUMNS = [
  { key: 'customer_name', header: 'Customer', width: 220, strong: true },
  { key: 'order_contact', header: 'Contact', width: 130 },
  { key: 'inquiry_date', header: 'Date', width: 110, format: 'date' },
  { key: 'from_date', header: 'From', width: 110, format: 'date' },
  { key: 'to_date', header: 'To', width: 110, format: 'date' },
  { key: 'item_count', header: 'Items', width: 100, align: 'center',
    cell: r => <span className="badge badge-gray">{r.item_count} item(s)</span> },
  { key: 'subtotal', header: 'Subtotal', width: 120, format: 'currency', total: 'sum', hidden: true },
  { key: 'gross_total', header: 'Total', width: 120, format: 'currency', total: 'sum', strong: true },
  { key: 'remark', header: 'Remark', width: 200, cell: r => r.remark || <span className="dg-muted">—</span> },
];

export default function HireOrders() {
  const [rows, setRows]       = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/hire-orders', { params: { limit: 5000 } });
      setRows(r.data.data || []); setStats(r.data.stats || {});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

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
  const subtotal = form.items.reduce((s,it)=>s+parseFloat(it.total||0),0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hire Orders</h1>
          <p className="page-subtitle">{rows.length} total hire orders</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-accent"><div className="stat-label">TOTAL ORDERS</div><div className="stat-value">{stats.total||0}</div></div>
        <div className="stat-card"><div className="stat-label">TOTAL VALUE</div><div className="stat-value" style={{color:'hsl(var(--primary))'}}>{formatCurrency(stats.total_value)}</div></div>
        <div className="stat-card"></div><div className="stat-card"></div>
      </div>

      <DataGrid
        id="hire-orders"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'inquiry_date', desc: true }]}
        searchPlaceholder="Search customer, contact, remark…"
        emptyText="No hire orders found"
        actionsWidth={56}
        rowActions={r => (
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        )}
        toolbar={<button type="button" className="btn btn-primary" onClick={openModal}><Plus size={16}/> New Hire Order</button>}
      />

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
