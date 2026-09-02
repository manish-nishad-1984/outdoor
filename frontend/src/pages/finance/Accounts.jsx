import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, BookOpen, X } from 'lucide-react';
import api from '../../api/axios';

// Legacy FrmAccount.vb switches the visible panel by account group. We switch on
// group_name (string) instead of the legacy's hardcoded MST_AG.SRNO, so adding/
// renaming groups later doesn't require a code change here.
const PANEL_BY_GROUP = {
  'EXPOSER/PARTY': 'party-extra',
  'CUSTOMER': 'party-limit',
  'CLIENT': 'party',
  'RAW PARTY': 'party',
  'EMPLOYEE': 'employee',
  'PARTNER': 'partner',
  'BANK': 'bank',
  'LOAN': 'loan',
  'LOAN AND ADV.': 'loan',
};
const panelFor = groupName => PANEL_BY_GROUP[groupName] || 'minimal';

const EMPTY = {
  account_name: '', agent_id: '', mobile_no: '', email: '', permanent_address: '',
  opening_balance: '', credit_debit: 'Dr', remark: '',
  contact_name: '', gst_no: '', pan_no: '',
  rate: '', item_id: '',
  credit_limit: '',
  emp_address: '', emp_contact: '', salary_type: '', salary: '', designation: '', commission: '',
  partner_profit_pct: '', partner_loss_pct: '',
  bank_name: '', bank_type: '', bank_branch: '', bank_account_no: '',
  interest_rate: '',
  not_use: false,
};

export default function Accounts() {
  const [rows, setRows]         = useState([]);
  const [groups, setGroups]     = useState([]);
  const [items, setItems]       = useState([]);
  const [search, setSearch]     = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(null); // null | 'new' | row
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/accounts', { params: { search, group_id: groupFilter } });
      setRows(r.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, groupFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/accounts-master').then(r => setGroups(r.data || [])).catch(() => {});
    api.get('/items').then(r => setItems((r.data || []).filter(x => !x.not_use))).catch(() => {});
  }, []);

  const openNew = () => { setForm(EMPTY); setErr(''); setModal('new'); };
  const openEdit = (row) => {
    const f = { ...EMPTY };
    Object.keys(EMPTY).forEach(k => { f[k] = row[k] ?? EMPTY[k]; });
    f.not_use = !!row.not_use;
    setForm(f); setErr(''); setModal(row);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.account_name) return setErr('Account name required');
    if (!form.agent_id) return setErr('Account Group is required');
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
  const setChk = k => e => setForm(f => ({...f, [k]: e.target.checked}));
  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  const selectedGroupName = groups.find(g => String(g.id) === String(form.agent_id))?.group_name || '';
  const panel = panelFor(selectedGroupName);
  const isParty = panel === 'party' || panel === 'party-extra' || panel === 'party-limit';

  const PAGE_SIZE = 25;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Master</h1>
          <p className="page-subtitle">{rows.length} accounts</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon"/>
              <input placeholder="Search by name, mobile..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }} style={{ maxWidth: 200 }}>
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.group_name}</option>)}
            </select>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openNew}><Plus size={16}/> New Account</button>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>GROUP</th><th>ACCOUNT NAME</th><th>MOBILE</th>
                  <th>OPENING BAL</th><th>CR/DR</th><th>STATUS</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7} className="table-empty"><BookOpen size={32}/><p>No accounts found</p></td></tr>}
                  {pageRows.map(r => (
                    <tr key={r.id}>
                      <td>{r.group_name || '-'}</td>
                      <td><strong>{r.account_name}</strong></td>
                      <td>{r.mobile_no||'-'}</td>
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
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal==='new' ? 'New Account' : 'Edit Account'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}><X size={18}/></button>
            </div>
            <form onSubmit={save} className="modal-body">
              {err && <div className="alert alert-error">{err}</div>}

              <div className="form-grid">
                <div className="form-group">
                  <label>Account Group *</label>
                  <select value={form.agent_id} onChange={set('agent_id')} required>
                    <option value="">Select…</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.group_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Account Name *</label>
                  <input value={form.account_name} onChange={set('account_name')} required />
                </div>
                <div className="form-group">
                  <label>Opening Amt</label>
                  <input type="number" value={form.opening_balance} onChange={set('opening_balance')} />
                </div>
                <div className="form-group">
                  <label>Cr / Dr</label>
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

              {isParty && (
                <>
                  <div className="form-divider" />
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Name</label>
                      <input value={form.contact_name} onChange={set('contact_name')} />
                    </div>
                    <div className="form-group">
                      <label>Cont. Num</label>
                      <input value={form.mobile_no} onChange={set('mobile_no')} />
                    </div>
                    <div className="form-group" style={{gridColumn:'1/-1'}}>
                      <label>Address</label>
                      <input value={form.permanent_address} onChange={set('permanent_address')} />
                    </div>
                    <div className="form-group">
                      <label>GST</label>
                      <input value={form.gst_no} onChange={set('gst_no')} />
                    </div>
                    <div className="form-group">
                      <label>Pan No</label>
                      <input value={form.pan_no} onChange={set('pan_no')} />
                    </div>
                    <div className="form-group" style={{gridColumn:'1/-1'}}>
                      <label>Email Id</label>
                      <input type="email" value={form.email} onChange={set('email')} />
                    </div>
                    {panel === 'party-extra' && (
                      <>
                        <div className="form-group">
                          <label>Rate</label>
                          <input type="number" value={form.rate} onChange={set('rate')} />
                        </div>
                        <div className="form-group">
                          <label>Item Name</label>
                          <select value={form.item_id} onChange={set('item_id')}>
                            <option value="">Select…</option>
                            {items.map(it => <option key={it.id} value={it.id}>{it.item_name}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    {panel === 'party-limit' && (
                      <div className="form-group">
                        <label>Limit</label>
                        <input type="number" value={form.credit_limit} onChange={set('credit_limit')} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {panel === 'employee' && (
                <>
                  <div className="form-divider" />
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Emp Name</label>
                      <input value={form.contact_name} onChange={set('contact_name')} />
                    </div>
                    <div className="form-group">
                      <label>Cont Num</label>
                      <input value={form.emp_contact} onChange={set('emp_contact')} />
                    </div>
                    <div className="form-group" style={{gridColumn:'1/-1'}}>
                      <label>Address</label>
                      <input value={form.emp_address} onChange={set('emp_address')} />
                    </div>
                    <div className="form-group">
                      <label>Salary Type</label>
                      <select value={form.salary_type} onChange={set('salary_type')}>
                        <option value="">Select…</option>
                        <option value="FIXED">FIXED</option>
                        <option value="PER DAYS">PER DAYS</option>
                        <option value="MAJURI">MAJURI</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Salary</label>
                      <input type="number" value={form.salary} onChange={set('salary')} />
                    </div>
                    <div className="form-group">
                      <label>Designation</label>
                      <input value={form.designation} onChange={set('designation')} />
                    </div>
                    <div className="form-group">
                      <label>Commission</label>
                      <input type="number" value={form.commission} onChange={set('commission')} />
                    </div>
                  </div>
                </>
              )}

              {panel === 'partner' && (
                <>
                  <div className="form-divider" />
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Profit %</label>
                      <input type="number" value={form.partner_profit_pct} onChange={set('partner_profit_pct')} />
                    </div>
                    <div className="form-group">
                      <label>Loss %</label>
                      <input type="number" value={form.partner_loss_pct} onChange={set('partner_loss_pct')} />
                    </div>
                  </div>
                </>
              )}

              {panel === 'bank' && (
                <>
                  <div className="form-divider" />
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Our Bank Name</label>
                      <input value={form.bank_name} onChange={set('bank_name')} />
                    </div>
                    <div className="form-group">
                      <label>Account Type</label>
                      <select value={form.bank_type} onChange={set('bank_type')}>
                        <option value="">Select…</option>
                        <option value="SAVING">SAVING</option>
                        <option value="CURRENT">CURRENT</option>
                        <option value="CREDIT CARD">CREDIT CARD</option>
                        <option value="OTHERS">OTHERS</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Branch</label>
                      <input value={form.bank_branch} onChange={set('bank_branch')} />
                    </div>
                    <div className="form-group">
                      <label>Account Num</label>
                      <input value={form.bank_account_no} onChange={set('bank_account_no')} />
                    </div>
                  </div>
                </>
              )}

              {panel === 'loan' && (
                <>
                  <div className="form-divider" />
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Interest Rate %</label>
                      <input type="number" value={form.interest_rate} onChange={set('interest_rate')} />
                    </div>
                  </div>
                </>
              )}

              <label className="checkbox-row" style={{ marginTop: 14 }}>
                <input type="checkbox" checked={form.not_use} onChange={setChk('not_use')} />
                <span>Not Use</span>
              </label>

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
