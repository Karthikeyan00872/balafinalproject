import { AlertTriangle, Download, FileText, LogOut, RefreshCcw, Search, ShieldCheck, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { clearToken } from '../lib/api';

const demoWorkers = [
  { id: 1, registration_number: 'TNUWWB-CBE-0001', full_name: 'R Selvi', district: 'Coimbatore', taluk: 'Pollachi', age: 34, age_bracket: '18_35', board_name: 'Tailoring', last_renewal_date: '2024-03-10', next_due_date: '2029-03-10', computed_status: 'ACTIVE' },
  { id: 2, registration_number: 'TNUWWB-MDU-0042', full_name: 'K Murugan', district: 'Madurai', taluk: 'Melur', age: 56, age_bracket: '51_59', board_name: 'Construction', last_renewal_date: '2018-06-01', next_due_date: '2023-06-01', computed_status: 'OVERDUE' },
  { id: 3, registration_number: 'TNUWWB-CHE-1020', full_name: 'P Lakshmi', district: 'Chennai', taluk: 'Aminjikarai', age: 61, age_bracket: '60_PLUS', board_name: 'Domestic Workers', last_renewal_date: '2021-02-14', next_due_date: '2026-02-14', computed_status: 'PENSIONER' },
];

function badge(status) {
  return status === 'OVERDUE' ? 'badge danger' : status === 'PENSIONER' ? 'badge pension' : 'badge success';
}

export default function Dashboard({ user, filters, setFilters, workers = demoWorkers, stats }) {
  const summary = stats || { total_workers: workers.length, total_overdue: 1, pension_pending_count: 1, active_claims: 8, district_breakdown: [{ district: 'Madurai', overdue: 14 }, { district: 'Chennai', overdue: 9 }, { district: 'Coimbatore', overdue: 5 }] };
  const filtered = workers.filter((w) => (!filters.search || `${w.full_name} ${w.registration_number}`.toLowerCase().includes(filters.search.toLowerCase())) && (!filters.status || w.computed_status === filters.status) && (!filters.age_category || w.age_bracket === filters.age_category));
  const exportCsv = () => {
    const headers = ['Reg No','Name','District','Taluk','Age','Age Bracket','Board','Last Renewal','Next Due','Status'];
    const rows = filtered.map((w) => [w.registration_number, w.full_name, w.district, w.taluk, w.age, w.age_bracket, w.board_name, w.last_renewal_date, w.next_due_date, w.computed_status]);
    const blob = new Blob([[headers, ...rows].map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'tnuwwb-workers.csv' });
    link.click();
  };
  return <div className="app-shell">
    <nav className="topbar"><div><p className="eyebrow">TNUWWB Due Tracking</p><h1>Record Management Dashboard</h1></div><div className="profile"><span>{user.username}</span><b>{user.role}</b><button onClick={() => { clearToken(); location.reload(); }}><LogOut size={16}/> Logout</button></div></nav>
    <section className="metrics">
      <Metric icon={<Users/>} label="Total Registered Workers" value={summary.total_workers}/><Metric icon={<AlertTriangle/>} label="Overdue Renewals" value={summary.total_overdue} danger/><Metric icon={<ShieldCheck/>} label="Upcoming 60+ Pension" value={summary.pension_pending_count}/><Metric icon={<FileText/>} label="Active Claims" value={summary.active_claims}/>
    </section>
    <section className="panel filters"><select disabled={user.role !== 'ADMIN'} value={filters.district || user.assigned_district || ''} onChange={(e)=>setFilters({...filters,district:e.target.value})}><option value="">All Districts</option><option>Chennai</option><option>Coimbatore</option><option>Madurai</option></select><select value={filters.taluk||''} onChange={(e)=>setFilters({...filters,taluk:e.target.value})}><option value="">All Taluks</option><option>Pollachi</option><option>Melur</option><option>Aminjikarai</option></select><select value={filters.age_category||''} onChange={(e)=>setFilters({...filters,age_category:e.target.value})}><option value="">All Ages</option><option value="18_35">18-35</option><option value="36_50">36-50</option><option value="51_59">51-59</option><option value="60_PLUS">60+</option></select><select value={filters.status||''} onChange={(e)=>setFilters({...filters,status:e.target.value})}><option value="">All Statuses</option><option value="ACTIVE">Active</option><option value="OVERDUE">Overdue</option><option value="PENSIONER">60+ Pensioner</option></select><label className="search"><Search size={16}/><input placeholder="Search name or registration" onChange={(e)=>setFilters({...filters,search:e.target.value})}/></label><button onClick={exportCsv}><Download size={16}/> CSV Export</button></section>
    <section className="grid"><div className="panel table-wrap"><table><thead><tr>{['Reg No','Name','Location','Age','Bracket','Board','Last Renewal','Next Due','Status','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(w=><tr key={w.id}><td>{w.registration_number}</td><td>{w.full_name}</td><td>{w.district}/{w.taluk}</td><td>{w.age}</td><td>{w.age_bracket}</td><td>{w.board_name}</td><td>{w.last_renewal_date}</td><td>{w.next_due_date}</td><td><span className={badge(w.computed_status)}>{w.computed_status}</span></td><td><button className="mini"><RefreshCcw size={14}/> Renew</button><button className="mini">Details</button><button className="mini">Claim</button></td></tr>)}</tbody></table></div><div className="panel"><h3>Overdue by District</h3><ResponsiveContainer width="100%" height={260}><BarChart data={summary.district_breakdown}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="district"/><YAxis/><Tooltip/><Bar dataKey="overdue" fill="#dc2626" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div></section>
  </div>;
}
function Metric({ icon, label, value, danger }) { return <article className={danger ? 'metric danger-bg' : 'metric'}><span>{icon}</span><p>{label}</p><strong>{value}</strong></article>; }
