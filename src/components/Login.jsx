import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, User, UserCheck, X } from 'lucide-react';
import DataService from './services/DataService.jsx';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await DataService.getCurrentUser();
          if (response.success && response.user) {
            setUser(response.user);
            setIsAuthenticated(true);
          } else {
            DataService.logout();
          }
        } catch (error) {
          DataService.logout();
        }
      }
      setLoading(false);
    };
    validateToken();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await DataService.login(credentials);
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      }
      throw new Error(response.message);
    } catch (error) {
      return { success: false, message: error.message || 'Login failed.' };
    }
  };

  const logout = () => {
    DataService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const register = async (userData) => {
    try {
      const response = await DataService.register(userData);
      return response;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const value = { user, isAuthenticated, loading, login, logout, register };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="text-center p-12">Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location, showLogin: true }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// --- Unified Login Portal ---
export const UnifiedLoginPortal = ({ isOpen, onClose, showRegistration = false }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLoginView, setIsLoginView] = useState(!showRegistration);
  const [activeTab, setActiveTab] = useState('customer');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (showRegistration) {
      setIsLoginView(false);
      setActiveTab('customer');
    } else {
      setIsLoginView(true);
    }
  }, [showRegistration, isOpen]);

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', email: '', password: '' });
    setError('');
    setShowPassword(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsLoginView(true);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let result;
    if (isLoginView) {
      result = await login({ email: formData.email, password: formData.password });
      if (result.success) {
        onClose();
        switch (result.user.role) {
          case 'admin':
            navigate('/owner/dashboard', { replace: true });
            break;
          case 'employee':
            navigate('/employee/dashboard', { replace: true });
            break;
          case 'customer':
            navigate('/my-bookings', { replace: true });
            break;
          default:
            navigate('/');
        }
      } else {
        setError(result.message);
      }
    } else {
      result = await register(formData);
      if (result.success) {
        alert('Registration successful! Please log in.');
        setIsLoginView(true);
        resetForm();
      } else {
        setError(result.message);
      }
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === 'customer' ? (isLoginView ? 'Customer Login' : 'Create Account') : 'Staff Portal'}
              </h2>
              <p className="text-sm text-gray-500">
                {activeTab === 'customer' ? 'Access your bookings and profile' : 'Admin & Employee Login'}
              </p>
            </div>
            <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
          </div>
          
          <div className="flex border-b mb-4">
              <button onClick={() => handleTabChange('customer')} className={`flex-1 py-2 text-sm font-medium ${activeTab === 'customer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Customer</button>
              <button onClick={() => handleTabChange('staff')} className={`flex-1 py-2 text-sm font-medium ${activeTab === 'staff' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}>Staff</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            {activeTab === 'customer' && !isLoginView && (
              <>
                <input type="text" placeholder="First Name" onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full p-2 border rounded" required />
                <input type="text" placeholder="Last Name" onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full p-2 border rounded" required />
              </>
            )}

            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded" required />
            
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full p-2 border rounded" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {isLoginView && (
                <div className="text-right">
                    <Link to="/forgot-password" onClick={onClose} className="text-sm text-blue-600 hover:underline">
                        Forgot password?
                    </Link>
                </div>
            )}
            
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-blue-400">
              {loading ? 'Processing...' : isLoginView ? 'Sign In' : 'Register'}
            </button>
            
            {activeTab === 'customer' && (
              <button type="button" onClick={() => { setIsLoginView(!isLoginView); resetForm(); }} className="w-full text-center text-sm text-blue-600 hover:underline">
                {isLoginView ? 'Need an account? Register' : 'Already have an account? Sign In'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};