import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import { api, setDemoToken } from './lib/api.js';
import './styles.css';

export default function App() {
  const [user, setUser] = useState({ username: 'state.admin', role: 'ADMIN' });
  const [filters, setFilters] = useState({});
  const [workers, setWorkers] = useState();
  const [stats, setStats] = useState();
  const [login, setLogin] = useState({ username: 'admin', password: '' });
  const submitLogin = async (e) => { e.preventDefault(); const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(login), headers: {} }); setDemoToken(data.token); setUser(data.user); };
  useEffect(() => { api(`/workers?${new URLSearchParams(filters)}`).then((r)=>setWorkers(r.data)).catch(()=>{}); api('/dashboard/stats').then(setStats).catch(()=>{}); }, [filters]);
  return <><div className="login-card"><form onSubmit={submitLogin}><strong>API Login</strong><input value={login.username} onChange={(e)=>setLogin({...login, username:e.target.value})}/><input type="password" placeholder="Password" onChange={(e)=>setLogin({...login, password:e.target.value})}/><button>Sign in</button><small>Demo data is shown until the Express API is connected.</small></form></div><Dashboard user={user} filters={filters} setFilters={setFilters} workers={workers} stats={stats}/></>;
}
