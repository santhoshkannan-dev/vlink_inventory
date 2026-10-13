import React, { useContext } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InventoryMaster from './pages/InventoryMaster';
import DailyEntry from './pages/DailyEntry';
import Reports from './pages/Reports';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import Users from './pages/Users';
import Settings from './pages/Settings';
import StockHistory from './pages/StockHistory';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AuthContext);
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <span className="block text-xs font-bold text-gray-500 mt-4 uppercase tracking-widest">Loading VLink portal...</span>
        </div>
      </div>
    );
  }

  // Show login layout if user session is absent
  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<InventoryMaster />} />
          <Route path="/daily-entry" element={<DailyEntry />} />
          
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Reports />
            </ProtectedRoute>
          } />
          
          <Route path="/stock-in" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <StockIn />
            </ProtectedRoute>
          } />
          
          <Route path="/stock-out" element={<StockOut />} />
          
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Users />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
              <StockHistory />
            </ProtectedRoute>
          } />

          {/* Catch-all configuration staging page for lower links */}
          <Route path="*" element={
            <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md font-sans">
              <h3 className="text-sm font-bold text-gray-800">Feature Under Configuration</h3>
              <p className="text-xs text-gray-500 mt-1">This module view is undergoing system integration and staging.</p>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </AuthProvider>
  );
}
