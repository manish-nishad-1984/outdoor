import { useState } from 'react';

const TABS = ['Studio', 'Users', 'Security', 'Notifications'];

export default function Settings() {
  const [tab, setTab] = useState('Studio');

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Studio' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Studio Information</div></div>
          <div className="card-body form-grid">
            {[['Studio Name','text','Outdoor Photography Studio'],['Owner Name','text',''],['Phone','tel',''],['Email','email',''],['Address','text',''],['GST Number','text',''],['PAN Number','text','']].map(([lbl,type,ph]) => (
              <div key={lbl} className="form-group">
                <label>{lbl}</label>
                <input type={type} placeholder={ph} />
              </div>
            ))}
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'Users' && (
        <div className="card">
          <div className="card-header"><div className="card-title">User Management</div><button className="btn btn-primary">＋ Add User</button></div>
          <div className="card-body" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>User management coming soon.</div>
        </div>
      )}

      {tab === 'Security' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Change Password</div></div>
          <div className="card-body form-grid" style={{ maxWidth: 400 }}>
            {['Current Password','New Password','Confirm New Password'].map(lbl => (
              <div key={lbl} className="form-group"><label>{lbl}</label><input type="password" /></div>
            ))}
            <div className="form-group"><button className="btn btn-primary">Update Password</button></div>
          </div>
        </div>
      )}

      {tab === 'Notifications' && (
        <div className="card">
          <div className="card-body" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Notification preferences coming soon.</div>
        </div>
      )}
    </div>
  );
}
