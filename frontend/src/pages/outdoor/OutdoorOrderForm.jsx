import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, Trash2, Printer, X, LogOut, MessageSquare, Mail, Send, Plus, Pencil, Check
} from 'lucide-react';
import api from '../../api/axios';

const EVENTS = ['Wedding','Reception','Engagement','Haldi','Mehndi','Sangeet',
  'Pre-Wedding','Ring Ceremony','Baby Shower','Birthday','Other'];
const PAYMENTS = ['Cash','UPI','Cheque','Card','Bank Transfer'];

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_ENTRY = {
  function_date: today(), item_name: '', item_id: null, event_name: '', event_id: null,
  qnty: 1, rate: 0, total: 0, place: '', time_slot: '', data_issue_from_operator: false,
  operator_name: '', operator_id: null, op_rate: 0, item_remark: '', sms_flag: false, data_flag: false,
  data1: '', date1: '',
};
const EMPTY_DELIVERABLE_ENTRY = { item_name: '', deliverable_item_id: null, qnty: 1, amount: 0 };
const EMPTY_FORM = {
  order_no: '', order_date: today(), mob_no: '', cust_name: '', address: '',
  quo_no: '', couple_name: '', remark: '', ref_by: '', package_name: '',
  discount: 0, advance: 0, payment_mode: 'Cash', bank_name: '', cheque_no: '',
  display_staff_expenses: false, final_delivery_notes: '', prewedding_deliverables: '', family_detail: '',
  st_selection: false, st_invitation: false, st_data: false, st_delivery: false,
  st_desining: false, st_printing: false, st_dvd_pendrive: false, st_done: false, st_reels: false,
  desining_opt: '', printing_opt: '', dvd_opt: '',
};

export default function OutdoorOrderForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [items, setItems]     = useState([]);
  const [entry, setEntry]     = useState({ ...EMPTY_ENTRY });
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemList, setItemList] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [operatorList, setOperatorList] = useState([]); // Account Master, EXPOSER/PARTY group
  const [clientList, setClientList]     = useState([]); // Account Master, CLIENT group
  const [deliverableList, setDeliverableList] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [deliverableEntry, setDeliverableEntry] = useState({ ...EMPTY_DELIVERABLE_ENTRY });
  const [editingDeliverableIndex, setEditingDeliverableIndex] = useState(null);
  const [availableQuos, setAvailableQuos] = useState([]); // this client's not-yet-converted quotations
  const [clientHistory, setClientHistory] = useState([]);
  const [previousPending, setPreviousPending] = useState(0);
  const [clientId, setClientId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [recent, setRecent]   = useState([]);
  const [panel, setPanel]     = useState(''); // '', 'final', 'pre', 'family'
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => {
    api.get('/items').then(r => setItemList((r.data || []).filter(x => !x.not_use))).catch(() => {});
    api.get('/events').then(r => setEventList((r.data || []).filter(x => !x.not_use).map(x => x.event_name))).catch(() => {});
    api.get('/deliverable-items').then(r => setDeliverableList(r.data || [])).catch(() => {});
    api.get('/outdoor-orders', { params: { limit: 12 } }).then(r => setRecent(r.data.data || [])).catch(() => {});
    api.get('/accounts-master').then(r => {
      const groups = r.data || [];
      const clientGroup = groups.find(g => (g.group_name || '').toUpperCase() === 'CLIENT');
      if (clientGroup) api.get('/accounts', { params: { group_id: clientGroup.id } })
        .then(r2 => setClientList(r2.data || [])).catch(() => {});
      const opGroup = groups.find(g => (g.group_name || '').toUpperCase() === 'EXPOSER/PARTY');
      if (opGroup) api.get('/accounts', { params: { group_id: opGroup.id } })
        .then(r2 => setOperatorList(r2.data || [])).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/outdoor-orders/${id}`).then(r => {
        const o = r.data;
        setForm({
          order_no: o.order_no || '', order_date: (o.order_date || o.inquiry_date)?.slice(0,10) || today(),
          mob_no: o.mob_no || o.contact_no || '', cust_name: o.cust_name || o.company_name || '',
          address: o.address || '', quo_no: o.quo_no || '', couple_name: o.couple_name || '',
          remark: o.remark || '', ref_by: o.ref_by || '', package_name: o.package_name || '',
          discount: o.discount || 0, advance: o.advance || 0, payment_mode: o.payment_mode || 'Cash',
          bank_name: '', cheque_no: o.cheque_no || '',
          display_staff_expenses: !!o.display_staff_expenses, final_delivery_notes: o.final_delivery_notes || '',
          prewedding_deliverables: o.prewedding_deliverables || '', family_detail: o.family_detail || '',
          st_selection: !!o.st_selection, st_invitation: !!o.st_invitation, st_data: !!o.st_data,
          st_delivery: !!o.st_delivery, st_desining: !!o.st_desining, st_printing: !!o.st_printing,
          st_dvd_pendrive: !!o.st_dvd_pendrive, st_done: !!o.st_done, st_reels: !!o.st_reels,
          desining_opt: o.desining_opt || '', printing_opt: o.printing_opt || '', dvd_opt: o.dvd_opt || '',
        });
        setClientId(o.client_id || null);
        setUpdatedAt(o.updated_at || null);
        setPreviousPending(Number(o.previous_pending) || 0);
        setItems((o.items || []).map(it => ({
          function_date: it.function_date?.slice(0,10) || '', item_name: it.item_name || it.item_name_snap || '',
          item_id: it.item_id, event_name: it.event_name || '', event_id: it.event_id,
          qnty: Number(it.qnty ?? it.box_qty) || 0,
          rate: Number(it.rate) || 0, total: Number(it.total) || 0, place: it.place || '',
          time_slot: it.time_slot || '', data_issue_from_operator: !!it.data_issue_from_operator,
          operator_name: it.operator_name || '', operator_id: it.operator_id, op_rate: Number(it.op_rate) || 0,
          item_remark: it.item_remark || '', sms_flag: !!it.sms_flag, data_flag: !!it.data_flag,
          data1: it.data1 || '', date1: it.date1?.slice(0,10) || '',
        })));
        setDeliverables((o.deliverables || []).map(d => ({
          deliverable_item_id: d.deliverable_item_id, item_name: d.item_name,
          qnty: Number(d.qnty) || 0, amount: Number(d.amount) || 0,
        })));
      }).catch(() => setErr('Failed to load order'));
    } else {
      api.get('/outdoor-orders/next-no').then(r => setForm(f => ({ ...f, order_no: r.data.next }))).catch(() => {});
    }
  }, [id, isEdit]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const chk = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

  // Client selection — mirrors legacy CmbPName: auto-fill address/mob_no, load previous
  // pending, this client's order history, and (Add mode only) their not-yet-converted
  // quotations for the Quo No picker.
  const onClientBlur = () => {
    const name = form.cust_name.trim();
    if (!name) return;
    api.get('/outdoor-orders/client-info', { params: { client_name: name, exclude_id: id || 0 } })
      .then(r => {
        if (r.data) {
          setForm(f => ({ ...f, address: f.address || r.data.address, mob_no: f.mob_no || r.data.contact_no }));
          setClientId(r.data.client_id || null);
          if (!isEdit) setPreviousPending(r.data.previous_pending);
        } else {
          setClientId(null);
        }
      }).catch(() => {});
    api.get('/outdoor-orders', { params: { search: name, limit: 200 } })
      .then(r => setClientHistory((r.data.data || []).filter(o => (o.party_name || '').toUpperCase() === name.toUpperCase())))
      .catch(() => {});
    if (!isEdit) {
      api.get('/outdoor-orders/available-quotations', { params: { client_name: name } })
        .then(r => setAvailableQuos(r.data || [])).catch(() => {});
    }
  };

  // Picking a Quo No (Add mode only) — mirrors CmbQNo_LostFocus: prefills header + copies
  // the quotation's full item grid and Post Production Items (operator left blank per row).
  const onQuoPick = (quoNo) => {
    setForm(f => ({ ...f, quo_no: quoNo }));
    if (!quoNo || isEdit) return;
    api.get(`/outdoor-orders/from-quotation/${quoNo}`).then(r => {
      const q = r.data;
      setForm(f => ({
        ...f, cust_name: q.client_name || f.cust_name, couple_name: q.couple_name || f.couple_name,
        remark: q.remark || f.remark, ref_by: q.ref_by || f.ref_by, address: q.address || f.address,
        mob_no: q.mob_no || f.mob_no, package_name: q.package_name || f.package_name,
        discount: q.discount || f.discount,
      }));
      setClientId(q.client_id || null);
      setItems((q.items || []).map(it => ({ ...EMPTY_ENTRY, ...it })));
      setDeliverables(q.deliverables || []);
    }).catch(() => setErr('Failed to load quotation'));
  };

  const setE = (k, v) => setEntry(en => {
    const next = { ...en, [k]: v };
    if (k === 'qnty' || k === 'rate') next.total = (Number(next.qnty) * Number(next.rate)) || 0;
    return next;
  });
  const onPickItem = (name) => {
    const it = itemList.find(x => x.item_name === name);
    setEntry(en => {
      const rate = it ? Number(it.rate) || 0 : en.rate;
      return { ...en, item_name: name, item_id: it?.id || null, rate, total: (Number(en.qnty) * rate) || 0 };
    });
  };
  const onPickOperator = (name) => {
    const op = operatorList.find(x => x.account_name === name);
    setEntry(en => ({ ...en, operator_name: name, operator_id: op?.id || null }));
  };
  const addOrUpdateEntry = () => {
    if (!entry.item_name) return setErr('Select an item to add');
    setErr('');
    const row = { ...entry, total: (Number(entry.qnty) * Number(entry.rate)) || 0 };
    if (editingIndex === null) setItems(arr => [...arr, row]);
    else setItems(arr => arr.map((r, i) => i === editingIndex ? row : r));
    setEntry({ ...EMPTY_ENTRY, function_date: entry.function_date });
    setEditingIndex(null);
  };
  const editRow = i => { setEntry({ ...EMPTY_ENTRY, ...items[i] }); setEditingIndex(i); setErr(''); };
  const cancelEntry = () => { setEntry({ ...EMPTY_ENTRY }); setEditingIndex(null); };
  const delRow = i => { setItems(arr => arr.filter((_, x) => x !== i)); if (editingIndex === i) cancelEntry(); };

  // Post Production Item — same add/edit/remove pattern as the main item grid.
  const setDE = (k, v) => setDeliverableEntry(en => ({ ...en, [k]: v }));
  const onPickDeliverableItem = (name) => {
    const d = deliverableList.find(x => x.item_name === name);
    setDeliverableEntry(en => ({ ...en, item_name: name, deliverable_item_id: d?.id || null, qnty: d?.qnty || en.qnty || 1 }));
  };
  const addOrUpdateDeliverable = () => {
    if (!deliverableEntry.item_name.trim()) return setErr('Select a post production item to add');
    setErr('');
    const row = { ...deliverableEntry };
    if (editingDeliverableIndex === null) setDeliverables(arr => [...arr, row]);
    else setDeliverables(arr => arr.map((r, i) => i === editingDeliverableIndex ? row : r));
    setDeliverableEntry({ ...EMPTY_DELIVERABLE_ENTRY });
    setEditingDeliverableIndex(null);
  };
  const editDeliverableRow = i => { setDeliverableEntry({ ...deliverables[i] }); setEditingDeliverableIndex(i); setErr(''); };
  const cancelDeliverableEntry = () => { setDeliverableEntry({ ...EMPTY_DELIVERABLE_ENTRY }); setEditingDeliverableIndex(null); };
  const delDeliverableRow = i => {
    setDeliverables(arr => arr.filter((_, x) => x !== i));
    if (editingDeliverableIndex === i) cancelDeliverableEntry();
  };

  const linesTotal   = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const deliverablesTotal = deliverables.reduce((s, d) => s + Number(d.amount || 0), 0);
  const subTotal     = linesTotal + deliverablesTotal;
  const grandTotal   = Math.max(0, subTotal - Number(form.discount || 0));
  const pending      = Math.max(0, grandTotal - Number(form.advance || 0));

  const buildBody = () => ({
    ...form, items, deliverables, client_id: clientId, updated_at: updatedAt,
    discount: Number(form.discount || 0), advance: Number(form.advance || 0),
    quo_no: form.quo_no ? Number(form.quo_no) : null,
  });

  const save = useCallback(async () => {
    if (!form.cust_name.trim()) { setErr('Customer name required'); return; }
    if (items.length === 0) { setErr('Add at least one item'); return; }
    setSaving(true); setErr('');
    try {
      if (isEdit) await api.put(`/outdoor-orders/${id}`, buildBody());
      else await api.post('/outdoor-orders', buildBody());
      nav('/outdoor-orders');
    } catch (ex) { setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, items, deliverables, clientId, updatedAt, isEdit, id]);

  const remove = async () => {
    if (!isEdit) return nav('/outdoor-orders');
    if (!confirm('Delete this order?')) return;
    await api.delete(`/outdoor-orders/${id}`);
    nav('/outdoor-orders');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const flag = v => v ? <Check size={14} className="flag-yes" /> : <span className="flag-no">–</span>;

  const doPrint = (withRate) => {
    const rows = items.map(it => `
      <tr><td>${fmt(it.function_date)}</td><td>${it.item_name}</td><td>${it.event_name || ''}</td>
      <td style="text-align:center">${it.qnty}</td>
      ${withRate ? `<td style="text-align:right">${cur(it.rate)}</td><td style="text-align:right">${cur(it.total)}</td>` : ''}
      </tr>`).join('');
    const deliverableRows = deliverables.map(d => `
      <tr><td colspan="3">${d.item_name}</td><td style="text-align:center">${d.qnty}</td>
      ${withRate ? `<td></td><td style="text-align:right">${cur(d.amount)}</td>` : ''}</tr>`).join('');
    const totalsBlock = withRate ? `
      <table class="tot"><tbody>
        <tr><td>Sub Total</td><td style="text-align:right">${cur(subTotal)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right">${cur(form.discount)}</td></tr>
        <tr><td>Advance</td><td style="text-align:right">${cur(form.advance)}</td></tr>
        <tr class="grand"><td>Grand Total</td><td style="text-align:right">${cur(grandTotal)}</td></tr>
        <tr><td>Pending</td><td style="text-align:right">${cur(pending)}</td></tr>
      </tbody></table>` : '';
    const w = window.open('', '_blank', 'width=800,height=900');
    w.document.write(`<!doctype html><html><head><title>Outdoor Order ${form.order_no}</title>
      <style>body{font-family:Arial,sans-serif;color:#111;padding:28px;font-size:13px}
      h1{font-size:20px;margin:0 0 4px}.muted{color:#555}
      .head{display:flex;justify-content:space-between;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 8px;font-size:12.5px}
      th{background:#eef2ff;text-align:left}
      .tot{width:300px;margin-left:auto;margin-top:12px}.tot td{border:none;padding:4px 8px}
      .grand{font-weight:700;border-top:1px solid #ccc}.note{margin-top:16px;white-space:pre-wrap}</style></head><body>
      <div class="head"><div><h1>Outdoor Order</h1>
      <div class="muted">Order No: ${form.order_no} &nbsp; Date: ${fmt(form.order_date)}</div></div>
      <div style="text-align:right"><div><b>${form.cust_name || ''}</b></div>
      <div class="muted">${form.couple_name || ''}</div><div class="muted">${form.mob_no || ''}</div></div></div>
      <table><thead><tr><th>Date</th><th>Item Name</th><th>Event</th><th style="text-align:center">Qnty</th>
      ${withRate ? '<th style="text-align:right">Rate</th><th style="text-align:right">Total</th>' : ''}</tr></thead>
      <tbody>${rows}${deliverableRows}</tbody></table>${totalsBlock}
      ${form.remark ? `<div class="note"><b>Remark:</b> ${form.remark}</div>` : ''}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  const digits = (form.mob_no || '').replace(/\D/g, '');
  const shareText = encodeURIComponent(
    `Outdoor Order ${form.order_no}\nCustomer: ${form.cust_name}\nGrand Total: ${cur(grandTotal)}\nAdvance: ${cur(form.advance)}\nPending: ${cur(pending)}`);
  const openWhatsApp = () => window.open(`https://wa.me/${digits ? '91'+digits : ''}?text=${shareText}`, '_blank');
  const openSMS   = () => { window.location.href = `sms:${digits}?body=${shareText}`; };
  const openEmail = () => { window.location.href = `mailto:?subject=${encodeURIComponent('Outdoor Order '+form.order_no)}&body=${shareText}`; };

  const STATUS = [
    ['st_selection','Selection'], ['st_invitation','Invitation'], ['st_data','Data'], ['st_delivery','Delivery'],
    ['st_desining','Desining'], ['st_printing','Printing'], ['st_dvd_pendrive','DVD/Pendrive'],
    ['st_done','Done'], ['st_reels','Reels'],
  ];
  const needsBank = form.payment_mode === 'Bank Transfer' || form.payment_mode === 'Cheque';

  return (
    <div className="page-container quotation-form">
      <div className="page-header">
        <div>
          <h1 className="page-title">Outdoor Order Book</h1>
          <p className="page-subtitle">{isEdit ? `Editing Order No ${form.order_no}` : `New — Order No ${form.order_no}`}</p>
        </div>
      </div>

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="page-cols" style={{ gridTemplateColumns: '2.4fr 1fr' }}>
        <div className="card">
          <div className="card-body form-grid">
            <div className="form-group">
              <label>Order No</label>
              <input value={form.order_no} readOnly style={{ background: 'hsl(var(--accent))', fontWeight: 700 }} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.order_date} onChange={set('order_date')} />
            </div>
            <div className="form-group">
              <label>Cust. Name *</label>
              <input list="oo-client-list" value={form.cust_name} onChange={set('cust_name')} onBlur={onClientBlur} required />
              <datalist id="oo-client-list">{clientList.map(c => <option key={c.id} value={c.account_name} />)}</datalist>
            </div>
            <div className="form-group">
              <label>Mob No</label>
              <input value={form.mob_no} onChange={set('mob_no')} />
            </div>
            <div className="form-group">
              <label>Quo No</label>
              <select value={form.quo_no} onChange={e => onQuoPick(e.target.value)} disabled={isEdit}>
                <option value="">—</option>
                {(isEdit && form.quo_no) && <option value={form.quo_no}>{form.quo_no}</option>}
                {!isEdit && availableQuos.map(q => <option key={q.id} value={q.quo_no}>{q.quo_no} — {q.client_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Couple</label>
              <input value={form.couple_name} onChange={set('couple_name')} />
            </div>
            <div className="form-group">
              <label>Ref</label>
              <input value={form.ref_by} onChange={set('ref_by')} />
            </div>
            <div className="form-group">
              <label>Package</label>
              <input value={form.package_name} onChange={set('package_name')} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Address</label>
              <input value={form.address} onChange={set('address')} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Remark</label>
              <input value={form.remark} onChange={set('remark')} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Order Detail</div></div>
            <div className="table-wrap" style={{ maxHeight: 130, overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Or.No</th><th>Date</th></tr></thead>
                <tbody>
                  {recent.length === 0 && <tr><td colSpan={2} style={{ color: '#9ca3af', padding: 12 }}>None yet</td></tr>}
                  {recent.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/outdoor-orders/${r.id}`)}>
                      <td><span className="badge badge-blue">{r.order_no}</span></td>
                      <td>{fmt(r.event_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">This Client's Orders</div></div>
            <div className="table-wrap" style={{ maxHeight: 110, overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Or.No</th><th>Date</th></tr></thead>
                <tbody>
                  {clientHistory.length === 0 && <tr><td colSpan={2} style={{ color: '#9ca3af', padding: 12 }}>None yet</td></tr>}
                  {clientHistory.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/outdoor-orders/${r.id}`)}>
                      <td><span className="badge badge-blue">{r.order_no}</span></td>
                      <td>{fmt(r.event_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Item entry */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="qitem-entry">
            <div className="form-group"><label>Function Date</label>
              <input type="date" value={entry.function_date} onChange={e => setE('function_date', e.target.value)} /></div>
            <div className="form-group" style={{ flex: 2 }}><label>Item Name</label>
              <input list="oo-item-list" value={entry.item_name} onChange={e => onPickItem(e.target.value)} placeholder="Select item…" />
              <datalist id="oo-item-list">{itemList.map(it => <option key={it.id} value={it.item_name} />)}</datalist></div>
            <div className="form-group" style={{ flex: 1.4 }}><label>Event Name</label>
              <input list="oo-event-list" value={entry.event_name} onChange={e => setE('event_name', e.target.value)} placeholder="Event…" />
              <datalist id="oo-event-list">{(eventList.length ? eventList : EVENTS).map(ev => <option key={ev} value={ev} />)}</datalist></div>
            <div className="form-group" style={{ width: 70 }}><label>Qnty</label>
              <input type="number" min={0} value={entry.qnty} onChange={e => setE('qnty', e.target.value)} /></div>
            <div className="form-group" style={{ width: 100 }}><label>Rate</label>
              <input type="number" min={0} step="0.01" value={entry.rate} onChange={e => setE('rate', e.target.value)} /></div>
            <div className="form-group" style={{ width: 110 }}><label>Total</label>
              <input value={cur(entry.total)} readOnly style={{ background: '#f9fafb', fontWeight: 600 }} /></div>
            <div className="form-group" style={{ width: 120 }}><label>Place</label>
              <input value={entry.place} onChange={e => setE('place', e.target.value)} /></div>
            <div className="form-group" style={{ width: 90 }}><label>Time</label>
              <input value={entry.time_slot} onChange={e => setE('time_slot', e.target.value)} placeholder="e.g. 6 PM" /></div>
            <label className="checkbox-row" style={{ color: '#dc2626', fontWeight: 600, paddingBottom: 8 }}>
              <input type="checkbox" checked={entry.data_issue_from_operator}
                onChange={e => setE('data_issue_from_operator', e.target.checked)} />
              <span>Data Issue From Oprater</span>
            </label>
          </div>

          <div className="qitem-entry" style={{ marginTop: 10 }}>
            <div className="form-group" style={{ flex: 1.6 }}><label>Oprator Name</label>
              <input list="oo-operator-list" value={entry.operator_name} onChange={e => onPickOperator(e.target.value)} />
              <datalist id="oo-operator-list">{operatorList.map(o => <option key={o.id} value={o.account_name} />)}</datalist></div>
            <div className="form-group" style={{ width: 110 }}><label>Op. Rate</label>
              <input type="number" min={0} value={entry.op_rate} onChange={e => setE('op_rate', e.target.value)} /></div>
            <div className="form-group" style={{ flex: 1.6 }}><label>Remark</label>
              <input value={entry.item_remark} onChange={e => setE('item_remark', e.target.value)} /></div>
            <label className="checkbox-row" style={{ paddingBottom: 8 }}>
              <input type="checkbox" checked={entry.sms_flag} onChange={e => setE('sms_flag', e.target.checked)} /><span>SMS</span></label>
            <label className="checkbox-row" style={{ paddingBottom: 8 }}>
              <input type="checkbox" checked={entry.data_flag} onChange={e => setE('data_flag', e.target.checked)} /><span>Data</span></label>
            <div className="form-group" style={{ width: 120 }}><label>Data 1</label>
              <input value={entry.data1} onChange={e => setE('data1', e.target.value)} /></div>
            <div className="form-group" style={{ width: 140 }}><label>Date 1</label>
              <input type="date" value={entry.date1} onChange={e => setE('date1', e.target.value)} /></div>
            <div className="qitem-entry-btns">
              <button type="button" className="btn btn-primary btn-sm" onClick={addOrUpdateEntry}>
                {editingIndex === null ? <><Plus size={15} /> Add</> : 'Update'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEntry}>Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {/* Items grid + totals */}
      <div className="page-cols" style={{ gridTemplateColumns: '2.4fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card">
            <div className="table-wrap" style={{ minHeight: 160 }}>
              <table className="data-table">
                <thead><tr>
                  <th>Date</th><th>Item Name</th><th>Event</th><th style={{ textAlign: 'center' }}>Qnty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>SMS</th><th style={{ textAlign: 'center' }}>Data</th>
                  <th>Data 1</th><th>Date 1</th><th></th>
                </tr></thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={11} className="table-empty"><p>No items added</p></td></tr>}
                  {items.map((it, i) => (
                    <tr key={i} style={editingIndex === i ? { background: 'hsl(var(--accent))' } : undefined}>
                      <td>{fmt(it.function_date)}</td>
                      <td><strong>{it.item_name}</strong></td>
                      <td>{it.event_name || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{it.qnty}</td>
                      <td style={{ textAlign: 'right' }}>{cur(it.rate)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{cur(it.total)}</td>
                      <td style={{ textAlign: 'center' }}>{flag(it.sms_flag)}</td>
                      <td style={{ textAlign: 'center' }}>{flag(it.data_flag)}</td>
                      <td>{it.data1 || '-'}</td>
                      <td>{it.date1 ? fmt(it.date1) : '-'}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={() => editRow(i)}><Pencil size={14} /></button>
                          <button className="btn-danger-soft" onClick={() => delRow(i)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Post Production Item — legacy TNS_WITEM3, same pattern as Quotation's */}
          <div className="card">
            <div className="card-header"><div className="card-title">Post Production Item</div></div>
            <div className="card-body">
              <div className="qitem-entry">
                <div className="form-group" style={{ flex: 1.6 }}><label>Item</label>
                  <input list="oo-deliverable-item-list" value={deliverableEntry.item_name}
                    onChange={e => onPickDeliverableItem(e.target.value)} placeholder="Select / type item…" />
                  <datalist id="oo-deliverable-item-list">
                    {deliverableList.map(d => <option key={d.id} value={d.item_name} />)}
                  </datalist></div>
                <div className="form-group" style={{ width: 80 }}><label>Qnty</label>
                  <input type="number" min={0} value={deliverableEntry.qnty} onChange={e => setDE('qnty', e.target.value)} /></div>
                <div className="form-group" style={{ width: 110 }}><label>Amount</label>
                  <input type="number" min={0} step="0.01" value={deliverableEntry.amount} onChange={e => setDE('amount', e.target.value)} /></div>
                <div className="qitem-entry-btns">
                  <button type="button" className="btn btn-primary btn-sm" onClick={addOrUpdateDeliverable}>
                    {editingDeliverableIndex === null ? <><Plus size={15} /> Add</> : 'Update'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={cancelDeliverableEntry}>Cancel</button>
                </div>
              </div>
              {deliverables.length > 0 && (
                <div className="table-wrap" style={{ marginTop: 10 }}>
                  <table className="data-table">
                    <thead><tr><th>Item</th><th style={{ textAlign: 'center' }}>Qnty</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
                    <tbody>
                      {deliverables.map((d, i) => (
                        <tr key={i} style={editingDeliverableIndex === i ? { background: 'hsl(var(--accent))' } : undefined}>
                          <td>{d.item_name}</td>
                          <td style={{ textAlign: 'center' }}>{d.qnty}</td>
                          <td style={{ textAlign: 'right' }}>{cur(d.amount)}</td>
                          <td>
                            <div className="action-btns">
                              <button className="btn-edit" onClick={() => editDeliverableRow(i)}><Pencil size={14} /></button>
                              <button className="btn-danger-soft" onClick={() => delDeliverableRow(i)}><Trash2 size={14} /></button>
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
        </div>

        <div className="card">
          <div className="card-body">
            <div className="summary-box">
              <div className="summary-row"><span>Sub Total</span><strong>{cur(subTotal)}</strong></div>
              {previousPending > 0 && (
                <div className="summary-row"><span>Previous Pending</span><strong>{cur(previousPending)}</strong></div>
              )}
              <div className="summary-row"><span>Discount</span>
                <input type="number" min={0} value={form.discount} onChange={set('discount')}
                  style={{ width: 120, textAlign: 'right', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} /></div>
              <div className="summary-row"><span style={{ color: '#dc2626', fontWeight: 600 }}>Advance</span>
                <input type="number" min={0} value={form.advance} onChange={set('advance')}
                  style={{ width: 120, textAlign: 'right', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} /></div>
              <div className="summary-row" style={{ fontSize: 15 }}>
                <strong>Grand Total</strong><strong style={{ color: 'hsl(var(--primary))' }}>{cur(grandTotal)}</strong></div>
              <div className="summary-row" style={{ borderBottom: needsBank ? undefined : 'none' }}>
                <span>Payment</span>
                <select value={form.payment_mode} onChange={set('payment_mode')} className="form-select" style={{ width: 130 }}>
                  {PAYMENTS.map(p => <option key={p}>{p}</option>)}
                </select></div>
              {needsBank && (
                <>
                  <div className="summary-row"><span>Our Bank</span>
                    <input value={form.bank_name} onChange={set('bank_name')} placeholder="Bank account name"
                      style={{ width: 160, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} /></div>
                  <div className="summary-row" style={{ borderBottom: 'none' }}><span>Cheque No</span>
                    <input value={form.cheque_no} onChange={set('cheque_no')}
                      style={{ width: 160, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6 }} /></div>
                </>
              )}
            </div>
            <div className="summary-row" style={{ padding: '8px 0 0', color: pending > 0 ? '#dc2626' : '#16a34a' }}>
              <span>Pending</span><strong>{cur(pending)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Deliverables + workflow */}
      <div className="page-cols" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="checkbox-row" style={{ color: '#dc2626', fontWeight: 600 }}>
              <input type="checkbox" checked={form.display_staff_expenses} onChange={chk('display_staff_expenses')} />
              <span>Display Staff And Expenses</span>
            </label>
            <button type="button" className="btn btn-outline" onClick={() => setPanel(p => p==='final'?'':'final')}>Final Delivery &amp; Post Production</button>
            {panel==='final' && <textarea rows={3} value={form.final_delivery_notes} onChange={set('final_delivery_notes')} />}
            <button type="button" className="btn btn-outline" onClick={() => setPanel(p => p==='pre'?'':'pre')}>PreWedding Deliverables</button>
            {panel==='pre' && <textarea rows={3} value={form.prewedding_deliverables} onChange={set('prewedding_deliverables')} />}
            <button type="button" className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => setPanel(p => p==='family'?'':'family')}>Family Detail</button>
            {panel==='family' && <textarea rows={3} value={form.family_detail} onChange={set('family_detail')} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Status</div></div>
          <div className="card-body">
            <div className="checkbox-grid">
              {STATUS.map(([k, label]) => (
                <label className="checkbox-row" key={k}>
                  <input type="checkbox" checked={form[k]} onChange={chk(k)} /><span>{label}</span>
                </label>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="form-group"><label>Desining</label><input value={form.desining_opt} onChange={set('desining_opt')} /></div>
              <div className="form-group"><label>Printing</label><input value={form.printing_opt} onChange={set('printing_opt')} /></div>
              <div className="form-group"><label>DVD / Pendrive</label><input value={form.dvd_opt} onChange={set('dvd_opt')} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="quotation-actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save'}</button>
        <button className="btn btn-danger"  onClick={remove}><Trash2 size={15} /> Delete</button>
        <button className="btn btn-outline" onClick={() => doPrint(true)}><Printer size={15} /> With Rate</button>
        <button className="btn btn-outline" onClick={() => doPrint(false)}><Printer size={15} /> Without Rate</button>
        <button className="btn btn-ghost"   onClick={() => nav('/outdoor-orders')}><X size={15} /> Cancel</button>
        <button className="btn btn-ghost"   onClick={() => nav('/outdoor-orders')}><LogOut size={15} /> Exit</button>
        <button className="btn btn-outline" onClick={openSMS}><MessageSquare size={15} /> Send SMS</button>
        <button className="btn btn-outline" onClick={openWhatsApp}><Send size={15} /> WhatsApp</button>
        <button className="btn btn-outline" onClick={openEmail}><Mail size={15} /> Send Email</button>
      </div>
    </div>
  );
}
