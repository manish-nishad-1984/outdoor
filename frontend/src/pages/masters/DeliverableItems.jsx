import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import DataGrid from '../../components/grid/DataGrid';

const EMPTY = { item_name:'', qnty:'', item_type:'' };

const COLUMNS = [
  { key: 'item_name', header: 'Item Name', width: 280, strong: true },
  { key: 'qnty', header: 'Qnty', width: 100, format: 'number' },
  { key: 'item_type', header: 'Type', width: 180 },
];

export default function DeliverableItems() {
  const [rows, setRows]       = useState([]);
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/deliverable-items');
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

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

      <DataGrid
        id="deliverable-items"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'item_name', desc: false }]}
        searchPlaceholder="Search by item name, type…"
        emptyText="No items found"
        onRowClick={openEdit}
        rowActions={r => <>
          <button type="button" className="dg-act" title="Edit" onClick={() => openEdit(r)}><Pencil size={15} /></button>
          <button type="button" className="dg-act del" title="Delete" onClick={() => del(r.id)}><Trash2 size={15} /></button>
        </>}
        toolbar={<button type="button" className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Item</button>}
      />

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
