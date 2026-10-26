import { useState, useEffect, useCallback } from 'react';
import { Save, CheckSquare, Square } from 'lucide-react';
import api from '../../api/axios';

// Web port of legacy FrmOptUserPermission.vb (OPT_UPERMISSION) — see attached reference
// screenshot. Tab order and row/column layout are reconstructed 1:1 from the legacy
// designer file (FrmOptUserPermission.designer.vb); rows with fewer than 5 actions
// (e.g. "...Report" rows only had an Open checkbox in legacy) render only those cells.
// Column keys match backend/routes/userPermissions.js's PERMISSION_COLUMNS whitelist.
const ACTIONS = ['open', 'insert', 'update', 'delete', 'print'];

const TABS = [
  {
    key: 'master', label: 'Master Setup',
    rows: [
      { label: 'Product Master', cols: { open: 'master_product_open', insert: 'master_product_insert', update: 'master_product_update', delete: 'master_product_delete', print: 'master_product_print' } },
      { label: 'Item Master',    cols: { open: 'master_item_open',    insert: 'master_item_insert',    update: 'master_item_update',    delete: 'master_item_delete',    print: 'master_item_print' } },
      { label: 'Account Master', cols: { open: 'master_account_open', insert: 'master_account_insert', update: 'master_account_update', delete: 'master_account_delete', print: 'master_account_print' } },
    ]
  },
  {
    key: 'transaction', label: 'Transaction',
    rows: [
      { label: 'Purchase',        cols: { open: 'txn_purchase_open',        insert: 'txn_purchase_insert',        update: 'txn_purchase_update',        delete: 'txn_purchase_delete',        print: 'txn_purchase_print' } },
      { label: 'Party Payment',   cols: { open: 'txn_party_payment_open',   insert: 'txn_party_payment_insert',   update: 'txn_party_payment_update',   delete: 'txn_party_payment_delete',   print: 'txn_party_payment_print' } },
      { label: 'Job Print',       cols: { open: 'txn_job_print_open',       insert: 'txn_job_print_insert',       update: 'txn_job_print_update',       delete: 'txn_job_print_delete',       print: 'txn_job_print_print' } },
      { label: 'General Voucher', cols: { open: 'txn_general_voucher_open', insert: 'txn_general_voucher_insert', update: 'txn_general_voucher_update', delete: 'txn_general_voucher_delete', print: 'txn_general_voucher_print' } },
      { label: 'Reminder Book',   cols: { open: 'txn_reminder_book_open',   insert: 'txn_reminder_book_insert',   update: 'txn_reminder_book_update',   delete: 'txn_reminder_book_delete',   print: 'txn_reminder_book_print' } },
    ]
  },
  {
    key: 'bill', label: 'Bill',
    rows: [
      { label: 'Appointment',       cols: { open: 'bill_appointment_open', insert: 'bill_appointment_insert', update: 'bill_appointment_update', delete: 'bill_appointment_delete' } },
      { label: 'Order',             cols: { open: 'bill_order_open',       insert: 'bill_order_insert',       update: 'bill_order_update',       delete: 'bill_order_delete',       print: 'bill_order_print' } },
      { label: 'Bill',              cols: { open: 'bill_bill_open',        insert: 'bill_bill_insert',        update: 'bill_bill_update',        delete: 'bill_bill_delete',        print: 'bill_bill_print' } },
      { label: 'Receipt',           cols: { open: 'bill_receipt_open',     insert: 'bill_receipt_insert',     update: 'bill_receipt_update',     delete: 'bill_receipt_delete',     print: 'bill_receipt_print' } },
      { label: 'Bill Book Master',  cols: { open: 'bill_book_master_open', insert: 'bill_book_master_insert', update: 'bill_book_master_update', delete: 'bill_book_master_delete' } },
      { label: 'Appointment Report',   cols: { open: 'bill_appointment_report' } },
      { label: 'Studio Bill Report',   cols: { open: 'bill_studio_bill_report' } },
      { label: 'Customer Report',      cols: { open: 'bill_customer_report' } },
      { label: 'Search Report',        cols: { open: 'bill_search_report' } },
    ]
  },
  {
    key: 'outdoor', label: 'OutDoor',
    rows: [
      { label: 'Quotation',              cols: { open: 'outdoor_quotation_open',        insert: 'outdoor_quotation_insert',        update: 'outdoor_quotation_update',        delete: 'outdoor_quotation_delete',        print: 'outdoor_quotation_print' } },
      { label: 'Order',                  cols: { open: 'outdoor_order_open',            insert: 'outdoor_order_insert',            update: 'outdoor_order_update',            delete: 'outdoor_order_delete',            print: 'outdoor_order_print' } },
      { label: 'Outdoor Bill',           cols: { open: 'outdoor_bill_open',             insert: 'outdoor_bill_insert',             update: 'outdoor_bill_update',             delete: 'outdoor_bill_delete',             print: 'outdoor_bill_print' } },
      { label: 'Operator Hier',          cols: { open: 'outdoor_operator_hier_open',    insert: 'outdoor_operator_hier_insert',    update: 'outdoor_operator_hier_update',    delete: 'outdoor_operator_hier_delete',    print: 'outdoor_operator_hier_print' } },
      { label: 'OutDoor Bill Book Master', cols: { open: 'outdoor_bill_book_master_open', insert: 'outdoor_bill_book_master_insert', update: 'outdoor_bill_book_master_update', delete: 'outdoor_bill_book_master_delete' } },
      { label: 'OutDoor Receipt',        cols: { open: 'outdoor_receipt_open',          insert: 'outdoor_receipt_insert',          update: 'outdoor_receipt_update',          delete: 'outdoor_receipt_delete',          print: 'outdoor_receipt_print' } },
      { label: 'Quotation Report',           cols: { open: 'outdoor_quotation_report' } },
      { label: 'Order Report',               cols: { open: 'outdoor_order_report' } },
      { label: 'OutDoor Bill Report',        cols: { open: 'outdoor_bill_report' } },
      { label: 'Operator Hier Report',       cols: { open: 'outdoor_operator_hier_report' } },
      { label: 'OutDoor Customer Report',    cols: { open: 'outdoor_customer_report' } },
      { label: 'Party Report',               cols: { open: 'outdoor_party_report' } },
    ]
  },
  {
    key: 'xposing', label: 'Xposing',
    rows: [
      { label: 'Xposing Term',        cols: { open: 'xposing_term_open', insert: 'xposing_term_insert', update: 'xposing_term_update', delete: 'xposing_term_delete', print: 'xposing_term_print' } },
      { label: 'Xposing Term Report', cols: { open: 'xposing_term_report' } },
    ]
  },
  {
    key: 'rawpur', label: 'Raw Purchase',
    rows: [
      { label: 'Row Item Master',    cols: { open: 'rawpur_item_master_open',    insert: 'rawpur_item_master_insert',    update: 'rawpur_item_master_update',    delete: 'rawpur_item_master_delete',    print: 'rawpur_item_master_print' } },
      { label: 'Raw Product Master', cols: { open: 'rawpur_product_master_open', insert: 'rawpur_product_master_insert', update: 'rawpur_product_master_update', delete: 'rawpur_product_master_delete', print: 'rawpur_product_master_print' } },
      { label: 'Raw Purchase',       cols: { open: 'rawpur_purchase_open',       insert: 'rawpur_purchase_insert',       update: 'rawpur_purchase_update',       delete: 'rawpur_purchase_delete',       print: 'rawpur_purchase_print' } },
      { label: 'Raw Party Payment',  cols: { open: 'rawpur_party_payment_open',  insert: 'rawpur_party_payment_insert',  update: 'rawpur_party_payment_update',  delete: 'rawpur_party_payment_delete',  print: 'rawpur_party_payment_print' } },
      { label: 'Raw Purchase Report', cols: { open: 'rawpur_report' } },
      { label: 'Raw Party Report',    cols: { open: 'rawpur_party_report' } },
    ]
  },
  {
    key: 'employee', label: 'Employee',
    rows: [
      { label: 'Entry Design', cols: { open: 'emp_entry_design_open', insert: 'emp_entry_design_insert', update: 'emp_entry_design_update', delete: 'emp_entry_design_delete', print: 'emp_entry_design_print' } },
      { label: 'Payment',      cols: { open: 'emp_payment_open',      insert: 'emp_payment_insert',      update: 'emp_payment_update',      delete: 'emp_payment_delete',      print: 'emp_payment_print' } },
      { label: 'Entry Design Report',      cols: { open: 'emp_entry_design_report' } },
      { label: 'Employee Payment Report',  cols: { open: 'emp_payment_report' } },
    ]
  },
  {
    key: 'discount', label: 'Discount',
    rows: [
      { label: 'Sale Discount',        cols: { open: 'discount_sale_open', insert: 'discount_sale_insert', update: 'discount_sale_update', delete: 'discount_sale_delete', print: 'discount_sale_print' } },
      { label: 'Sale Discount Report', cols: { open: 'discount_sale_report' } },
    ]
  },
  {
    key: 'utility', label: 'Utility',
    rows: [
      { label: 'Print Settings',   cols: { open: 'utility_print_settings' } },
      { label: 'Backup-Restore',   cols: { open: 'utility_backup_restore' } },
      { label: 'Reset Data',       cols: { open: 'utility_reset_data' } },
      { label: 'Reminder Panel',   cols: { open: 'utility_reminder_panel' } },
      { label: 'User Setting',     cols: { open: 'utility_user_setting' } },
      { label: 'User Permission',  cols: { open: 'utility_user_permission' } },
      { label: 'Email Settings',   cols: { open: 'utility_email_settings' } },
      { label: 'SMS',              cols: { open: 'utility_sms' } },
      { label: 'GST Setting',      cols: { open: 'utility_gst_setting' } },
      { label: 'Phone Book',       cols: { open: 'utility_phone_book' } },
      { label: 'Cheque Settings',  cols: { open: 'utility_cheque_settings' } },
      { label: 'Envelope Print',   cols: { open: 'utility_envelope_print' } },
    ]
  },
  {
    key: 'report', label: 'Report',
    rows: [
      { label: 'Purchase Report',       cols: { open: 'report_purchase' } },
      { label: 'Job Summary Report',    cols: { open: 'report_job_summary' } },
      { label: 'Expenses Report',       cols: { open: 'report_expenses' } },
      { label: 'Income Report',         cols: { open: 'report_income' } },
      { label: 'Stock Report',          cols: { open: 'report_stock' } },
      { label: 'Customer List Report',  cols: { open: 'report_customer_list' } },
    ]
  },
  {
    key: 'sheet', label: 'Sheet',
    rows: [
      { label: 'Cash Book',                 cols: { open: 'sheet_cash_book' } },
      { label: 'Bank Book',                 cols: { open: 'sheet_bank_book' } },
      { label: 'Day Book',                  cols: { open: 'sheet_day_book' } },
      { label: 'Account Sheet',             cols: { open: 'sheet_account_sheet' } },
      { label: 'Voucher Sheet',             cols: { open: 'sheet_voucher_sheet' } },
      { label: 'Balance Sheet',             cols: { open: 'sheet_balance_sheet' } },
      { label: 'Cash-Bank Book',            cols: { open: 'sheet_cash_bank_book' } },
      { label: 'Cash-Bank Book (Date)',     cols: { open: 'sheet_cash_bank_book_date' } },
      { label: 'PL Status',                 cols: { open: 'sheet_pl_status' } },
    ]
  },
];

const ALL_COLS = TABS.flatMap(t => t.rows.flatMap(r => Object.values(r.cols)));

export default function UserPermission() {
  const [users, setUsers]       = useState([]);
  const [userId, setUserId]     = useState('');
  const [userType, setUserType] = useState('');
  const [perms, setPerms]       = useState({});
  const [activeTab, setActiveTab] = useState('master');
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  useEffect(() => {
    api.get('/users').then(r => {
      setUsers(r.data || []);
      if (r.data?.length) setUserId(String(r.data[0].id));
    }).catch(() => {});
  }, []);

  const loadPerms = useCallback((uid) => {
    if (!uid) return;
    setLoading(true);
    api.get(`/user-permissions/${uid}`).then(r => setPerms(r.data || {})).catch(() => setPerms({})).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userId) return;
    const u = users.find(u => String(u.id) === String(userId));
    setUserType(u?.user_type || '');
    loadPerms(userId);
  }, [userId, users, loadPerms]);

  const toggle = col => e => setPerms(p => ({ ...p, [col]: e.target.checked }));
  const setAll = val => setPerms(p => {
    const next = { ...p };
    ALL_COLS.forEach(c => { next[c] = val; });
    return next;
  });

  const save = async () => {
    if (!userId) return;
    setSaving(true); setMsg('');
    try {
      const r = await api.put(`/user-permissions/${userId}`, perms);
      setPerms(r.data);
      setMsg('success:Permissions saved');
    } catch (ex) {
      setMsg(`error:${ex.response?.data?.error || 'Save failed'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const tab = TABS.find(t => t.key === activeTab);
  const hasMultiCol = tab.rows.some(r => r.cols.insert || r.cols.update || r.cols.delete || r.cols.print);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Permission</h1>
          <p className="page-subtitle">Per-user access control across every module</p>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.startsWith('error:') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
          {msg.replace(/^(error|success):/, '')}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body form-grid" style={{ alignItems: 'end' }}>
          <div className="form-group">
            <label>User Name</label>
            <select value={userId} onChange={e => setUserId(e.target.value)}>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>User Type</label>
            <input value={userType} disabled />
          </div>
          <div className="form-group">
            <label className="checkbox-row" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={!!perms.date_change} onChange={toggle('date_change')} /> Date Change
            </label>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ borderTopLeftRadius: 0 }}>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tab.label} Detail</th>
                    {hasMultiCol
                      ? ACTIONS.map(a => <th key={a} style={{ textTransform: 'capitalize', textAlign: 'center' }}>{a}</th>)
                      : <th style={{ textAlign: 'center' }}>Open</th>}
                  </tr>
                </thead>
                <tbody>
                  {tab.rows.map(row => (
                    <tr key={row.label}>
                      <td><strong>{row.label}</strong></td>
                      {(hasMultiCol ? ACTIONS : ['open']).map(a => (
                        <td key={a} style={{ textAlign: 'center' }}>
                          {row.cols[a] && (
                            <input type="checkbox" checked={!!perms[row.cols[a]]} onChange={toggle(row.cols[a])} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" disabled={saving || !userId} onClick={save}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
        <button className="btn btn-outline" onClick={() => setAll(true)}><CheckSquare size={15} /> Check All</button>
        <button className="btn btn-outline" onClick={() => setAll(false)}><Square size={15} /> Uncheck All</button>
      </div>
    </div>
  );
}
