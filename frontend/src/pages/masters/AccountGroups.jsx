import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import DataGrid from '../../components/grid/DataGrid';

const HEAD_GROUPS = ['LIABILITES', 'ASSETS', 'EXPENSES', 'INCOME', 'CASH', 'OTHER'];

const EMPTY = { group_name: '', head_group: '' };

const COLUMNS = [
  { key: 'group_name', header: 'Account Group Name', width: 280, strong: true },
  { key: 'head_group', header: 'Head Group', width: 180 },
];

export default function AccountGroups() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/accounts-master');
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm(EMPTY); setErr(''); setModal('new'); };
  const openEdit = (row) => { setForm({ group_name: row.group_name || '', head_group: row.head_group || '' }); setErr(''); setModal(row); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.group_name.trim()) return setErr('Account Group Name is required');
    if (!form.head_group)        return setErr('Account Head is required');
    setSaving(true); setErr('');
    try {
      if (modal === 'new') await api.post('/accounts-master', form);
      else await api.put(`/accounts-master/${modal.id}`, form);
      setModal(null); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (row) => {
    if (row.is_system) return;
    if (!confirm('Delete account group?')) return;
    try { await api.delete(`/accounts-master/${row.id}`); load(); }
    catch(ex){ alert(ex.response?.data?.error || 'Delete failed'); }
  };

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Group</h1>
          <p className="page-subtitle">{rows.length} account groups</p>
        </div>
      </div>

      <DataGrid
        id="account-groups"
        columns={COLUMNS}
        data={rows}
        loading={loading}
        defaultSort={[{ id: 'group_name', desc: false }]}
        searchPlaceholder="Search account group, head group…"
        emptyText="No account groups found"
        onRowClick={openEdit}
        rowActions={r => <>
          <button type="button" className="dg-act" title="Edit" onClick={() => openEdit(r)}><Pencil size={15} /></button>
          <button type="button" className="dg-act del" onClick={() => del(r)} disabled={r.is_system}
            title={r.is_system ? "Default system group can't be deleted" : 'Delete'}><Trash2 size={15} /></button>
        </>}
        toolbar={<button type="button" className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Account Group</button>}
      />

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal==='new' ? 'New Account Group' : 'Edit Account Group'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-group">
                <label>Account Group Name *</label>
                <input value={form.group_name} onChange={set('group_name')} required autoFocus />
              </div>
              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Type (Head Group) *</label>
                <select value={form.head_group} onChange={set('head_group')} required>
                  <option value="">Select…</option>
                  {HEAD_GROUPS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
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
