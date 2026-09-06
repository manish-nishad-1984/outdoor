import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, AlertCircle, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, Users, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Camera, title: 'Order & billing in one place', body: 'Track outdoor shoots, studio orders and quotations end to end.' },
  { icon: ShieldCheck, title: 'Role-based access', body: "Give staff exactly the permissions their role needs." },
  { icon: Zap, title: 'Built for daily studio ops', body: 'Payments, receipts and reports without the paperwork.' },
];

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="grid min-h-screen lg:grid-cols-2 bg-background text-foreground">
      {/* RIGHT (on lg+) — the form, centered, no card/border around it */}
      <div className="order-2 flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Camera size={18} strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">OutdoorStudio</span>
              <span className="block text-2xs text-muted-foreground">Photography Management System</span>
            </span>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground">Use the username and password your administrator gave you.</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text" placeholder="Enter username" required autoFocus
                  autoComplete="username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder="Enter password" required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 36 }}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                    className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight size={15} />}
              </button>
            </form>

            <p className="text-2xs leading-relaxed text-muted-foreground">
              Access is granted by your administrator. If you can't sign in, ask them to check
              your account status and role.
            </p>
          </div>
        </div>
      </div>

      {/* LEFT (on lg+) — solid brand-color panel, decorative only */}
      <aside className="relative order-1 hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-white/20 blur-3xl" />

        <div className="relative p-12">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">Studio Management</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-primary-foreground">
            Run every shoot, order and payment from one place.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80">
            OutdoorStudio keeps quotations, orders, production and accounts in sync, so nothing falls through the cracks.
          </p>
        </div>

        <ul className="relative space-y-4 p-12">
          {FEATURES.map(f => (
            <li className="flex items-start gap-3" key={f.title}>
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15 text-primary-foreground">
                <f.icon size={16} />
              </span>
              <span>
                <span className="block text-sm font-medium text-primary-foreground">{f.title}</span>
                <span className="block text-xs text-primary-foreground/75">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
