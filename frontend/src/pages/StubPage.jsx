export default function StubPage({ title }) {
  return (
    <div className="card">
      <div className="card-body" style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{title}</div>
        <div style={{ marginTop: 8, color: '#64748b' }}>This page is under development.</div>
      </div>
    </div>
  );
}
