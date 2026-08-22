import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './AuthForms.css';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setError(''); setLoading(true); try { await login(email, password); navigate('/chat', { replace: true }); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to login'); } finally { setLoading(false); } };
  return <form className="auth-form" onSubmit={submit}><h2>Welcome Back</h2><p>Login to continue to your secure chat.</p><label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="current-password" /></label>{error && <div className="error-alert">{error}</div>}<button type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button></form>;
};
export default LoginForm;
