import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import api from '../../api/axios';

export default function Payroll() {
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/employees').then(r => { setRows(r.data || []); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cur = n => n != null ? `â‚¹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">{rows.length} employees</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          {loading ? <div className="table-loading">Loadingâ€¦</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>EMPLOYEE</th><th>ROLE</th><th>MOBILE</th><th>JOIN DATE</th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={4} className="table-empty"><Wallet size={32}/><p>No employee data found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.name||r.username||'-'}</strong></td>
                      <td><span className="badge badge-blue">{r.designation||r.role||'-'}</span></td>
                      <td>{r.mobile||r.mobile_no||'-'}</td>
                      <td>{r.join_date ? new Date(r.join_date).toLocaleDateString('en-IN') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
