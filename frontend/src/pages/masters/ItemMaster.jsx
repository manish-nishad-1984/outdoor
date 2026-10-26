import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import DataGrid from '../../components/grid/DataGrid';

const EMPTY = {
  item_name:'', hsn_code:'0', rate:'',
  not_use:false, staff_req:false, not_print:false, conve_multi_qnty:false,
};

const COLUMNS = [
  { key: 'item_name', header: 'Item Name', width: 260, strong: true },
  { key: 'hsn_code', header: 'HSN Code', width: 110, value: r => r.hsn_code || '0' },
  { key: 'not_use', header: 'Not Use', width: 110, align: 'center', value: r => (r.not_use ? 'Yes' : 'No'),
    cell: r => <span className={`badge ${r.not_use ? 'badge-green' : 'badge-gray'}`}>{r.not_use ? 'Yes' : 'No'}</span> },
  { key: 'staff_req', header: 'Staff Req.', width: 110, align: 'center', value: r => (r.staff_req ? 'Yes' : 'No'),
    cell: r => <span className={`badge ${r.staff_req ? 'badge-green' : 'badge-gray'}`}>{r.staff_req ? 'Yes' : 'No'}</span> },
  { key: 'not_print', header: 'Not Print', width: 110, align: 'center', value: r => (r.not_print ? 'Yes' : 'No'),
    cell: r => <span className={`badge ${r.not_print ? 'badge-green' : 'badge-gray'}`}>{r.not_print ? 'Yes' : 'No'}</span> },
  { key: 'conve_multi_qnty', header: 'Multi Qnty', width: 110, align: 'center', value: r => (r.conve_multi_qnty ? 'Yes' : 'No'),
    cell: r => <span className={`badge ${r.conve_multi_qnty ? 'badge-green' : 'badge-gray'}`}>{r.conve_multi_qnty ? 'Yes' : 'No'}</span> },
  { key: 'rate', header: 'Rate', width: 120, format: 'currency' },
];

export default function ItemMaster() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/items');
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Item Master</h1>
          <p className="page-subtitle">{rows.length} items</p>
        </div>
      </div>

      <DataGrid
        id="item-master"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'item_name', desc: false }]}
        searchPlaceholder="Search by item name, HSN code…"
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
