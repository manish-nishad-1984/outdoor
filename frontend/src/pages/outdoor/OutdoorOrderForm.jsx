import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, Trash2, Printer, X, MessageSquare, Mail, Send, Plus, Pencil, Check, ArrowLeft, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios';
import '../../components/docForm.css';

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
  const [panel, setPanel]     = useState(''); // '', 'final', 'pre', 'family'
  // Rarely-used header fields and per-item extras stay folded away until needed.
  const [showMore, setShowMore] = useState(false);
  const [showEntryMore, setShowEntryMore] = useState(false);
  const itemNameRef = useRef(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => {
    api.get('/items').then(r => setItemList((r.data || []).filter(x => !x.not_use))).catch(() => {});
    api.get('/events').then(r => setEventList((r.data || []).filter(x => !x.not_use).map(x => x.event_name))).catch(() => {});
    api.get('/deliverable-items').then(r => setDeliverableList(r.data || [])).catch(() => {});
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
        if (o.address || o.ref_by || o.package_name) setShowMore(true);
      }).catch(() => setErr('Failed to load order'));
    } else {
      resetNew();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  // Blank new order. The /new and /:id routes share this component instance, so going from
  // an edit to "New" must clear state explicitly rather than rely on a remount.
  function resetNew() {
    setForm({ ...EMPTY_FORM, order_date: today() });
    setItems([]); setDeliverables([]);
    setEntry({ ...EMPTY_ENTRY, function_date: today() }); setEditingIndex(null);
    setDeliverableEntry({ ...EMPTY_DELIVERABLE_ENTRY }); setEditingDeliverableIndex(null);
    setAvailableQuos([]); setClientHistory([]); setPreviousPending(0);
    setClientId(null); setUpdatedAt(null); setErr(''); setPanel(''); setShowMore(false); setShowEntryMore(false);
    api.get('/outdoor-orders/next-no').then(r => setForm(f => ({ ...f, order_no: r.data.next }))).catch(() => {});
  }

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
    itemNameRef.current?.focus();
  };
  const editRow = i => {
    const it = items[i];
    setEntry({ ...EMPTY_ENTRY, ...it }); setEditingIndex(i); setErr('');
    if (it.place || it.time_slot || it.operator_name || it.op_rate || it.item_remark || it.data1 || it.date1
      || it.sms_flag || it.data_flag || it.data_issue_from_operator) setShowEntryMore(true);
  };
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

  // Ctrl+S saves from anywhere on the form.
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const remove = async () => {
    if (!isEdit) return nav('/outdoor-orders');
    if (!confirm('Delete this order?')) return;
    await api.delete(`/outdoor-orders/${id}`);
    nav('/outdoor-orders');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

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
    ['st_desining','Designing'], ['st_printing','Printing'], ['st_dvd_pendrive','DVD/Pendrive'],
    ['st_done','Done'], ['st_reels','Reels'],
  ];
  const needsBank = form.payment_mode === 'Bank Transfer' || form.payment_mode === 'Cheque';
  const onEntryKey = add => e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); add(); } };
  const itemMeta = it => [it.place, it.time_slot, it.operator_name && `Op: ${it.operator_name}${it.op_rate ? ` (${cur(it.op_rate)})` : ''}`,
    it.item_remark, it.data1, it.date1 && fmt(it.date1)].filter(Boolean).join(' · ');

  return (
    <div className="qf">
      <div className="qf-top">
        <button type="button" className="qf-back" onClick={() => nav('/outdoor-orders')} title="Back to list"><ArrowLeft size={18} /></button>
        <h1>{isEdit ? 'Edit Order / Bill' : 'New Order / Bill'}</h1>
        <span className="qf-no">#{form.order_no}</span>
        <span className="qf-top-hint">Ctrl+S to save</span>
      </div>

      {err && <div className="alert alert-error qf-alert">{err}</div>}

      <div className="qf-grid">
        <div className="qf-main">
          {/* 1 — customer (or start from one of their quotations) */}
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">1</span> Customer</h2>
            <div className="qf-fields">
              <label className="qf-field qf-span2">
                <span>Customer Name *</span>
                <input list="oo-client-list" value={form.cust_name} onChange={set('cust_name')} onBlur={onClientBlur}
                  placeholder="Type or pick a customer" autoFocus={!isEdit} />
                <datalist id="oo-client-list">{clientList.map(c => <option key={c.id} value={c.account_name} />)}</datalist>
              </label>
              <label className="qf-field">
                <span>Mobile No</span>
                <input value={form.mob_no} onChange={set('mob_no')} inputMode="tel" />
              </label>
              <label className="qf-field">
                <span>Date</span>
                <input type="date" value={form.order_date} onChange={set('order_date')} />
              </label>
              <label className="qf-field qf-span2">
                <span>Couple Name</span>
                <input value={form.couple_name} onChange={set('couple_name')} />
              </label>
              <label className="qf-field qf-span2">
                <span>From Quotation {!isEdit && !availableQuos.length && <em>(enter customer first)</em>}</span>
                <select value={form.quo_no} onChange={e => onQuoPick(e.target.value)} disabled={isEdit}>
                  <option value="">{isEdit ? '—' : 'None — enter items manually'}</option>
                  {(isEdit && form.quo_no) && <option value={form.quo_no}>Quotation #{form.quo_no}</option>}
                  {!isEdit && availableQuos.map(q => <option key={q.id} value={q.quo_no}>Quotation #{q.quo_no} — {q.client_name}</option>)}
                </select>
              </label>
              {showMore && <>
                <label className="qf-field qf-span2">
                  <span>Address</span>
                  <input value={form.address} onChange={set('address')} />
                </label>
                <label className="qf-field">
                  <span>Ref. By</span>
                  <input value={form.ref_by} onChange={set('ref_by')} />
                </label>
                <label className="qf-field">
                  <span>Package</span>
                  <input value={form.package_name} onChange={set('package_name')} />
                </label>
              </>}
            </div>
            <div className="qf-sec-foot">
              <button type="button" className="qf-link" onClick={() => setShowMore(v => !v)}>
                {showMore ? <><ChevronUp size={14} /> Fewer details</> : <><ChevronDown size={14} /> Address, Ref. By, Package</>}
              </button>
              {clientHistory.length > 0 && (
                <div className="qf-history">
                  <span>Earlier orders:</span>
                  {clientHistory.map(r => (
                    <button type="button" key={r.id} onClick={() => nav(`/outdoor-orders/${r.id}`)} title={fmt(r.event_date)}>#{r.order_no}</button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 2 — shoot items; the last row is the entry row, with per-item extras folded under it */}
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">2</span> Items</h2>
            <div className="qf-table-wrap">
              <table className="qf-table">
                <thead><tr>
                  <th style={{ width: 140 }}>Date</th>
                  <th>Item</th>
                  <th style={{ width: 150 }}>Event</th>
                  <th className="r" style={{ width: 70 }}>Qty</th>
                  <th className="r" style={{ width: 100 }}>Rate</th>
                  <th className="r" style={{ width: 100 }}>Amount</th>
                  <th style={{ width: 132 }}></th>
                </tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className={editingIndex === i ? 'editing' : undefined}>
                      <td>{fmt(it.function_date)}</td>
                      <td>
                        <span className="b">{it.item_name}</span>
                        {(it.sms_flag || it.data_flag || it.data_issue_from_operator) && (
                          <span className="qf-tags">
                            {it.sms_flag && <span>SMS</span>}
                            {it.data_flag && <span>Data</span>}
                            {it.data_issue_from_operator && <span className="warn">Data from operator</span>}
                          </span>
                        )}
                        {itemMeta(it) && <div className="qf-meta">{itemMeta(it)}</div>}
                      </td>
                      <td>{it.event_name || '-'}</td>
                      <td className="r">{it.qnty}</td>
                      <td className="r">{cur(it.rate)}</td>
                      <td className="r b">{cur(it.total)}</td>
                      <td className="acts">
                        <button type="button" onClick={() => editRow(i)} title="Edit"><Pencil size={14} /></button>
                        <button type="button" className="del" onClick={() => delRow(i)} title="Remove"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  <tr className="qf-entry" onKeyDown={onEntryKey(addOrUpdateEntry)}>
                    <td><input type="date" value={entry.function_date} onChange={e => setE('function_date', e.target.value)} /></td>
                    <td>
                      <input ref={itemNameRef} list="oo-item-list" value={entry.item_name} onChange={e => onPickItem(e.target.value)} placeholder="Item…" />
                      <datalist id="oo-item-list">{itemList.map(it => <option key={it.id} value={it.item_name} />)}</datalist>
                    </td>
                    <td>
                      <input list="oo-event-list" value={entry.event_name} onChange={e => setE('event_name', e.target.value)} placeholder="Event…" />
                      <datalist id="oo-event-list">{(eventList.length ? eventList : EVENTS).map(ev => <option key={ev} value={ev} />)}</datalist>
                    </td>
                    <td><input className="r" type="number" min={0} value={entry.qnty} onChange={e => setE('qnty', e.target.value)} /></td>
                    <td><input className="r" type="number" min={0} step="0.01" value={entry.rate} onChange={e => setE('rate', e.target.value)} /></td>
                    <td className="r b">{cur(entry.total)}</td>
                    <td className="acts">
                      <button type="button" className={showEntryMore ? 'on' : undefined} onClick={() => setShowEntryMore(v => !v)}
                        title="Place, time, operator, SMS / Data…">
                        {showEntryMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />} More
                      </button>
                      <button type="button" className="add" onClick={addOrUpdateEntry} title="Add (Enter)">
                        {editingIndex === null ? <><Plus size={14} /> Add</> : <><Check size={14} /> Update</>}
                      </button>
                      {editingIndex !== null && <button type="button" onClick={cancelEntry} title="Cancel edit"><X size={14} /></button>}
                    </td>
                  </tr>
                  {showEntryMore && (
                    <tr className="qf-entry qf-entry-more" onKeyDown={onEntryKey(addOrUpdateEntry)}>
                      <td colSpan={7}>
                        <div className="qf-more-grid">
                          <label className="qf-field"><span>Place</span>
                            <input value={entry.place} onChange={e => setE('place', e.target.value)} /></label>
                          <label className="qf-field"><span>Time</span>
                            <input value={entry.time_slot} onChange={e => setE('time_slot', e.target.value)} placeholder="e.g. 6 PM" /></label>
                          <label className="qf-field qf-span2"><span>Operator</span>
                            <input list="oo-operator-list" value={entry.operator_name} onChange={e => onPickOperator(e.target.value)} />
                            <datalist id="oo-operator-list">{operatorList.map(o => <option key={o.id} value={o.account_name} />)}</datalist></label>
                          <label className="qf-field"><span>Op. Rate</span>
                            <input className="r" type="number" min={0} value={entry.op_rate} onChange={e => setE('op_rate', e.target.value)} /></label>
                          <label className="qf-field qf-span2"><span>Item Remark</span>
                            <input value={entry.item_remark} onChange={e => setE('item_remark', e.target.value)} /></label>
                          <label className="qf-field"><span>Data 1</span>
                            <input value={entry.data1} onChange={e => setE('data1', e.target.value)} /></label>
                          <label className="qf-field"><span>Date 1</span>
                            <input type="date" value={entry.date1} onChange={e => setE('date1', e.target.value)} /></label>
                          <div className="qf-checks">
                            <label><input type="checkbox" checked={entry.sms_flag} onChange={e => setE('sms_flag', e.target.checked)} /> SMS</label>
                            <label><input type="checkbox" checked={entry.data_flag} onChange={e => setE('data_flag', e.target.checked)} /> Data</label>
                            <label className="warn"><input type="checkbox" checked={entry.data_issue_from_operator}
                              onChange={e => setE('data_issue_from_operator', e.target.checked)} /> Data issue from operator</label>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {items.length === 0 && <p className="qf-hint">Fill the row above and press <kbd>Enter</kbd> to add an item{!isEdit && ', or pick a quotation above to copy its items'}.</p>}
          </section>

          {/* 3 — post production (album, video…) */}
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">3</span> Post Production <small>album, video, frames…</small></h2>
            <div className="qf-table-wrap">
              <table className="qf-table">
                <thead><tr>
                  <th>Item</th>
                  <th className="r" style={{ width: 70 }}>Qty</th>
                  <th className="r" style={{ width: 110 }}>Amount</th>
                  <th style={{ width: 96 }}></th>
                </tr></thead>
                <tbody>
                  {deliverables.map((d, i) => (
                    <tr key={i} className={editingDeliverableIndex === i ? 'editing' : undefined}>
                      <td className="b">{d.item_name}</td>
                      <td className="r">{d.qnty}</td>
                      <td className="r b">{cur(d.amount)}</td>
                      <td className="acts">
                        <button type="button" onClick={() => editDeliverableRow(i)} title="Edit"><Pencil size={14} /></button>
                        <button type="button" className="del" onClick={() => delDeliverableRow(i)} title="Remove"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  <tr className="qf-entry" onKeyDown={onEntryKey(addOrUpdateDeliverable)}>
                    <td>
                      <input list="oo-deliverable-item-list" value={deliverableEntry.item_name}
                        onChange={e => onPickDeliverableItem(e.target.value)} placeholder="Album, video…" />
                      <datalist id="oo-deliverable-item-list">{deliverableList.map(d => <option key={d.id} value={d.item_name} />)}</datalist>
                    </td>
                    <td><input className="r" type="number" min={0} value={deliverableEntry.qnty} onChange={e => setDE('qnty', e.target.value)} /></td>
                    <td><input className="r" type="number" min={0} step="0.01" value={deliverableEntry.amount} onChange={e => setDE('amount', e.target.value)} /></td>
                    <td className="acts">
                      <button type="button" className="add" onClick={addOrUpdateDeliverable} title="Add (Enter)">
                        {editingDeliverableIndex === null ? <><Plus size={14} /> Add</> : <><Check size={14} /> Update</>}
                      </button>
                      {editingDeliverableIndex !== null && <button type="button" onClick={cancelDeliverableEntry} title="Cancel edit"><X size={14} /></button>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4 — work progress and notes */}
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">4</span> Work Status &amp; Notes</h2>
            <div className="qf-pills">
              {STATUS.map(([k, label]) => (
                <label key={k} className={form[k] ? 'on' : undefined}>
                  <input type="checkbox" checked={form[k]} onChange={chk(k)} />{form[k] && <Check size={13} />} {label}
                </label>
              ))}
            </div>
            <div className="qf-fields" style={{ marginTop: 14 }}>
              <label className="qf-field"><span>Designing</span><input value={form.desining_opt} onChange={set('desining_opt')} /></label>
              <label className="qf-field"><span>Printing</span><input value={form.printing_opt} onChange={set('printing_opt')} /></label>
              <label className="qf-field qf-span2"><span>DVD / Pendrive</span><input value={form.dvd_opt} onChange={set('dvd_opt')} /></label>
              <label className="qf-field qf-span4"><span>Remark (prints on the bill)</span>
                <textarea rows={2} value={form.remark} onChange={set('remark')} /></label>
            </div>
            <div className="qf-tabs">
              {[['final', 'Final Delivery & Post Production', 'final_delivery_notes'],
                ['pre', 'Pre-Wedding Deliverables', 'prewedding_deliverables'],
                ['family', 'Family Detail', 'family_detail']].map(([k, label, field]) => (
                <button type="button" key={k} className={panel === k ? 'on' : undefined} onClick={() => setPanel(p => p === k ? '' : k)}>
                  {label}{form[field] ? ' •' : ''}
                </button>
              ))}
              <label className="qf-tabs-chk"><input type="checkbox" checked={form.display_staff_expenses} onChange={chk('display_staff_expenses')} /> Display staff &amp; expenses</label>
            </div>
            {panel === 'final' && <textarea rows={3} value={form.final_delivery_notes} onChange={set('final_delivery_notes')} placeholder="Final delivery & post production notes…" />}
            {panel === 'pre' && <textarea rows={3} value={form.prewedding_deliverables} onChange={set('prewedding_deliverables')} placeholder="Pre-wedding deliverables…" />}
            {panel === 'family' && <textarea rows={3} value={form.family_detail} onChange={set('family_detail')} placeholder="Family members, contacts…" />}
          </section>
        </div>

        {/* Totals, payment and every action in one sticky panel */}
        <aside className="qf-side">
          <div className="qf-card qf-sum">
            <h2 className="qf-sec">Summary</h2>
            <div className="qf-sum-row"><span>Items ({items.length})</span><span>{cur(linesTotal)}</span></div>
            <div className="qf-sum-row"><span>Post production ({deliverables.length})</span><span>{cur(deliverablesTotal)}</span></div>
            <div className="qf-sum-row strong"><span>Sub Total</span><span>{cur(subTotal)}</span></div>
            <label className="qf-sum-row"><span>Discount (₹)</span>
              <input type="number" min={0} value={form.discount} onChange={set('discount')} /></label>
            <div className="qf-grand"><span>Grand Total</span><strong>{cur(grandTotal)}</strong></div>

            <label className="qf-sum-row"><span>Advance (₹)</span>
              <input type="number" min={0} value={form.advance} onChange={set('advance')} /></label>
            <label className="qf-sum-row"><span>Paid by</span>
              <select value={form.payment_mode} onChange={set('payment_mode')}>
                {PAYMENTS.map(p => <option key={p}>{p}</option>)}
              </select></label>
            {needsBank && <>
              <label className="qf-sum-row"><span>Our Bank</span>
                <input value={form.bank_name} onChange={set('bank_name')} placeholder="Bank account" style={{ width: 150, textAlign: 'left' }} /></label>
              <label className="qf-sum-row"><span>Cheque No</span>
                <input value={form.cheque_no} onChange={set('cheque_no')} style={{ width: 150, textAlign: 'left' }} /></label>
            </>}
            <div className={`qf-pending${pending > 0 ? ' due' : ''}`}><span>Pending</span><strong>{cur(pending)}</strong></div>
            {previousPending > 0 && <div className="qf-sum-row pur"><span>Previous pending (other bills)</span><span>{cur(previousPending)}</span></div>}

            <button type="button" className="btn btn-primary qf-save" onClick={save} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save Order'}
            </button>
            <div className="qf-actions">
              <details className="qf-menu">
                <summary className="btn btn-outline"><Printer size={15} /> Print <ChevronDown size={14} /></summary>
                <div className="qf-menu-list" onClick={e => e.currentTarget.parentElement.removeAttribute('open')}>
                  <button type="button" onClick={() => doPrint(true)}><Printer size={14} /> With rates</button>
                  <button type="button" onClick={() => doPrint(false)}><Printer size={14} /> Without rates</button>
                </div>
              </details>
              <details className="qf-menu">
                <summary className="btn btn-outline"><Send size={15} /> Send <ChevronDown size={14} /></summary>
                <div className="qf-menu-list right" onClick={e => e.currentTarget.parentElement.removeAttribute('open')}>
                  <button type="button" onClick={openWhatsApp}><Send size={14} /> WhatsApp</button>
                  <button type="button" onClick={openSMS}><MessageSquare size={14} /> SMS</button>
                  <button type="button" onClick={openEmail}><Mail size={14} /> Email</button>
                </div>
              </details>
            </div>
            <div className="qf-actions-sub">
              <button type="button" onClick={() => (isEdit ? nav('/outdoor-orders/new') : resetNew())}><X size={14} /> {isEdit ? 'New order' : 'Clear form'}</button>
              {isEdit && <button type="button" className="del" onClick={remove}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
