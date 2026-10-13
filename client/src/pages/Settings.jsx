import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  Settings as SettingsIcon,
  User,
  Users,
  Shield,
  Phone,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Server,
  Database,
  Clock,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Wrench
} from 'lucide-react';

export default function Settings() {
  const { user } = useContext(AuthContext);

  // Tabs
  const [activeTab, setActiveTab] = useState('profile');

  // Technician state
  const [technicians, setTechnicians] = useState([]);
  const [techLoading, setTechLoading] = useState(true);
  const [showTechForm, setShowTechForm] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [techForm, setTechForm] = useState({ name: '', phone: '' });
  const [techSaving, setTechSaving] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });

  // System health
  const [systemHealth, setSystemHealth] = useState(null);

  // Fetch technicians
  const fetchTechnicians = async () => {
    try {
      setTechLoading(true);
      const res = await axios.get('/api/technicians');
      setTechnicians(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load technicians');
    } finally {
      setTechLoading(false);
    }
  };

  // Check system health
  const fetchHealth = async () => {
    try {
      const res = await axios.get('/api/health');
      setSystemHealth(res.data);
    } catch {
      setSystemHealth({ status: 'DOWN', message: 'Unable to reach server' });
    }
  };

  useEffect(() => {
    fetchTechnicians();
    fetchHealth();
  }, []);

  // Technician CRUD handlers
  const handleTechSubmit = async (e) => {
    e.preventDefault();
    if (!techForm.name.trim()) {
      toast.error('Technician name is required');
      return;
    }
    setTechSaving(true);
    try {
      if (editingTech) {
        await axios.put(`/api/technicians/${editingTech._id}`, techForm);
        toast.success('Technician updated successfully');
      } else {
        await axios.post('/api/technicians', techForm);
        toast.success('Technician added successfully');
      }
      setTechForm({ name: '', phone: '' });
      setShowTechForm(false);
      setEditingTech(null);
      fetchTechnicians();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setTechSaving(false);
    }
  };

  const handleEditTech = (tech) => {
    setEditingTech(tech);
    setTechForm({ name: tech.name, phone: tech.phone || '' });
    setShowTechForm(true);
  };

  const handleDeleteTech = async (id, name) => {
    if (!window.confirm(`Delete technician "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/technicians/${id}`);
      toast.success('Technician deleted');
      fetchTechnicians();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleCancelTechForm = () => {
    setShowTechForm(false);
    setEditingTech(null);
    setTechForm({ name: '', phone: '' });
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    ...(user?.role === 'Admin' ? [
      { id: 'technicians', name: 'Technicians', icon: Wrench },
      { id: 'system', name: 'System', icon: Server },
    ] : [])
  ];

  return (
    <div className="max-w-6xl mx-auto font-sans space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Configure system preferences, manage technicians, and view system health.</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all cursor-pointer border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-200">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U'}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">{user?.name || 'User'}</h3>
                  <p className="text-sm text-slate-500 font-medium">{user?.email || 'No email'}</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide mt-2 ${
                    user?.role === 'Admin'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {user?.role === 'Admin' ? 'SYSTEMS ADMINISTRATOR' : 'OPERATIONS STAFF'}
                  </span>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.name || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.email || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Access Level</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.role || 'Staff'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Account ID</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono">{user?._id?.substring(0, 12) || 'N/A'}...</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 mt-6">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Change Password
                </h4>
                <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                  {/* Hidden field to prevent browser from autofilling the search bar */}
                  <input type="text" name="prevent-autofill" style={{ display: 'none' }} tabIndex={-1} autoComplete="username" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Current Password</label>
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                        autoComplete="new-password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 cursor-pointer">
                        {showPasswords.current ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">New Password</label>
                      <input
                        type={showPasswords.newPass ? 'text' : 'password'}
                        value={passwordForm.newPass}
                        onChange={(e) => setPasswordForm({...passwordForm, newPass: e.target.value})}
                        autoComplete="new-password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Min 6 characters"
                      />
                      <button type="button" onClick={() => setShowPasswords({...showPasswords, newPass: !showPasswords.newPass})} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 cursor-pointer">
                        {showPasswords.newPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Confirm Password</label>
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                        autoComplete="new-password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Re-enter password"
                      />
                      <button type="button" onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 cursor-pointer">
                        {showPasswords.confirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </form>
                <button
                  onClick={async () => {
                    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
                      toast.error('All password fields are required');
                      return;
                    }
                    if (passwordForm.newPass.length < 6) {
                      toast.error('New password must be at least 6 characters');
                      return;
                    }
                    if (passwordForm.newPass !== passwordForm.confirm) {
                      toast.error('New passwords do not match');
                      return;
                    }
                    try {
                      await axios.put('/api/auth/update-password', {
                        currentPassword: passwordForm.current,
                        newPassword: passwordForm.newPass
                      });
                      toast.success('Password updated successfully');
                      setPasswordForm({ current: '', newPass: '', confirm: '' });
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Password update failed');
                    }
                  }}
                  className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* TECHNICIANS TAB */}
          {activeTab === 'technicians' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Technician Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Add, edit, or remove technicians. These will appear in Daily Entry "Care Of" dropdown.</p>
                </div>
                {!showTechForm && (
                  <button
                    onClick={() => { setShowTechForm(true); setEditingTech(null); setTechForm({ name: '', phone: '' }); }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Add Technician
                  </button>
                )}
              </div>

              {/* Add/Edit Form */}
              {showTechForm && (
                <form onSubmit={handleTechSubmit} className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-blue-800">
                    {editingTech ? 'Edit Technician' : 'Add New Technician'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                        Technician Name *
                      </label>
                      <input
                        type="text"
                        value={techForm.name}
                        onChange={(e) => setTechForm({...techForm, name: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Rajesh Kumar"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={techForm.phone}
                        onChange={(e) => setTechForm({...techForm, phone: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={techSaving}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {techSaving ? 'Saving...' : (editingTech ? 'Update' : 'Add Technician')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTechForm}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Technician Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                {techLoading ? (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium">Loading technicians...</div>
                ) : technicians.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">No technicians found</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first technician to get started.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">#</th>
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</th>
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</th>
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Added</th>
                        <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {technicians.map((tech, idx) => (
                        <tr key={tech._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {tech.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                              </div>
                              <span className="font-semibold text-slate-800">{tech.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {tech.phone ? (
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{tech.phone}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide ${
                              tech.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {tech.active !== false ? '● ACTIVE' : '● INACTIVE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-medium">
                            {new Date(tech.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditTech(tech)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTech(tech._id, tech.name)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium">
                Total: {technicians.length} technician{technicians.length !== 1 ? 's' : ''} registered
              </p>
            </div>
          )}

          {/* SYSTEM TAB */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">System Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Server Status */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Server Status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {systemHealth?.status === 'UP' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`text-sm font-bold ${systemHealth?.status === 'UP' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {systemHealth?.status === 'UP' ? 'Online & Healthy' : 'Unreachable'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">{systemHealth?.message || 'Checking...'}</p>
                </div>

                {/* Database */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">MongoDB</p>
                  <p className="text-[10px] text-slate-400 mt-1">In-Memory Server (Development)</p>
                </div>

                {/* Uptime */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Active</p>
                  <p className="text-[10px] text-slate-400 mt-1">Logged in as {user?.name}</p>
                </div>
              </div>

              {/* App Info */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700">Application Details</h4>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { label: 'Application', value: 'VLink Networks — Inventory Management System' },
                    { label: 'Version', value: 'v1.0.0' },
                    { label: 'Framework', value: 'React 19 + Express.js + MongoDB' },
                    { label: 'API Endpoint', value: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api` },
                    { label: 'Created By', value: 'Santhosh Kannan' },
                    { label: 'Last Updated', value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-5 py-3">
                      <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                      <span className="text-xs font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
