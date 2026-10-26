import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, Trash2, Printer, X, Send, Plus, Pencil, FileDown, ArrowLeft, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../api/axios';
import '../../components/docForm.css';

const EVENTS = ['Wedding','Reception','Engagement','Haldi','Mehndi','Sangeet',
  'Pre-Wedding','Ring Ceremony','Baby Shower','Birthday','Other'];

// Print letterhead — matches the legacy Crystal Reports "Print(Rate)"/"Print(W/O Rate)"
// output (studio contact details + Terms & Condition text transcribed from the client's
// sample PDF). Used as a fallback until /print-settings (the web port of legacy
// FrmPrintSettings.vb) loads — see printSettings state below, which is the live source.
const DEFAULT_STUDIO = {
  name: 'Am Photo Studio',
  address: '324, 3 Floor, Angel Business Center, 1, Abc Cir, Mota Varachha, Surat,',
  phone: '+91 99097 96518',
  instagram: '@am_photo_studio_',
  logo: '',
  showLogo: false,
};
const TERMS = [
  '75% Payment Advance before Booking, 15% After Function, 10% Time Of Final Work Deliver.',
  'Your Final Work will be Delivered approx 90 days after your function.',
  'If any technical error occurred & data might lost then it will be not our responsebility.',
  'Travelling charges of our team would must be paid by you, and give us proper travelling situations.',
  'On your auspicious occasion, kindly co-operate our team.',
  "At the time of booking discussed things, none of the changes would be done after the occasion, i.e. if our quote includes album, it cannot t be canceled later on.",
  'Photos of dinner/lunch would be taken for couples only.',
  'Any kind of changes in final movie/album would be done only once, and to make changes please visit us at our office (not on call).',
  'Any issues in your final work would be discussed only with the person who visited us at the time of booking.',
];

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_ENTRY = {
  function_date: today(), item_name: '', item_id: null, event_name: '', event_id: null,
  qnty: 1, rate: 0, total: 0, operator_name: '', operator_id: null, camera_model: '',
  place: '', op_rate: 0, op_time: '', pur_rate: 0,
};
const EMPTY_DELIVERABLE_ENTRY = { item_name: '', deliverable_item_id: null, qnty: 1, amount: 0 };
const EMPTY_FORM = {
  quo_no: '', quo_date: today(), client_name: '', couple_name: '', ref_by: '', order_no: '',
  address: '', contact_no: '', email: '',
  discount: 0, note: '',
  display_purchase_rate: false,
  gst_type: 'STATE', extra_charge: 0, advance: 0,
};

export default function QuotationForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm]     = useState({ ...EMPTY_FORM });
  const [items, setItems]   = useState([]);
  const [entry, setEntry]   = useState({ ...EMPTY_ENTRY });
  const itemNameRef = useRef(null);
  // Explicit web state replacing the legacy AFlag/EFlag/crow trio: null = composing a
  // new row (Add), a number = the index of the row currently being edited (Update).
  const [editingIndex, setEditingIndex] = useState(null);

  const [itemList, setItemList]         = useState([]);
  const [eventList, setEventList]       = useState([]);
  const [clientList, setClientList]     = useState([]);
  const [deliverableList, setDeliverableList] = useState([]);
  const [deliverables, setDeliverables] = useState([]); // added post production item rows
  const [deliverableEntry, setDeliverableEntry] = useState({ ...EMPTY_DELIVERABLE_ENTRY });
  const deliverableItemNameRef = useRef(null);
  const [editingDeliverableIndex, setEditingDeliverableIndex] = useState(null);
  const [clientHistory, setClientHistory] = useState([]);
  const [clientInfo, setClientInfo]     = useState(null); // { previous_pending, credit_limit, over_limit }
  const [previousPending, setPreviousPending] = useState(0);
  // clientId: the resolved accounts.id for the current Client Name — sent back on save so
  // the server can match by ID first instead of re-resolving by name every time (audit fix,
  // avoids spawning a duplicate account if the client was renamed in Account Master).
  const [clientId, setClientId] = useState(null);
  // updatedAt: the record's last-saved timestamp as loaded — sent back on save so the
  // server can detect and reject a save against a stale copy (optimistic concurrency).
  const [updatedAt, setUpdatedAt] = useState(null);

  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [studio, setStudio]   = useState(DEFAULT_STUDIO);
  // Rarely-used fields stay folded away so the form opens with only what most quotations need.
  const [showMore, setShowMore] = useState(false);
  const [showCameraCol, setShowCameraCol] = useState(false);
  // Live preview — lets staff proofread the actual client-facing document as they build the
  // quotation, instead of only seeing it after Print. Entry stays row-plus-Add-button; this
  // is purely a read-only mirror of items/deliverables/totals.

  // Reference data — mirrors FrmOutdoor_Load's Fill*Combo calls.
  useEffect(() => {
    api.get('/items').then(r => setItemList((r.data || []).filter(x => !x.not_use))).catch(() => {});
    api.get('/events').then(r => setEventList((r.data || []).filter(x => !x.not_use).map(x => x.event_name))).catch(() => {});
    api.get('/deliverable-items').then(r => setDeliverableList(r.data || [])).catch(() => {});
    api.get('/accounts-master').then(r => {
      const groups = r.data || [];
      const clientGroup = groups.find(g => (g.group_name || '').toUpperCase() === 'CLIENT');
      if (clientGroup) api.get('/accounts', { params: { group_id: clientGroup.id } })
        .then(r2 => setClientList(r2.data || [])).catch(() => {});
    }).catch(() => {});
    // Live letterhead source — legacy FrmPrintSettings.vb / OPT_PRINT via /print-settings.
    api.get('/print-settings').then(r => {
      const s = r.data || {};
      setStudio({
        name: s.company_name || DEFAULT_STUDIO.name,
        address: s.address || DEFAULT_STUDIO.address,
        phone: s.mobile_no || DEFAULT_STUDIO.phone,
        instagram: s.insta_id || DEFAULT_STUDIO.instagram,
        logo: s.logo_image || '',
        showLogo: s.display_logo !== false && !!s.logo_image,
      });
    }).catch(() => {});
  }, []);

  // Load next number (new) or existing record (edit) — mirrors Autonumber() vs
  // CmbTNo_SelectionChangeCommitted → DisplayAllData()/DisplayGrid().
  useEffect(() => {
    if (isEdit) {
      api.get(`/quotations/${id}`).then(r => {
        const q = r.data;
        setForm({
          quo_no: q.quo_no || '', quo_date: q.quo_date?.slice(0,10) || today(),
          client_name: q.client_name || '', couple_name: q.couple_name || '',
          ref_by: q.ref_by || '', order_no: q.order_no === '-' ? '' : (q.order_no || ''),
          address: q.address || '', contact_no: q.contact_no || '', email: q.email || '',
          discount: Number(q.discount) || 0,
          note: q.note || '',
          display_purchase_rate: !!q.display_purchase_rate,
          gst_type: q.gst_type || 'STATE', extra_charge: Number(q.extra_charge) || 0,
          advance: Number(q.advance) || 0,
        });
        setClientId(q.client_id || null);
        setUpdatedAt(q.updated_at || null);
        setItems((q.items || []).map(it => ({
          function_date: it.function_date?.slice(0,10) || '', item_name: it.item_name || '',
          item_id: it.item_id, event_name: it.event_name || '', event_id: it.event_id,
          qnty: Number(it.qnty) || 0, rate: Number(it.rate) || 0, total: Number(it.total) || 0,
          operator_name: it.operator_name || '', operator_id: it.operator_id,
          camera_model: it.camera_model || '', place: it.place || '',
          op_rate: Number(it.op_rate) || 0, op_time: it.op_time || '',
          pur_rate: Number(it.pur_rate) || 0,
        })));
        setDeliverables((q.deliverables || []).map(d => ({
          deliverable_item_id: d.deliverable_item_id, item_name: d.item_name,
          qnty: Number(d.qnty) || 0, amount: Number(d.amount) || 0,
        })));
        setPreviousPending(Number(q.previous_pending) || 0);
        if (q.address || q.email || q.ref_by) setShowMore(true);
      }).catch(() => setErr('Failed to load quotation'));
    } else {
      resetNew();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  // Blank new quotation. The /new and /:id routes share this component instance, so going
  // from an edit to "New" must clear state explicitly rather than rely on a remount.
  function resetNew() {
    setForm({ ...EMPTY_FORM, quo_date: today() });
    setItems([]); setDeliverables([]);
    setEntry({ ...EMPTY_ENTRY, function_date: today() }); setEditingIndex(null);
    setDeliverableEntry({ ...EMPTY_DELIVERABLE_ENTRY }); setEditingDeliverableIndex(null);
    setClientHistory([]); setClientInfo(null); setPreviousPending(0);
    setClientId(null); setUpdatedAt(null); setErr(''); setShowMore(false);
    api.get('/quotations/next-no').then(r => setForm(f => ({ ...f, quo_no: r.data.next }))).catch(() => {});
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Client selection — mirrors CmbPName_SelectionChangeCommitted / CmbPName_LostFocus:
  // auto-fill address/contact/email, load this client's own quotation history, compute
  // previous pending, and surface a (non-blocking) credit-limit warning.
  const onClientBlur = () => {
    const name = form.client_name.trim();
    if (!name) { setClientInfo(null); setClientHistory([]); return; }
    api.get('/quotations/client-info', { params: { client_name: name, exclude_id: id || 0 } })
      .then(r => {
        setClientInfo(r.data);
        if (r.data) {
          setForm(f => ({
            ...f,
            address: f.address || r.data.address,
            contact_no: f.contact_no || r.data.contact_no,
            email: f.email || r.data.email,
          }));
          setClientId(r.data.client_id || null);
          if (!isEdit) setPreviousPending(r.data.previous_pending);
        } else {
          setClientId(null); // typed name doesn't match an existing account — save will create one
        }
      }).catch(() => {});
    api.get('/quotations', { params: { search: name, limit: 200 } })
      .then(r => setClientHistory((r.data.data || []).filter(q => (q.client_name || '').toUpperCase() === name.toUpperCase())))
      .catch(() => {});
  };

  // Entry row handlers
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
  // Matches the legacy in-grid duplicate scan in Valid1() (FrmQuotaionNew.vb:204-218):
  // same function date + item within this quotation is rejected.
  const findDuplicateIndex = () => {
    const key = [entry.function_date || '', entry.item_name.trim().toUpperCase()].join('|');
    return items.findIndex((it, i) => i !== editingIndex &&
      [it.function_date || '', (it.item_name || '').trim().toUpperCase()].join('|') === key);
  };

  const addOrUpdateEntry = () => {
    if (!entry.item_name.trim()) return setErr('Select an item to add');
    if (!entry.event_name.trim()) return setErr('Select an event for this item');
    if (findDuplicateIndex() !== -1) return setErr('This item is already added for this date');
    setErr('');
    const row = { ...entry, total: (Number(entry.qnty) * Number(entry.rate)) || 0 };
    if (editingIndex === null) {
      setItems(arr => [...arr, row]);
    } else {
      setItems(arr => arr.map((r, i) => i === editingIndex ? row : r));
    }
    setEntry({ ...EMPTY_ENTRY, function_date: entry.function_date });
    setEditingIndex(null);
    itemNameRef.current?.focus();
  };
  const editRow = (i) => { setEntry({ ...items[i] }); setEditingIndex(i); setErr(''); };
  const cancelEntry = () => { setEntry({ ...EMPTY_ENTRY }); setEditingIndex(null); };
  const delRow = i => {
    setItems(arr => arr.filter((_, x) => x !== i));
    if (editingIndex === i) cancelEntry();
  };

  // Post Production Item — add/remove rows, matching the confirmed legacy rule that
  // TNS_WITEM2's SUM(AMT) is added into STOTAL.
  const setDE = (k, v) => setDeliverableEntry(en => ({ ...en, [k]: v }));
  const onPickDeliverableItem = (name) => {
    const d = deliverableList.find(x => x.item_name === name);
    setDeliverableEntry(en => ({ ...en, item_name: name, deliverable_item_id: d?.id || null, qnty: d?.qnty || en.qnty || 1 }));
  };
  const findDuplicateDeliverableIndex = () => {
    const name = deliverableEntry.item_name.trim().toUpperCase();
    return deliverables.findIndex((d, i) => i !== editingDeliverableIndex && (d.item_name || '').trim().toUpperCase() === name);
  };
  const addOrUpdateDeliverable = () => {
    if (!deliverableEntry.item_name.trim()) return setErr('Select a post production item to add');
    if (findDuplicateDeliverableIndex() !== -1) return setErr('This post production item is already added');
    setErr('');
    const row = { ...deliverableEntry };
    if (editingDeliverableIndex === null) {
      setDeliverables(arr => [...arr, row]);
    } else {
      setDeliverables(arr => arr.map((r, i) => i === editingDeliverableIndex ? row : r));
    }
    setDeliverableEntry({ ...EMPTY_DELIVERABLE_ENTRY });
    setEditingDeliverableIndex(null);
    deliverableItemNameRef.current?.focus();
  };
  const editDeliverableRow = (i) => { setDeliverableEntry({ ...deliverables[i] }); setEditingDeliverableIndex(i); setErr(''); };
  const cancelDeliverableEntry = () => { setDeliverableEntry({ ...EMPTY_DELIVERABLE_ENTRY }); setEditingDeliverableIndex(null); };
  const delDeliverableRow = i => {
    setDeliverables(arr => arr.filter((_, x) => x !== i));
    if (editingDeliverableIndex === i) cancelDeliverableEntry();
  };

  // Totals — client-side mirror of the server's authoritative computeTotals(), for live
  // display only. The server recomputes independently on save (never trusts these values).
  const linesTotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
  const deliverablesTotal = deliverables.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const subTotal = linesTotal + deliverablesTotal;
  const purTotal = items.reduce((s, it) => s + (Number(it.pur_rate || 0) * Number(it.qnty || 0)), 0);
  const discount = Number(form.discount || 0);
  const taxable = subTotal - discount;
  const grandTotal = Math.round(taxable);

  const buildBody = () => ({
    ...form, items, deliverables, client_id: clientId, updated_at: updatedAt,
    discount: Number(discount) || 0,
  });

  const save = useCallback(async () => {
    if (!form.client_name.trim()) { setErr('Client name required'); return; }
    if (items.length === 0) { setErr('Add at least one item'); return; }
    if (!confirm('Save this quotation?')) return; // matches legacy's SaveMessage() confirm step
    setSaving(true); setErr('');
    try {
      if (isEdit) await api.put(`/quotations/${id}`, buildBody());
      else await api.post('/quotations', buildBody());
      nav('/quotations');
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
    if (!isEdit) return nav('/quotations');
    if (!confirm('Delete this quotation?')) return;
    try {
      await api.delete(`/quotations/${id}`);
      nav('/quotations');
    } catch (ex) { setErr(ex.response?.data?.error || 'Delete failed'); }
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Date in the legacy DD/MM/YYYY form (en-IN's toLocaleDateString omits the leading zero).
  const fmt2 = d => {
    if (!d) return '-';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '-';
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  // Print — withRate toggles Rate/Total columns, matching CmdPrint ("Print(Rate)") vs
  // Button2 ("Print(W/O Rate)"). Recreates the legacy Crystal Reports letterhead (studio
  // banner, customer/quotation boxes, items grouped by Function Date, Post Production box,
  // Terms & Condition, signature line) as an HTML page — no Crystal Reports engine on the web.
  const doPrint = (withRate) => {
    const groups = [];
    const groupByDate = new Map();
    items.forEach(it => {
      const key = it.function_date || '';
      if (!groupByDate.has(key)) {
        const g = { function_date: key, event_name: it.event_name, rows: [] };
        groupByDate.set(key, g);
        groups.push(g);
      }
      groupByDate.get(key).rows.push(it);
    });
    const rateHead = withRate ? '<th style="text-align:right">Rate</th><th style="text-align:right">Total</th>' : '';
    const itemRows = groups.map(g => `
      <tr class="date-row">
        <td>${fmt2(g.function_date)}</td><td>${g.event_name || ''}</td><td></td>
        ${withRate ? '<td></td><td></td>' : ''}
      </tr>
      ${g.rows.map(it => `
      <tr>
        <td class="item-cell">${it.item_name}</td><td></td>
        <td style="text-align:center">${it.qnty}</td>
        ${withRate ? `<td style="text-align:right">${cur(it.rate)}</td><td style="text-align:right">${cur(it.total)}</td>` : ''}
      </tr>`).join('')}`).join('');

    const deliverableRows = deliverables.map(d => `
      <tr>
        <td>${d.item_name}</td><td style="text-align:center">${d.qnty}</td>
        ${withRate ? `<td style="text-align:right">${cur(d.amount)}</td>` : ''}
      </tr>`).join('');

    const termsHtml = TERMS.map(t => `<li>${t}</li>`).join('');

    const w = window.open('', '_blank', 'width=850,height=1000');
    w.document.write(`<!doctype html><html><head><title>Quotation ${form.quo_no}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Arial,sans-serif;color:#111;padding:0;margin:0;font-size:12.5px;background:#f3f4f6}
        .sheet{max-width:800px;margin:16px auto;border:2px solid #16324f;border-radius:6px;overflow:hidden;background:#fff}
        .banner{position:relative;background:linear-gradient(120deg,#16324f 0%,#16324f 52%,#f2a541 52%,#f2a541 100%);color:#fff;padding:14px 20px 26px;text-align:center}
        .banner-logo{position:absolute;left:16px;top:10px;max-height:50px;max-width:90px;object-fit:contain}
        .banner .studio-name{font-size:24px;font-weight:800;letter-spacing:.5px;margin:2px 0}
        .banner .studio-sub{font-size:11.5px;margin:2px 0}
        .banner-wave{position:absolute;left:0;right:0;bottom:-1px;height:22px;background:#fff;border-radius:50% 50% 0 0/100% 100% 0 0}
        .insta-row{display:flex;justify-content:space-between;align-items:center;padding:6px 16px;font-size:12px;font-weight:700;border-bottom:2px solid #16324f}
        .cust-row{display:flex;border-bottom:2px solid #16324f}
        .cust-col{flex:1;padding:8px 16px;font-size:12px;line-height:1.7}
        .quo-col{width:220px;border-left:2px solid #16324f;padding:8px 16px;text-align:center}
        .quo-col h2{margin:0 0 6px;font-size:16px}
        .quo-col div{font-size:12px;margin:2px 0}
        table.items{width:100%;border-collapse:collapse}
        table.items th{background:#eef3f8;border:1px solid #16324f;padding:6px 10px;font-size:12px;text-align:left}
        table.items td{border:1px solid #b9c6d1;padding:5px 10px;font-size:12px}
        tr.date-row td{background:#f2a541;font-weight:700;border:1px solid #16324f}
        td.item-cell{padding-left:18px}
        .pprod{padding:10px 16px 4px}
        .pprod h3{margin:0 0 4px;font-size:12.5px;color:#c0392b;text-decoration:underline}
        .pprod-box{border:1px solid #f2a541;border-radius:4px;min-height:40px;padding:6px 10px}
        .pprod-box table{width:100%;border-collapse:collapse}
        .pprod-box td{border:none;padding:2px 4px;font-size:12px}
        .bottom{display:flex;border-top:2px solid #16324f}
        .remark-col{flex:1;padding:8px 16px;font-size:12px}
        .tot-col{width:220px;border-left:2px solid #16324f}
        .tot-col table{width:100%;border-collapse:collapse}
        .tot-col td{padding:6px 10px;font-size:12.5px;border-bottom:1px solid #d8dfe6}
        .tot-col td:last-child{text-align:right;font-weight:700}
        .tot-col tr.grand td{color:#c0392b;font-size:14px;border-bottom:none}
        .terms{padding:10px 16px;border-top:2px solid #16324f;font-size:10.5px;position:relative}
        .terms .tc-title{font-weight:700;font-size:11.5px;margin-bottom:4px}
        .terms ol{margin:0;padding-left:16px}
        .terms li{margin-bottom:2px}
        .terms .signee{position:absolute;right:16px;top:10px;font-weight:700;font-size:11px}
        .sign-row{display:flex;justify-content:space-between;align-items:flex-end;padding:18px 16px 14px}
        .sign-row .received{font-size:12px}
        .sign-row .auth{font-weight:700;font-size:12px;background:#f2a541;padding:6px 14px;border-radius:4px}
        @media print{ body{background:#fff} .sheet{margin:0 auto;border:none} }
      </style></head><body>
      <div class="sheet">
        <div class="banner">
          ${studio.showLogo ? `<img class="banner-logo" src="${studio.logo}" />` : ''}
          <div class="studio-name">${studio.name}</div>
          <div class="studio-sub">${studio.address}</div>
          <div class="studio-sub">MO:- ${studio.phone}</div>
          <div class="banner-wave"></div>
        </div>
        <div class="insta-row"><span>${studio.instagram}</span><span>Quotation</span></div>
        <div class="cust-row">
          <div class="cust-col">
            <div><b>Name :-</b> ${form.client_name || ''}</div>
            <div><b>Couple :-</b> ${form.couple_name || ''}</div>
            <div><b>Mob No :-</b> ${form.contact_no || ''} &nbsp;&nbsp; <b>Ref.:-</b> ${form.ref_by || ''}</div>
            <div><b>Add :-</b> ${form.address || ''}</div>
          </div>
          <div class="quo-col">
            <div><b>Quot. No :-</b> ${form.quo_no}</div>
            <div><b>Book Date :-</b> ${fmt2(form.quo_date)}</div>
          </div>
        </div>
        <table class="items">
          <thead><tr>
            <th>Item Discription</th><th>Event Name</th><th style="text-align:center">Qnty</th>
            ${rateHead}
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="pprod">
          <h3>Post Production</h3>
          <div class="pprod-box">
            ${deliverables.length ? `<table><tbody>${deliverableRows}</tbody></table>` : ''}
          </div>
        </div>
        <div class="bottom">
          <div class="remark-col"><b>Remark :</b> ${form.note || '-'}</div>
          <div class="tot-col">
            <table><tbody>
              <tr><td>Sub Total :</td><td>${cur(subTotal)}</td></tr>
              <tr><td>Discount :</td><td>${cur(discount)}</td></tr>
              <tr class="grand"><td>Grand Total :</td><td>${cur(grandTotal)}</td></tr>
            </tbody></table>
          </div>
        </div>
        <div class="terms">
          <div class="tc-title">Term &amp; Condition :</div>
          <span class="signee">${studio.name}</span>
          <ol>${termsHtml}</ol>
        </div>
        <div class="sign-row">
          <div class="received">Received By : ________________</div>
          <div class="auth">Authorized Signatory</div>
        </div>
      </div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const digits = (form.contact_no || '').replace(/\D/g, '');
  const itemLines = items.map((it,i) => `${i+1}) ${it.item_name} (Qty=${it.qnty}, Rate=${it.rate})`).join('\n');
  const shareText = encodeURIComponent(
    `Quotation ${form.quo_no}\nClient: ${form.client_name}\n${itemLines}\nSub Total: ${cur(subTotal)}\nDiscount: ${cur(discount)}\nGrand Total: ${cur(grandTotal)}`);
  const openWhatsApp = () => window.open(`https://wa.me/${digits ? '91'+digits : ''}?text=${shareText}`, '_blank');


  const showCamera = showCameraCol || items.some(it => it.camera_model);
  const showPur = form.display_purchase_rate;
  const onEntryKey = add => e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };

  return (
    <div className="qf">
      <div className="qf-top">
        <button type="button" className="qf-back" onClick={() => nav('/quotations')} title="Back to list"><ArrowLeft size={18} /></button>
        <h1>{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
        <span className="qf-no">#{form.quo_no}</span>
        <span className="qf-top-hint">Ctrl+S to save</span>
      </div>

      {err && <div className="alert alert-error qf-alert">{err}</div>}
      {clientInfo?.over_limit && (
        <div className="alert alert-error qf-alert">
          Customer's previous pending amount ({cur(previousPending)}) is more than their credit limit ({cur(clientInfo.credit_limit)})
        </div>
      )}

      <div className="qf-grid">
        <div className="qf-main">
          {/* 1 — who the quotation is for */}
          <section className="qf-card">
            <h2 className="qf-sec"><span className="qf-step">1</span> Client</h2>
            <div className="qf-fields">
              <label className="qf-field qf-span2">
                <span>Client Name *</span>
                <input list="qf-client-list" value={form.client_name} onChange={set('client_name')} onBlur={onClientBlur}
                  placeholder="Type or pick a client" autoFocus={!isEdit} />
                <datalist id="qf-client-list">{clientList.map(c => <option key={c.id} value={c.account_name} />)}</datalist>
              </label>
              <label className="qf-field">
                <span>Mobile No</span>
                <input value={form.contact_no} onChange={set('contact_no')} inputMode="tel" />
              </label>
              <label className="qf-field">
                <span>Date</span>
                <input type="date" value={form.quo_date} onChange={set('quo_date')} />
              </label>
              <label className="qf-field qf-span2">
                <span>Couple Name</span>
                <input value={form.couple_name} onChange={set('couple_name')} />
              </label>
              {showMore && <>
                <label className="qf-field qf-span2">
                  <span>Address</span>
                  <input value={form.address} onChange={set('address')} />
                </label>
                <label className="qf-field">
                  <span>Email</span>
                  <input type="email" value={form.email} onChange={set('email')} />
                </label>
                <label className="qf-field">
                  <span>Ref. By</span>
                  <input value={form.ref_by} onChange={set('ref_by')} />
                </label>
              </>}
            </div>
            <div className="qf-sec-foot">
              <button type="button" className="qf-link" onClick={() => setShowMore(v => !v)}>
                {showMore ? <><ChevronUp size={14} /> Fewer details</> : <><ChevronDown size={14} /> Address, Email, Ref. By</>}
              </button>
              {clientHistory.length > 0 && (
                <div className="qf-history">
                  <span>Earlier quotations:</span>
                  {clientHistory.map(r => (
                    <button type="button" key={r.id} onClick={() => nav(`/quotations/${r.id}`)} title={fmt(r.quo_date)}>#{r.quo_no}</button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 2 — shoot items; the last row of the table is where a new item is typed */}
          <section className="qf-card">
            <h2 className="qf-sec">
              <span className="qf-step">2</span> Items
              <span className="qf-sec-tools">
                <label><input type="checkbox" checked={showCamera} disabled={items.some(it => it.camera_model)}
                  onChange={e => setShowCameraCol(e.target.checked)} /> Camera</label>
                <label><input type="checkbox" checked={showPur}
                  onChange={e => setForm(f => ({ ...f, display_purchase_rate: e.target.checked }))} /> Purchase rate</label>
              </span>
            </h2>
            <div className="qf-table-wrap">
              <table className="qf-table">
                <thead><tr>
                  <th style={{ width: 140 }}>Date</th>
                  <th>Item</th>
                  <th style={{ width: 150 }}>Event</th>
                  <th className="r" style={{ width: 70 }}>Qty</th>
                  <th className="r" style={{ width: 100 }}>Rate</th>
                  {showCamera && <th style={{ width: 120 }}>Camera</th>}
                  {showPur && <th className="r" style={{ width: 96 }}>Pur. Rate</th>}
                  <th className="r" style={{ width: 100 }}>Amount</th>
                  <th style={{ width: 96 }}></th>
                </tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className={editingIndex === i ? 'editing' : undefined}>
                      <td>{fmt(it.function_date)}</td>
                      <td className="b">{it.item_name}</td>
                      <td>{it.event_name || '-'}</td>
                      <td className="r">{it.qnty}</td>
                      <td className="r">{cur(it.rate)}</td>
                      {showCamera && <td>{it.camera_model || '-'}</td>}
                      {showPur && <td className="r pur">{cur(it.pur_rate)}</td>}
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
                      <input ref={itemNameRef} list="item-master-list" value={entry.item_name}
                        onChange={e => onPickItem(e.target.value)} placeholder="Item…" />
                      <datalist id="item-master-list">{itemList.map(it => <option key={it.id} value={it.item_name} />)}</datalist>
                    </td>
                    <td>
                      <input list="event-list" value={entry.event_name} onChange={e => setE('event_name', e.target.value)} placeholder="Event…" />
                      <datalist id="event-list">{(eventList.length ? eventList : EVENTS).map(ev => <option key={ev} value={ev} />)}</datalist>
                    </td>
                    <td><input className="r" type="number" min={0} value={entry.qnty} onChange={e => setE('qnty', e.target.value)} /></td>
                    <td><input className="r" type="number" min={0} step="0.01" value={entry.rate} onChange={e => setE('rate', e.target.value)} /></td>
                    {showCamera && <td><input value={entry.camera_model} onChange={e => setE('camera_model', e.target.value)} /></td>}
                    {showPur && <td><input className="r" type="number" min={0} value={entry.pur_rate} onChange={e => setE('pur_rate', e.target.value)} /></td>}
                    <td className="r b">{cur(entry.total)}</td>
                    <td className="acts">
                      <button type="button" className="add" onClick={addOrUpdateEntry} title="Add (Enter)">
                        {editingIndex === null ? <><Plus size={14} /> Add</> : <><Check size={14} /> Update</>}
                      </button>
                      {editingIndex !== null && <button type="button" onClick={cancelEntry} title="Cancel edit"><X size={14} /></button>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {items.length === 0 && <p className="qf-hint">Fill the row above and press <kbd>Enter</kbd> to add an item.</p>}
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
                      <input ref={deliverableItemNameRef} list="deliverable-item-list" value={deliverableEntry.item_name}
                        onChange={e => onPickDeliverableItem(e.target.value)} placeholder="Album, video…" />
                      <datalist id="deliverable-item-list">{deliverableList.map(d => <option key={d.id} value={d.item_name} />)}</datalist>
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

          <section className="qf-card">
            <label className="qf-field">
              <span>Note / Remark (prints on the quotation)</span>
              <textarea rows={2} value={form.note} onChange={set('note')} />
            </label>
          </section>
        </div>

        {/* Totals and every action in one sticky panel, so the next step is always in view */}
        <aside className="qf-side">
          <div className="qf-card qf-sum">
            <h2 className="qf-sec">Summary</h2>
            <div className="qf-sum-row"><span>Items ({items.length})</span><span>{cur(linesTotal)}</span></div>
            <div className="qf-sum-row"><span>Post production ({deliverables.length})</span><span>{cur(deliverablesTotal)}</span></div>
            <div className="qf-sum-row strong"><span>Sub Total</span><span>{cur(subTotal)}</span></div>
            <label className="qf-sum-row"><span>Discount (₹)</span>
              <input type="number" min={0} value={form.discount} onChange={set('discount')} /></label>
            <label className="qf-sum-row"><span>Extra Charge (₹)</span>
              <input type="number" min={0} value={form.extra_charge} onChange={set('extra_charge')} /></label>
            {showPur && <div className="qf-sum-row pur"><span>Purchase Total</span><span>{cur(purTotal)}</span></div>}
            <div className="qf-grand"><span>Grand Total</span><strong>{cur(grandTotal)}</strong></div>

            <button type="button" className="btn btn-primary qf-save" onClick={save} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save Quotation'}
            </button>
            <div className="qf-actions">
              <details className="qf-menu">
                <summary className="btn btn-outline"><Printer size={15} /> Print <ChevronDown size={14} /></summary>
                <div className="qf-menu-list" onClick={e => e.currentTarget.parentElement.removeAttribute('open')}>
                  <button type="button" onClick={() => doPrint(true)}><Printer size={14} /> With rates</button>
                  <button type="button" onClick={() => doPrint(false)}><Printer size={14} /> Without rates</button>
                  <button type="button" onClick={() => doPrint(false)}><FileDown size={14} /> Save as PDF</button>
                </div>
              </details>
              <button type="button" className="btn btn-outline" onClick={openWhatsApp}><Send size={15} /> WhatsApp</button>
            </div>
            <div className="qf-actions-sub">
              <button type="button" onClick={() => (isEdit ? nav('/quotations/new') : resetNew())}><X size={14} /> {isEdit ? 'New quotation' : 'Clear form'}</button>
              {isEdit && <button type="button" className="del" onClick={remove}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
