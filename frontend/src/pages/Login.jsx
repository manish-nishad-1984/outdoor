import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ width: 52, height: 52, background: '#2563eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <Camera size={28} color="#fff" strokeWidth={1.75} />
          </div>
          <h1>OutdoorStudio</h1>
          <p>Photography Management System</p>
        </div>

        {error && (
          <div className="inline-error" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Username</label>
            <input type="text" placeholder="Enter username" required
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Password</label>
            <input type="password" placeholder="Enter password" required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '9px' }} disabled={loading}>
            <LogIn size={14} strokeWidth={2} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#9ca3af' }}>
          Pratishtha Bridal Studio · © 2026
        </div>
      </div>
    </div>
  );
}
