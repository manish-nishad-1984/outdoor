import { useEffect, useState } from 'react';
import api from '../../api/axios';

const COLORS = ['av-orange','av-blue','av-green','av-purple','av-red'];

export default function Employees() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employees').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon blue">👥</div><div><div className="stat-label">Total Staff</div><div className="stat-value">{data.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-label">Active</div><div className="stat-value">{data.filter(d=>d.is_active).length}</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">All Employees</div>
          <button className="btn btn-primary">＋ Add Employee</button>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {data.map((emp, i) => (
            <div key={emp.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span className={`badge ${emp.is_active ? 'badge-green' : 'badge-red'}`}>{emp.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className={`user-avatar ${COLORS[i % COLORS.length]}`} style={{ width: 56, height: 56, fontSize: 20, margin: '0 auto 12px' }}>
                {emp.full_name?.slice(0,2).toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{emp.full_name}</div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{emp.user_type}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }}>View</button>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }}>Attendance</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
