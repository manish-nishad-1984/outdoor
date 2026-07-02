import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, X } from 'lucide-react';
import api from '../../api/axios';

const PAYMENT_MODES = ['Cash','UPI','Cheque','Card','Online'];
const WEDDING_ITEMS = [
  'Photography','Videography','Drone','Traditional Photography','Pre-Wedding',
  'Candid Photography','Album','Video Editing','Invitation Video','Reels',
  'LED Screen','Sound System','Generator'
];
const EMPTY_ROW = { description:'', qty:1, rate:0, amount:0 };

export default function SaleForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    customer_name: '',
    inquiry_date: today,
    payment_mode: 'Cash',
    gross_total: 0,
    discount_rs: 0,
    advance: 0,
    total_pending: 0,
    status: 'Pending',
    items: [{ ...EMPTY_ROW }],
    wedding_items: [],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => {
    if (!isNew) {
      api.get(`/sales/${id}`).then(r => {
        const d = r.data;
        setForm(f => ({ ...f, ...d, items: d.items||[{ ...EMPTY_ROW }], wedding_items: d.wedding_items||[] }));
      }).catch(console.error);
    }
  }, [id, isNew]);

  const setF = k => e => {
    setForm(f => {
      const updated = { ...f, [k]: e.target.value };
      // Recalc pending
      const gross = parseFloat(updated.gross_total)||0;
      const disc  = parseFloat(updated.discount_rs)||0;
      const adv   = parseFloat(updated.advance)||0;
      updated.total_pending = gross - disc - adv;
      return updated;
    });
  };

  const addRow = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ROW }] }));
  const removeRow = idx => setForm(f => ({ ...f, items: f.items.filter((_,i)=>i!==idx) }));
  const setRow = (idx, key, val) => {
    setForm(f => {
      const items = f.items.map((it,i) => {
        if (i!==idx) return it;
        const u = { ...it, [key]: val };
        if (key==='qty'||key==='rate') u.amount = parseFloat(u.qty||0)*parseFloat(u.rate||0);
        return u;
      });
      const gross = items.reduce((s,it)=>s+parseFloat(it.amount||0),0);
      const disc  = parseFloat(f.discount_rs)||0;
      const adv   = parseFloat(f.advance)||0;
      return { ...f, items, gross_total: gross, total_pending: gross - disc - adv };
    });
  };

  const toggleWedding = item => {
    setForm(f => ({
      ...f,
      wedding_items: f.wedding_items.includes(item)
        ? f.wedding_items.filter(x=>x!==item)
        : [...f.wedding_items, item]
    }));
  };

  const save = async e => {
    e.preventDefault();
    if (!form.customer_name) return setErr('Customer name is required');
    setSaving(true); setErr('');
    try {
      if (isNew) await api.post('/sales', form);
      else await api.put(`/sales/${id}`, form);
      nav('/sales');
    } catch(ex){ setErr(ex.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const cur = n => `₹${parseFloat(n||0).toLocaleString('en-IN')}`;
  const gross = form.items.reduce((s,it)=>s+parseFloat(it.amount||0),0);
  const disc  = parseFloat(form.discount_rs)||0;
  const adv   = parseFloat(form.advance)||0;
  const pending = gross - disc - adv;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost" onClick={() => nav('/sales')}>
            <ArrowLeft size={16}/>
          </button>
          <div>
            <h1 className="page-title">{isNew ? 'New Sale Invoice' : `Edit Sale #${id}`}</h1>
            <p className="page-subtitle">Create sale invoice for a customer</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={15}/> {saving ? 'Saving…' : 'Save Invoice'}
        </button>
      </div>

      {err && <div className="alert alert-error" style={{marginBottom:16}}>{err}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:16,alignItems:'start'}}>

        <div>
          {/* Customer Info */}
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header"><div className="card-title">Customer Details</div></div>
            <div className="card-body form-grid">
              <div className="form-group">
                <label>Customer Name *</label>
                <input value={form.customer_name} onChange={setF('customer_name')} placeholder="Customer name" required/>
              </div>
              <div className="form-group">
                <label>Invoice Date</label>
                <input type="date" value={form.inquiry_date} onChange={setF('inquiry_date')}/>
              </div>
              <div className="form-group">
                <label>Payment Mode</label>
                <select value={form.payment_mode} onChange={setF('payment_mode')}>
                  {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={setF('status')}>
                  {['Pending','Confirmed','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header">
              <div className="card-title">Line Items</div>
              <button type="button" className="btn btn-ghost" style={{fontSize:12}} onClick={addRow}>
                <Plus size={13}/> Add Row
              </button>
            </div>
            <div className="card-body" style={{padding:0}}>
              <div className="table-wrap">
                <table className="data-table" style={{fontSize:13}}>
                  <thead><tr>
                    <th style={{width:'40%'}}>DESCRIPTION</th>
                    <th style={{width:'10%',textAlign:'center'}}>QTY</th>
                    <th style={{width:'15%',textAlign:'right'}}>RATE (₹)</th>
                    <th style={{width:'20%',textAlign:'right'}}>AMOUNT (₹)</th>
                    <th style={{width:'5%'}}></th>
                  </tr></thead>
                  <tbody>
                    {form.items.map((it,idx) => (
                      <tr key={idx}>
                        <td>
                          <input value={it.description} onChange={e=>setRow(idx,'description',e.target.value)}
                            placeholder="Service / item description"
                            style={{width:'100%',border:'none',background:'transparent',fontSize:13}}/>
                        </td>
                        <td style={{textAlign:'center'}}>
                          <input type="number" value={it.qty} onChange={e=>setRow(idx,'qty',e.target.value)}
                            style={{width:50,border:'none',background:'transparent',textAlign:'center'}}/>
                        </td>
                        <td style={{textAlign:'right'}}>
                          <input type="number" value={it.rate} onChange={e=>setRow(idx,'rate',e.target.value)}
                            style={{width:80,border:'none',background:'transparent',textAlign:'right'}}/>
                        </td>
                        <td style={{textAlign:'right',fontWeight:600}}>
                          ₹{parseFloat(it.amount||0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          {form.items.length > 1 && (
                            <button type="button" className="btn-danger-soft" onClick={()=>removeRow(idx)} style={{padding:'2px 6px'}}>
                              <X size={12}/>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#f9fafb',fontWeight:700}}>
                      <td colSpan={3} style={{textAlign:'right'}}>Subtotal</td>
                      <td style={{textAlign:'right'}}>₹{gross.toLocaleString('en-IN')}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Wedding Checklist */}
          <div className="card">
            <div className="card-header"><div className="card-title">Wedding Services Checklist</div></div>
            <div className="card-body">
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {WEDDING_ITEMS.map(item => (
                  <label key={item} style={{
                    display:'flex',alignItems:'center',gap:6,cursor:'pointer',
                    padding:'5px 10px',borderRadius:6,fontSize:12,fontWeight:500,
                    border:`1px solid ${form.wedding_items.includes(item)?'#2563eb':'#e5e7eb'}`,
                    background: form.wedding_items.includes(item)?'#eff6ff':'#f9fafb',
                    color: form.wedding_items.includes(item)?'#1d4ed8':'#374151'
                  }}>
                    <input type="checkbox" checked={form.wedding_items.includes(item)}
                      onChange={()=>toggleWedding(item)} style={{accentColor:'#2563eb'}}/>
                    {item}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Amount Summary Panel */}
        <div>
          <div className="card" style={{position:'sticky',top:16}}>
            <div className="card-header"><div className="card-title">Amount Summary</div></div>
            <div className="card-body">
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,color:'#6b7280'}}>Gross Total</span>
                  <span style={{fontWeight:600,fontSize:14}}>{cur(gross)}</span>
                </div>
                <div>
                  <label style={{fontSize:12,color:'#6b7280',fontWeight:600}}>Discount (₹)</label>
                  <input type="number" value={form.discount_rs} onChange={setF('discount_rs')}
                    style={{width:'100%',marginTop:4}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  borderTop:'1px solid #e5e7eb',paddingTop:10}}>
                  <span style={{fontSize:13,color:'#6b7280'}}>Net Total</span>
                  <span style={{fontWeight:700,fontSize:15}}>{cur(gross-disc)}</span>
                </div>
                <div>
                  <label style={{fontSize:12,color:'#6b7280',fontWeight:600}}>Advance Received (₹)</label>
                  <input type="number" value={form.advance} onChange={setF('advance')}
                    style={{width:'100%',marginTop:4}}/>
                </div>
                <div style={{
                  background: pending > 0 ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${pending>0?'#fecaca':'#bbf7d0'}`,
                  borderRadius:8, padding:'12px 14px', textAlign:'center'
                }}>
                  <div style={{fontSize:11,color: pending>0?'#dc2626':'#16a34a',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>
                    {pending > 0 ? 'Pending Amount' : 'Fully Paid'}
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color: pending>0?'#dc2626':'#16a34a'}}>
                    {cur(pending > 0 ? pending : 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
