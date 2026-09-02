import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

// Web port of legacy FrmUserCreation.vb (OPT_LOGIN) — see attached reference screenshot.
// User Type list matches the legacy CmbUType options exactly.
const USER_TYPES = ['ADMINISTRATOR', 'USER', 'GUEST'];
const EMPTY = { id: null, user_type: 'ADMINISTRATOR', username: '', password: '', confirm: '' };

export default function UserCreation() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState([]);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/users').then(r => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const selectRow = u => {
    setEditMode(true);
    setForm({ id: u.id, user_type: u.user_type || 'USER', username: u.username, password: '', confirm: '' });
    setMsg('');
  };

  const resetForm = () => { setForm(EMPTY); setEditMode(false); setMsg(''); };

  const submit = async e => {
    e.preventDefault();
    setMsg('');
    if (!form.username.trim()) return setMsg('error:User Name is required');
    if (!editMode && !form.password) return setMsg('error:New Password is required');
    if (form.password !== form.confirm) return setMsg('error:Password is not match...');

    setSaving(true);
    try {
      const payload = { username: form.username.trim(), user_type: form.user_type, password: form.password || undefined };
      if (editMode) {
        await api.put(`/users/${form.id}`, payload);
        setMsg('success:User updated');
      } else {
        await api.post('/users', payload);
        setMsg('success:User created');
      }
      resetForm();
      load();
    } catch (ex) {
      setMsg(`error:${ex.response?.data?.error || 'Save failed'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const remove = async () => {
    if (!form.id) return;
    if (!window.confirm(`Delete user "${form.username}"?`)) return;
    try {
      await api.delete(`/users/${form.id}`);
      resetForm();
      load();
    } catch (ex) {
      setMsg(`error:${ex.response?.data?.error || 'Delete failed'}`);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const PAGE_SIZE = 25;
  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Creation</h1>
          <p className="page-subtitle">Create, edit and remove system login accounts</p>
        </div>
      </div>

      <form onSubmit={submit}>
        {msg && (
          <div className={`alert ${msg.startsWith('error:') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
            {msg.replace(/^(error|success):/, '')}
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">{editMode ? 'Edit User' : 'Add User'}</div></div>
          <div className="card-body form-grid">
            <div className="form-group"><label>User Type</label>
              <select value={form.user_type} onChange={set('user_type')}>
                {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label>User Name</label>
              <input value={form.username} onChange={set('username')} autoFocus /></div>
            <div className="form-group"><label>{editMode ? 'New Password (leave blank to keep)' : 'New Password'}</label>
              <input type="password" value={form.password} onChange={set('password')} /></div>
            <div className="form-group"><label>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} /></div>
          </div>
          <div className="card-body" style={{ paddingTop: 0, display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <UserPlus size={15} /> {saving ? 'Saving…' : editMode ? 'Edit' : 'Add'}
            </button>
            <button type="button" className="btn btn-danger" disabled={!editMode} onClick={remove}>
              <Trash2 size={15} /> Delete
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Users</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div className="table-loading">Loading…</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th style={{ width: 70 }}>Sr.No.</th><th>User Type</th><th>User Name</th></tr></thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={3} className="table-empty"><p>No users found</p></td></tr>
                    )}
                    {pageUsers.map((u, i) => (
                      <tr
                        key={u.id}
                        onClick={() => selectRow(u)}
                        className={form.id === u.id ? 'bg-accent' : undefined}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td>{u.user_type}{me?.id === u.id ? ' (you)' : ''}</td>
                        <td>{u.username}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {users.length > PAGE_SIZE && (
              <div className="pagination">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}>Prev</button>
                <span>Page {page} of {pageCount}</span>
                <button disabled={page>=pageCount} onClick={() => setPage(p=>p+1)}>Next</button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
