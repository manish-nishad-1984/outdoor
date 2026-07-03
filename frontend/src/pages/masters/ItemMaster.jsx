import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Package, X, Check } from 'lucide-react';
import api from '../../api/axios';

const EMPTY = {
  item_name:'', hsn_code:'0', rate:'',
  not_use:false, staff_req:false, not_print:false, conve_multi_qnty:false,
};

export default function ItemMaster() {
  const [rows, setRows]       = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/items', { params: { search } });
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(EMPTY); setErr(''); setModal('new'); };
  const openEdit = (row) => {
    setForm({
      item_name:row.item_name||'', hsn_code:row.hsn_code||'0', rate:row.rate??'',
      not_use:!!row.not_use, staff_req:!!row.staff_req,
      not_print:!!row.not_print, conve_multi_qnty:!!row.conve_multi_qnty,
    });
    setErr(''); setModal(row);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return setErr('Item name required');
    setSaving(true); setErr('');
    try {
      if (modal === 'new') await api.post('/items', form);
      else await api.put(`/items/${modal.id}`, form);
      setModal(null); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete item?')) return;
    await api.delete(`/items/${id}`); load();
  };

  const set   = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const check = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));
  const cur   = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '-';
  const flag  = v => v ? <Check size={15} className="flag-yes" /> : <span className="flag-no">–</span>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Item Master</h1>
          <p className="page-subtitle">{rows.length} items</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16}/> New Item</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by item name, HSN code..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>ITEM NAME</th><th>HSN CODE</th>
                  <th style={{textAlign:'center'}}>NOT USE</th>
                  <th style={{textAlign:'center'}}>STAFF REQ.</th>
                  <th style={{textAlign:'center'}}>NOT PRINT</th>
                  <th style={{textAlign:'center'}}>MULTI QNTY</th>
                  <th style={{textAlign:'right'}}>RATE</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8} className="table-empty"><Package size={32}/><p>No items found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.item_name}</strong></td>
                      <td>{r.hsn_code||'0'}</td>
                      <td style={{textAlign:'center'}}>{flag(r.not_use)}</td>
                      <td style={{textAlign:'center'}}>{flag(r.staff_req)}</td>
                      <td style={{textAlign:'center'}}>{flag(r.not_print)}</td>
                      <td style={{textAlign:'center'}}>{flag(r.conve_multi_qnty)}</td>
                      <td style={{textAlign:'right'}}>{cur(r.rate)}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={() => openEdit(r)}><Pencil size={14}/></button>
                          <button className="btn-danger-soft" onClick={() => del(r.id)}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal==='new' ? 'New Item' : 'Edit Item'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Item Name *</label>
                  <input value={form.item_name} onChange={set('item_name')} required autoFocus />
                </div>
                <div className="form-group">
                  <label>HSN Code</label>
                  <input value={form.hsn_code} onChange={set('hsn_code')} />
                </div>
                <div className="form-group">
                  <label>Rate</label>
                  <input type="number" step="0.01" value={form.rate} onChange={set('rate')} />
                </div>
              </div>

              <div className="checkbox-grid">
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.not_use} onChange={check('not_use')} />
                  <span>Not Use</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.staff_req} onChange={check('staff_req')} />
                  <span>Staff Required</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.not_print} onChange={check('not_print')} />
                  <span>Not Print</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.conve_multi_qnty} onChange={check('conve_multi_qnty')} />
                  <span>Convert Multi Qnty In</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
