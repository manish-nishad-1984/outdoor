import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Layers, X } from 'lucide-react';
import api from '../../api/axios';

const HEAD_GROUPS = ['LIABILITES', 'ASSETS', 'EXPENSES', 'INCOME', 'CASH', 'OTHER'];

const EMPTY = { group_name: '', head_group: '' };

export default function AccountGroups() {
  const [rows, setRows]       = useState([]);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(null); // null | 'new' | row
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/accounts-master', { params: { search } });
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search]);

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

  const PAGE_SIZE = 25;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Group</h1>
          <p className="page-subtitle">{rows.length} account groups</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search account group..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={16}/> New Account Group</button>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>ACCOUNT GROUP NAME</th><th>HEAD GROUP</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={3} className="table-empty"><Layers size={32}/><p>No account groups found</p></td></tr>}
                  {pageRows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.group_name}</strong></td>
                      <td>{r.head_group}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={() => openEdit(r)}><Pencil size={14}/></button>
                          <button className="btn-danger-soft" onClick={() => del(r)} disabled={r.is_system}
                            title={r.is_system ? "Default system group can't be deleted" : 'Delete'}>
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > PAGE_SIZE && (
            <div className="pagination">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}>Prev</button>
              <span>Page {page} of {pageCount}</span>
              <button disabled={page>=pageCount} onClick={() => setPage(p=>p+1)}>Next</button>
            </div>
          )}
        </div>
      </div>

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
