import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, QrCode } from 'lucide-react';
import api from '../../api/axios';

// Web port of legacy FrmWhatsAppSetting.vb.
// The legacy form's live wa.apikaro.in QR-pairing/device-connection panel is deliberately
// not wired up here — see legacy/docs/01-OVERVIEW.md §6 / 03-MIGRATION-MAP.md, which already
// recommend against replicating that gateway. This page ports the settings fields only.
// Also: the legacy "View Key" control that un-masks Master Key/API Key lives on a MenuStrip
// set Visible=False in the designer, so those fields can never actually be edited through the
// real legacy UI — this port uses a visible per-field show/hide toggle instead.
const MESSAGE_MODES = [
  ['text', 'Send Text Message'],
  ['file', 'Send File'],
  ['text_file', 'Send Text And File'],
];

const EMPTY = {
  master_key: '', api_key: '', send_on_save: false, message_mode: 'text',
  portal_username: '', portal_password: '',
};

function MaskedField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} style={{ flex: 1 }} autoComplete="off" />
        <button type="button" className="btn btn-outline btn-icon" onClick={() => setVisible(v => !v)} title={visible ? 'Hide' : 'Show'}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function WhatsAppSetting() {
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    api.get('/whatsapp-settings').then(r => {
      setForm(f => ({ ...f, ...r.data }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set   = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCk = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

  const save = async e => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const r = await api.put('/whatsapp-settings', form);
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
          <h1 className="page-title">WhatsApp Setting</h1>
          <p className="page-subtitle">WhatsApp gateway credentials &amp; notification behavior</p>
        </div>
      </div>

      <form onSubmit={save}>
        {msg && (
          <div className={`alert ${msg.startsWith('error:') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
            {msg.replace(/^(error|success):/, '')}
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">API Credentials</div></div>
          <div className="card-body form-grid">
            <MaskedField label="Master Key" value={form.master_key} onChange={set('master_key')} />
            <MaskedField label="API Key" value={form.api_key} onChange={set('api_key')} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Message Behavior</div></div>
          <div className="card-body">
            <label className="checkbox-row" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={form.send_on_save} onChange={setCk('send_on_save')} />
              Save Chalan and Send WhatsApp SMS
            </label>
            <div className="checkbox-grid">
              {MESSAGE_MODES.map(([value, label]) => (
                <label className="checkbox-row" key={value}>
                  <input
                    type="radio"
                    name="message_mode"
                    checked={form.message_mode === value}
                    onChange={() => setForm(f => ({ ...f, message_mode: value }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Gateway Portal Login</div></div>
          <div className="card-body form-grid">
            <div className="form-group"><label>User Id</label>
              <input value={form.portal_username} onChange={set('portal_username')} autoComplete="off" /></div>
            <div className="form-group"><label>Password</label>
              <input value={form.portal_password} onChange={set('portal_password')} autoComplete="off" /></div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <a href="https://admin.apikaro.in/" target="_blank" rel="noreferrer">Open Website →</a>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Device Connection</div></div>
          <div className="card-body">
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <QrCode size={28} color="#9ca3af" style={{ marginBottom: 8 }} />
              <p>QR-code device pairing isn't connected to a live gateway yet.</p>
              <p style={{ fontSize: 11.5, marginTop: 2 }}>Once a WhatsApp provider is chosen, this section will show a scannable QR code here.</p>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
