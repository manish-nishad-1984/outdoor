import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, BookOpen, X } from 'lucide-react';
import api from '../../api/axios';

const EMPTY = { account_name:'', mobile_no:'', email:'', permanent_address:'', opening_balance:'', credit_debit:'Dr', remark:'' };

export default function Accounts() {
  const [rows, setRows]     = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal]   = useState(null); // null | 'new' | row
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/accounts', { params: { search } });
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setErr(''); setModal('new'); };
  const openEdit = (row) => {
    setForm({ account_name:row.account_name||'', mobile_no:row.mobile_no||'', email:row.email||'',
      permanent_address:row.permanent_address||'', opening_balance:row.opening_balance||'',
      credit_debit:row.credit_debit||'Dr', remark:row.remark||'' });
    setErr(''); setModal(row);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.account_name) return setErr('Account name required');
    setSaving(true); setErr('');
    try {
      if (modal === 'new') await api.post('/accounts', form);
      else await api.put(`/accounts/${modal.id}`, form);
      setModal(null); load();
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete account?')) return;
    await api.delete(`/accounts/${id}`); load();
  };

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">{rows.length} accounts</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16}/> New Account</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by name, mobile..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>ACCOUNT NAME</th><th>MOBILE</th><th>EMAIL</th>
                  <th>OPENING BAL</th><th>CR/DR</th><th>STATUS</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7} className="table-empty"><BookOpen size={32}/><p>No accounts found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.account_name}</strong></td>
                      <td>{r.mobile_no||'-'}</td>
                      <td>{r.email||'-'}</td>
                      <td>{cur(r.opening_balance)}</td>
                      <td><span className={`badge ${r.credit_debit==='Cr'?'badge-green':'badge-blue'}`}>{r.credit_debit}</span></td>
                      <td><span className={`badge ${r.status_flag?'badge-green':'badge-gray'}`}>{r.status_flag?'Active':'Inactive'}</span></td>
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
              <h2>{modal==='new' ? 'New Account' : 'Edit Account'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Account Name *</label>
                  <input value={form.account_name} onChange={set('account_name')} required />
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input value={form.mobile_no} onChange={set('mobile_no')} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input value={form.permanent_address} onChange={set('permanent_address')} />
                </div>
                <div className="form-group">
                  <label>Opening Balance</label>
                  <input type="number" value={form.opening_balance} onChange={set('opening_balance')} />
                </div>
                <div className="form-group">
                  <label>Credit / Debit</label>
                  <select value={form.credit_debit} onChange={set('credit_debit')}>
                    <option value="Dr">Dr (Debit)</option>
                    <option value="Cr">Cr (Credit)</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Remark</label>
                  <input value={form.remark} onChange={set('remark')} />
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
