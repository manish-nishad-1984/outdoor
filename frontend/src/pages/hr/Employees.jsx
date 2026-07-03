import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import api from '../../api/axios';

const COLORS = ['av-orange','av-blue','av-green','av-purple','av-red'];
const ROLES = ['operator','manager','admin','viewer'];
const EMPTY = { username:'', password:'', user_type:'operator' };

export default function Employees() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/employees').then(r => setData(r.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setErr(''); setModal(true); };
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) return setErr('Username is required');
    if (!form.password) return setErr('Password is required');
    setSaving(true); setErr('');
    try {
      await api.post('/auth/register', form);
      setModal(false); load();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed to add employee');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading">Loading…</div>;

  const admins = data.filter(d => d.user_type === 'admin').length;

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon blue">👥</div><div><div className="stat-label">Total Staff</div><div className="stat-value">{data.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green">🛡️</div><div><div className="stat-label">Admins</div><div className="stat-value">{admins}</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Employees</div>
          <button className="btn btn-primary" onClick={openNew}>＋ Add Employee</button>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {data.length === 0 && <div style={{ color: '#64748b', padding: 20 }}>No employees found.</div>}
          {data.map((emp, i) => (
            <div key={emp.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span className="badge badge-blue">{emp.user_type}</span>
              </div>
              <div className={`user-avatar ${COLORS[i % COLORS.length]}`} style={{ width: 56, height: 56, fontSize: 20, margin: '0 auto 12px' }}>
                {emp.username?.slice(0,2).toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{emp.username}</div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{emp.user_type}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Employee</h2>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input value={form.username} onChange={set('username')} autoFocus required />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={form.password} onChange={set('password')} required />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.user_type} onChange={set('user_type')}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
