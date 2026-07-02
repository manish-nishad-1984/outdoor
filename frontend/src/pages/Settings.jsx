import { useState, useEffect } from 'react';
import { Save, Users, Settings as SettingsIcon, Shield, Plus, Trash2, X } from 'lucide-react';
import api from '../api/axios';

const TABS = ['Company','Users','Security'];

export default function Settings() {
  const [tab, setTab]       = useState('Company');
  const [company, setCompany] = useState({
    studio_name: 'Outdoor Photography Studio',
    owner_name: '', phone: '', email: '',
    address: '', gst_no: '', pan_no: '',
    order_prefix: 'ORD', invoice_prefix: 'INV', gst_pct: '18'
  });
  const [saved, setSaved]   = useState(false);
  const [users, setUsers]   = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newUser, setNewUser]   = useState({ username:'', password:'', user_type:'operator' });
  const [addErr, setAddErr]     = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [pwForm, setPwForm]    = useState({ current:'', next:'', confirm:'' });
  const [pwMsg, setPwMsg]      = useState('');

  useEffect(() => {
    if (tab === 'Users') loadUsers();
  }, [tab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const r = await api.get('/employees');
      setUsers(r.data || []);
    } catch { setUsers([]); }
    finally { setLoadingUsers(false); }
  };

  const saveCompany = e => {
    e.preventDefault();
    // In a real app, POST to /api/settings. For now save to localStorage.
    localStorage.setItem('studio_settings', JSON.stringify(company));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setCo = k => e => setCompany(c => ({ ...c, [k]: e.target.value }));

  const openAddUser = () => { setNewUser({ username:'', password:'', user_type:'operator' }); setAddErr(''); setAddModal(true); };

  const saveUser = async e => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return setAddErr('Username and password required');
    setAddSaving(true); setAddErr('');
    try {
      await api.post('/auth/register', newUser);
      setAddModal(false); loadUsers();
    } catch(ex){ setAddErr(ex.response?.data?.error || 'Failed to create user'); }
    finally { setAddSaving(false); }
  };

  const changePw = async e => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) return setPwMsg('error:Passwords do not match');
    try {
      await api.post('/auth/change-password', { current: pwForm.current, password: pwForm.next });
      setPwMsg('success:Password changed successfully');
      setPwForm({ current:'', next:'', confirm:'' });
    } catch(ex){ setPwMsg(`error:${ex.response?.data?.error || 'Failed to change password'}`); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">System configuration and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{marginBottom:20}}>
        {TABS.map(t => (
          <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Company Tab */}
      {tab === 'Company' && (
        <form onSubmit={saveCompany}>
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header">
              <div className="card-title">Studio Information</div>
            </div>
            <div className="card-body form-grid">
              {[
                ['Studio Name','text','studio_name'],
                ['Owner Name','text','owner_name'],
                ['Phone','tel','phone'],
                ['Email','email','email'],
                ['GST Number','text','gst_no'],
                ['PAN Number','text','pan_no'],
              ].map(([lbl,type,key]) => (
                <div className="form-group" key={key}>
                  <label>{lbl}</label>
                  <input type={type} value={company[key]} onChange={setCo(key)} placeholder={lbl}/>
                </div>
              ))}
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label>Address</label>
                <input value={company.address} onChange={setCo('address')} placeholder="Studio address"/>
              </div>
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div className="card-header"><div className="card-title">Financial Settings</div></div>
            <div className="card-body form-grid">
              <div className="form-group">
                <label>Order No Prefix</label>
                <input value={company.order_prefix} onChange={setCo('order_prefix')} placeholder="ORD"/>
              </div>
              <div className="form-group">
                <label>Invoice Prefix</label>
                <input value={company.invoice_prefix} onChange={setCo('invoice_prefix')} placeholder="INV"/>
              </div>
              <div className="form-group">
                <label>Default GST %</label>
                <input type="number" value={company.gst_pct} onChange={setCo('gst_pct')} placeholder="18"/>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            <Save size={15}/> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </form>
      )}

      {/* Users Tab */}
      {tab === 'Users' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">System Users</div>
            <button className="btn btn-primary" onClick={openAddUser}>
              <Plus size={15}/> Add User
            </button>
          </div>
          <div className="card-body" style={{padding:0}}>
            {loadingUsers ? <div className="table-loading">Loading…</div> : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr>
                    <th>USERNAME</th><th>USER TYPE</th><th>STATUS</th>
                  </tr></thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={3} className="table-empty">
                        <Users size={32}/>
                        <p>No users found</p>
                      </td></tr>
                    )}
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.username}</strong></td>
                        <td>
                          <span className={`badge ${u.user_type==='admin'?'badge-blue':'badge-gray'}`}>
                            {u.user_type||'operator'}
                          </span>
                        </td>
                        <td><span className="badge badge-green">Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'Security' && (
        <div className="card" style={{maxWidth:440}}>
          <div className="card-header"><div className="card-title">Change Password</div></div>
          <form onSubmit={changePw} className="card-body form-grid" style={{gridTemplateColumns:'1fr'}}>
            {pwMsg && (
              <div className={`alert ${pwMsg.startsWith('error:')?'alert-error':'alert-success'}`}>
                {pwMsg.replace(/^(error|success):/,'')}
              </div>
            )}
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={pwForm.current} onChange={e=>setPwForm(f=>({...f,current:e.target.value}))} required/>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={pwForm.next} onChange={e=>setPwForm(f=>({...f,next:e.target.value}))} required/>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} required/>
            </div>
            <button type="submit" className="btn btn-primary">
              <Shield size={15}/> Update Password
            </button>
          </form>
        </div>
      )}

      {/* Add User Modal */}
      {addModal && (
        <div className="modal-overlay" onClick={()=>setAddModal(false)}>
          <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="modal-close" onClick={()=>setAddModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={saveUser} className="modal-body">
              {addErr && <div className="alert alert-error">{addErr}</div>}
              <div className="form-grid" style={{gridTemplateColumns:'1fr'}}>
                <div className="form-group">
                  <label>Username *</label>
                  <input value={newUser.username} onChange={e=>setNewUser(u=>({...u,username:e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={newUser.password} onChange={e=>setNewUser(u=>({...u,password:e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={newUser.user_type} onChange={e=>setNewUser(u=>({...u,user_type:e.target.value}))}>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addSaving}>
                  {addSaving ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
