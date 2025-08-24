import React, { useEffect, useState } from 'react';
import { useDbUser } from '../../contexts/UserContext';
import { getAllUsers, updateUser } from '../../services/user.services';
import { getDepartments } from '../../services/department.services';
import { Loader2, RefreshCcw, Save } from 'lucide-react';

const ROLES = ['reporter','officer','admin','superadmin'];

export default function UserManagement(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptError, setDeptError] = useState('');
  const { dbUser } = useDbUser();

  async function load(){
    setLoading(true); setError('');
    try {
      const data = await getAllUsers({ limit: 200 });
      const arr = data.items || data; setUsers(arr);
    } catch(e){ setError(e?.response?.data?.message || 'Failed to load users'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  // Load departments list
  async function loadDepartments(){
    setDeptLoading(true); setDeptError('');
    try {
      const data = await getDepartments(); // returns array
      setDepartments(data || []);
    } catch(e){ setDeptError(e?.response?.data?.message || 'Failed to load departments'); }
    finally { setDeptLoading(false); }
  }
  useEffect(()=>{ loadDepartments(); },[]);

  async function save(u){
    setSavingId(u._id);
    setRowErrors(prev => ({ ...prev, [u._id]: '' }));
    try {
      const payload = { department: u.department };
      // Only include role if actor is superadmin; admins editing same role won't send it
      if (dbUser?.role === 'superadmin') payload.role = u.role;
      console.debug('[UserManagement] Attempt update', u._id, payload);
      const updated = await updateUser(u._id, payload);
      setUsers(prev => prev.map(x => x._id === u._id ? updated : x));
      console.info('[UserManagement] Updated', u._id, '->', { role: updated.role, department: updated.department });
    } catch(e){
      const msg = e?.response?.data?.message || e.message || 'Update failed';
      console.warn('[UserManagement] Update failed', u._id, msg);
      setRowErrors(prev => ({ ...prev, [u._id]: msg }));
    }
    finally { setSavingId(null); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">User Management</h2>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="h-9 px-3 rounded-md bg-indigo-600 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50"><RefreshCcw size={14}/> Refresh</button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white/60 backdrop-blur">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-b last:border-none border-gray-100 hover:bg-indigo-50/40">
                <td className="px-3 py-2 max-w-[160px] truncate font-medium text-gray-800">{u.name}</td>
                <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">{u.email}</td>
                <td className="px-3 py-2">
                  <select value={u.role || 'reporter'} onChange={e=>setUsers(prev=> prev.map(x=> x._id===u._id?{...x, role:e.target.value}:x))} className="h-8 px-2 rounded-md border border-gray-300 bg-white">
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={u.department || ''}
                    onChange={e=>setUsers(prev=> prev.map(x=> x._id===u._id?{...x, department:e.target.value}:x))}
                    className="h-8 px-2 rounded-md border border-gray-300 bg-white w-44 text-xs"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                    {/* If current value not in list (legacy string), keep it selectable */}
                    {u.department && !departments.some(d=>d.name===u.department) && (
                      <option value={u.department}>{u.department}</option>
                    )}
                  </select>
                  {deptLoading && <span className="ml-2 inline-flex items-center text-[10px] text-gray-400"><Loader2 size={12} className="animate-spin mr-1"/>Loading</span>}
                  {deptError && <span className="ml-2 text-[10px] text-rose-500">{deptError}</span>}
                </td>
                <td className="px-3 py-2">
                  <button disabled={savingId===u._id} onClick={()=>save(u)} className="h-8 px-3 rounded-md bg-emerald-600 text-white flex items-center gap-1 text-[11px] font-medium disabled:opacity-50"><Save size={12}/> {savingId===u._id? 'Saving...' : 'Save'}</button>
                  {rowErrors[u._id] && <span className="block mt-1 text-[10px] text-rose-600 max-w-[160px]">{rowErrors[u._id]}</span>}
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={5} className="py-6 text-center text-gray-500"><Loader2 size={16} className="animate-spin inline"/> Loading...</td></tr>}
            {!loading && users.length===0 && <tr><td colSpan={5} className="py-6 text-center text-gray-500">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
