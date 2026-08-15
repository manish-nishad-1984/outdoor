import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, ListChecks, X } from 'lucide-react';
import api from '../../api/axios';

const EMPTY = { item_name:'', qnty:'', item_type:'' };

export default function DeliverableItems() {
  const [rows, setRows]       = useState([]);
  const [types, setTypes]     = useState([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/deliverable-items', { params: { search } });
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search]);

  const loadTypes = useCallback(async () => {
    try {
      const r = await api.get('/deliverable-items/types');
      setTypes(r.data || []);
    } catch(e){ console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTypes(); }, [loadTypes]);

  const openNew  = () => { setForm(EMPTY); setErr(''); setModal('new'); };
  const openEdit = (row) => {
    setForm({ item_name:row.item_name||'', qnty:row.qnty??'', item_type:row.item_type||'' });
    setErr(''); setModal(row);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return setErr('Item name required');
    setSaving(true); setErr('');
    try {
      if (modal === 'new') await api.post('/deliverable-items', form);
      else await api.put(`/deliverable-items/${modal.id}`, form);
      setModal(null); load(); loadTypes();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete item?')) return;
    await api.delete(`/deliverable-items/${id}`); load();
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Post Production Item</h1>
          <p className="page-subtitle">{rows.length} items</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by item name, type..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={16}/> New Item</button>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>ITEM NAME</th><th>QNTY</th><th>TYPE</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={4} className="table-empty"><ListChecks size={32}/><p>No items found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.item_name}</strong></td>
                      <td>{r.qnty ?? 0}</td>
                      <td>{r.item_type || '-'}</td>
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
                  <label>Qnty</label>
                  <input type="number" value={form.qnty} onChange={set('qnty')} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <input value={form.item_type} onChange={set('item_type')} list="deliverable-item-types" />
                  <datalist id="deliverable-item-types">
                    {types.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
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
