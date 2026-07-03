import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, FileText, Plus, Pencil } from 'lucide-react';
import api from '../../api/axios';

export default function Quotations() {
  const nav = useNavigate();
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/quotations', { params: { search, page, limit: 25 } });
      setRows(r.data.data || []); setTotal(r.data.total || 0);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const del = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete quotation?')) return;
    await api.delete(`/quotations/${id}`); load();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const cur = n => n != null ? `₹${parseFloat(n).toLocaleString('en-IN')}` : '-';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">{total} total quotations</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="table-toolbar">
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input placeholder="Search by quo no, client, couple, contact..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => nav('/quotations/new')}><Plus size={16}/> New Quotation</button>
          </div>
          {loading ? <div className="table-loading">Loading…</div> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  <th>QUO NO</th><th>CLIENT</th><th>COUPLE</th><th>CONTACT</th><th>DATE</th>
                  <th style={{textAlign:'right'}}>DISCOUNT</th><th style={{textAlign:'right'}}>GRAND TOTAL</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={8} className="table-empty"><FileText size={32}/><p>No quotations found</p></td></tr>}
                  {rows.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/quotations/${r.id}`)}>
                      <td><span className="badge badge-blue">{r.quo_no}</span></td>
                      <td><strong>{r.client_name || '-'}</strong></td>
                      <td>{r.couple_name || '-'}</td>
                      <td>{r.contact_no || '-'}</td>
                      <td>{fmt(r.quo_date)}</td>
                      <td style={{textAlign:'right'}}>{cur(r.discount)}</td>
                      <td style={{textAlign:'right', fontWeight:600}}>{cur(r.grand_total)}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); nav(`/quotations/${r.id}`); }}><Pencil size={14}/></button>
                          <button className="btn-danger-soft" onClick={(e) => del(e, r.id)}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 25 && (
            <div className="pagination">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}>Prev</button>
              <span>Page {page} of {Math.ceil(total/25)}</span>
              <button disabled={page>=Math.ceil(total/25)} onClick={() => setPage(p=>p+1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
