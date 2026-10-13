import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Boxes, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ClipboardEdit, 
  BarChart3, 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut,
  Search,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Menu,
  X,
  History
} from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: contextUser, logout } = useContext(AuthContext);

  // 1. Get user configuration state details from your Auth storage hook
  const user = JSON.parse(localStorage.getItem('vlink_user')) || contextUser || { role: 'Staff' }; 

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on navigation change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Fetch low-stock alerts for the notification bell
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get('/api/inventory/alerts');
        if (Array.isArray(res.data)) {
          setNotifications(res.data.map(item => ({
            id: item._id,
            message: `${item.itemName} is low in stock (${item.currentStock} ${item.unit} remaining)`,
            category: item.category || 'General'
          })));
        }
      } catch (err) {
        console.error('Failed to load alerts', err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['Admin', 'Staff'] },
    { name: 'Inventory Master', icon: Boxes, path: '/inventory', roles: ['Admin', 'Staff'] },
    { name: 'Stock In', icon: ArrowDownLeft, path: '/stock-in', roles: ['Admin'] },       // ◄ Admin Only
    { name: 'Stock Out', icon: ArrowUpRight, path: '/stock-out', roles: ['Admin', 'Staff'] },
    { name: 'Daily Entry', icon: ClipboardEdit, path: '/daily-entry', roles: ['Admin', 'Staff'] },
    { name: 'Stock History', icon: History, path: '/history', roles: ['Admin', 'Staff'] },
    { name: 'Reports', icon: BarChart3, path: '/reports', roles: ['Admin'] },             // ◄ Admin Only
    { name: 'Users', icon: Users, path: '/users', roles: ['Admin'] },                     // ◄ Admin Only
    { name: 'Settings', icon: Settings, path: '/settings', roles: ['Admin', 'Staff'] },
  ];

  // 2. Filter menu listings in real time depending on user permissions
  const allowedMenuItems = allMenuItems.filter(item => item.roles.includes(user.role));

  const handleSearch = (e) => {
    const val = e.target.value;
    if (val) {
      navigate(`/inventory?q=${encodeURIComponent(val)}`);
    } else {
      navigate('/inventory');
    }
  };

  const currentSearch = searchParams.get('q') || '';

  // Get initials for profile badge
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const alertCount = notifications.length;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased">
      
      {/* MOBILE DRAWER SIDEBAR BACKDROP */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#1e293b] text-slate-300 flex flex-col justify-between border-r border-slate-800 z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          {/* Logo Brand Frame */}
          <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">VLink Networks</h1>
              <p className="text-xs text-slate-400 font-mono tracking-wider uppercase mt-0.5">Inventory Management System</p>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items Link Queue */}
          <nav className="mt-4 px-3 space-y-1">
            {allowedMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive 
                      ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/10' 
                      : 'hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lower Static Utility Anchors */}
        <div className="p-4 border-t border-slate-800/60 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-all text-slate-400 hover:text-slate-100 cursor-pointer">
            <HelpCircle className="w-5 h-5" />
            Support
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#2563eb] hover:bg-blue-700 text-white transition-all shadow-md cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* CENTRAL MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP HEAD REGION UTILITY BAR */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-sm z-10 flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 flex-1 lg:flex-initial">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 lg:hidden cursor-pointer shrink-0"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            {/* Functional Global Search Input Bar */}
            <div className="relative w-full max-w-xs md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search inventory, SKU..." 
                value={currentSearch}
                onChange={handleSearch}
                autoComplete="off"
                name="vlink-search-bar"
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Alert Notification Bell & System User Context Badge */}
          <div className="flex items-center gap-5">
            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-[9px] text-white font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-700 tracking-wide">System Notifications</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      alertCount > 0
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}>
                      {alertCount > 0 ? `${alertCount} Alert${alertCount > 1 ? 's' : ''}` : 'All Clear'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">All stock levels healthy</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">No low-stock alerts at this time.</p>
                      </div>
                    ) : (
                      notifications.map((n, idx) => (
                        <div key={n.id || idx} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50/80 transition-colors flex items-start gap-2.5 cursor-default">
                          <div className="mt-0.5 shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-700 font-medium leading-snug">{n.message}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{n.category}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {alertCount > 0 && (
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                      <button
                        onClick={() => { setShowNotifications(false); navigate('/inventory'); }}
                        className="w-full text-center text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
                      >
                        View Inventory →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 leading-none">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{user?.role === 'Admin' ? 'Systems Engineer' : 'Operations Staff'}</p>
              </div>
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {getInitials(user?.name)}
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE FRAME CONTENT MOUNT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc] flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="pt-6 pb-2 text-center">
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">© 2026 Created by Santhosh Kannan</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
