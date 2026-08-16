import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, X } from 'lucide-react';
import api from '../../api/axios';

// Web port of legacy FrmPrintSettings.vb — letterhead/print-format fields only.
// The legacy form's SMS-gateway automation and OTP/password step-up gating (5 mobile
// numbers, daily-SMS toggles, OTP checks) are deliberately not ported — no SMS/OTP
// backend exists in this app. See legacy/docs/03-MIGRATION-MAP.md.
const SIZES = [
  'A4', 'A4 WITHOUT GST', 'A4/2', 'A4/2 WITHOUT GST',
  'A5(L)', 'A5(L) WITHOUT GST', 'A5', 'A5 WITHOUT GST',
  'A5/2', 'A5/2 WITHOUT GST', 'A5(L) WITH IMAGE NO',
];

const MODE_ROWS = [
  ['studio_bill_mode', 'Studio Bill'],
  ['print_detail_mode', 'Print Detail'],
  ['quotation_mode', 'Quotation'],
  ['order_mode', 'Order'],
  ['bill_mode', 'Bill'],
];

const IMAGE_FIELDS = [
  ['logo_image', 'Logo'],
  ['signature_image', 'Signature'],
  ['package_image_1', 'Package Master-2 Image 1'],
  ['package_image_2', 'Package Master-2 Image 2'],
];

const EMPTY = {
  company_name: '', address: '', mobile_no: '', gst_no: '', email: '', insta_id: '',
  bank_ac: '', ifsc_branch: '', bill_line_color: 'BLACK', default_printer: '',
  bill_print_size: 'A4', studio_bill_copies: 1, bill_copies: 1,
  rate_with_gst: false, display_mobile_in_print: false, display_logo: true, print_message: true,
  studio_bill_mode: 'view', print_detail_mode: 'view', quotation_mode: 'view', order_mode: 'view', bill_mode: 'view',
  logo_image: '', signature_image: '', package_image_1: '', package_image_2: '',
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PrintSettings() {
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    api.get('/print-settings').then(r => {
      setForm(f => ({ ...f, ...r.data }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set  = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCk = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));
  const setMode = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const pickImage = k => async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm(f => ({ ...f, [k]: dataUrl }));
    e.target.value = '';
  };
  const clearImage = k => () => setForm(f => ({ ...f, [k]: '' }));

  const save = async e => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const r = await api.put('/print-settings', form);
      setForm(f => ({ ...f, ...r.data }));
      setMsg('success:Settings saved');
    } catch (ex) { setMsg(`error:${ex.response?.data?.error || 'Save failed'}`); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  if (loading) return <div className="page-container"><div className="table-loading">Loading…</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Print Settings</h1>
          <p className="page-subtitle">Company letterhead, print format &amp; document print behavior</p>
        </div>
      </div>

      <form onSubmit={save}>
        {msg && (
          <div className={`alert ${msg.startsWith('error:') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
            {msg.replace(/^(error|success):/, '')}
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Company / Letterhead</div></div>
          <div className="card-body form-grid">
            <div className="form-group"><label>Company Name</label>
              <input value={form.company_name} onChange={set('company_name')} /></div>
            <div className="form-group"><label>Mobile No</label>
              <input value={form.mobile_no} onChange={set('mobile_no')} /></div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Address</label>
              <input value={form.address} onChange={set('address')} /></div>
            <div className="form-group"><label>GSTIN</label>
              <input value={form.gst_no} onChange={set('gst_no')} /></div>
            <div className="form-group"><label>E-mail ID</label>
              <input type="email" value={form.email} onChange={set('email')} /></div>
            <div className="form-group"><label>Insta ID</label>
              <input value={form.insta_id} onChange={set('insta_id')} /></div>
            <div className="form-group"><label>Bank &amp; A/c No</label>
              <input value={form.bank_ac} onChange={set('bank_ac')} /></div>
            <div className="form-group"><label>IFSC &amp; Branch</label>
              <input value={form.ifsc_branch} onChange={set('ifsc_branch')} /></div>
            <div className="form-group"><label>Bill Line Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color"
                  value={/^#/.test(form.bill_line_color) ? form.bill_line_color : '#000000'}
                  onChange={e => setForm(f => ({ ...f, bill_line_color: e.target.value }))}
                  style={{ width: 40, height: 34, padding: 2, border: '1px solid #d1d5db', borderRadius: 6 }} />
                <input value={form.bill_line_color} onChange={set('bill_line_color')} />
              </div>
            </div>
            <div className="form-group"><label>Default Printer</label>
              <input value={form.default_printer} onChange={set('default_printer')} placeholder="e.g. Office HP LaserJet" /></div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Print Format</div></div>
          <div className="card-body form-grid">
            <div className="form-group"><label>Bill Print Size</label>
              <select value={form.bill_print_size} onChange={set('bill_print_size')}>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Studio Bill Copies</label>
              <input type="number" min="1" value={form.studio_bill_copies} onChange={set('studio_bill_copies')} /></div>
            <div className="form-group"><label>Bill Copies</label>
              <input type="number" min="1" value={form.bill_copies} onChange={set('bill_copies')} /></div>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div className="checkbox-grid">
              <label className="checkbox-row"><input type="checkbox" checked={form.rate_with_gst} onChange={setCk('rate_with_gst')} /> Rate With GST</label>
              <label className="checkbox-row"><input type="checkbox" checked={form.display_mobile_in_print} onChange={setCk('display_mobile_in_print')} /> Display Mobile No In Print</label>
              <label className="checkbox-row"><input type="checkbox" checked={form.display_logo} onChange={setCk('display_logo')} /> Display Logo</label>
              <label className="checkbox-row"><input type="checkbox" checked={form.print_message} onChange={setCk('print_message')} /> Print Message</label>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Print Detail — Save Behavior</div></div>
          <div className="card-body form-grid">
            {MODE_ROWS.map(([key, label]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <select value={form[key]} onChange={setMode(key)}>
                  <option value="print">Save And Print</option>
                  <option value="view">Save And View</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Images</div></div>
          <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {IMAGE_FIELDS.map(([key, label]) => (
              <div key={key} style={{ width: 160 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: '#374151' }}>{label}</label>
                <div style={{
                  width: 160, height: 100, border: '1px dashed #d1d5db', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f9fafb'
                }}>
                  {form[key]
                    ? <img src={form[key]} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    : <ImageIcon size={24} color="#9ca3af" />}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <label className="btn btn-outline" style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}>
                    Browse
                    <input type="file" accept="image/*" onChange={pickImage(key)} style={{ display: 'none' }} />
                  </label>
                  {form[key] && (
                    <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={clearImage(key)}>
                      <X size={12} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
