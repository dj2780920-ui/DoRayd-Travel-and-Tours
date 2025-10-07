import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, User, UserCheck, X } from 'lucide-react';
import DataService from '../components/services/DataService.jsx';

// It's better to manage these IDs via environment variables
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID';

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
  
  const socialLogin = async (provider, tokenData) => {
    try {
      const response = await DataService.socialLogin(provider, tokenData);
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      }
      throw new Error(response.message);
    } catch (error) {
      return { success: false, message: error.message || `${provider} login failed.` };
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

  const value = { user, isAuthenticated, loading, login, logout, register, socialLogin };

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
  const { login, register, socialLogin } = useAuth();
  const navigate = useNavigate();
  const [isLoginView, setIsLoginView] = useState(!showRegistration);
  const [activeTab, setActiveTab] = useState('customer');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Effect to load external SDKs
  useEffect(() => {
    if (!isOpen) return;

    // Google Script
    const googleScriptId = 'google-gsi-script';
    if (!document.getElementById(googleScriptId)) {
        const googleScript = document.createElement('script');
        googleScript.id = googleScriptId;
        googleScript.src = 'https://accounts.google.com/gsi/client';
        googleScript.async = true;
        googleScript.defer = true;
        googleScript.onload = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallbackResponse
                });
            }
        };
        document.body.appendChild(googleScript);
    }

    // Facebook Script
    const facebookScriptId = 'facebook-jssdk';
    if (!document.getElementById(facebookScriptId)) {
        window.fbAsyncInit = function() {
            window.FB.init({
                appId: FACEBOOK_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
        };
        const facebookScript = document.createElement('script');
        facebookScript.id = facebookScriptId;
        facebookScript.src = "https://connect.facebook.net/en_US/sdk.js";
        facebookScript.async = true;
        facebookScript.defer = true;
        facebookScript.crossOrigin = 'anonymous';
        document.body.appendChild(facebookScript);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsLoginView(!showRegistration);
    setActiveTab(showRegistration ? 'customer' : 'customer');
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let result;
    if (isLoginView) {
      result = await login({ email: formData.email, password: formData.password });
      if (result.success) {
        onClose();
        switch (result.user.role) {
          case 'admin': navigate('/owner/dashboard', { replace: true }); break;
          case 'employee': navigate('/employee/dashboard', { replace: true }); break;
          case 'customer': navigate('/my-bookings', { replace: true }); break;
          default: navigate('/');
        }
      } else { setError(result.message); }
    } else {
      result = await register(formData);
      if (result.success) {
        alert('Registration successful! Please log in.');
        setIsLoginView(true);
        resetForm();
      } else { setError(result.message); }
    }
    setLoading(false);
  };
  
  const handleGoogleCallbackResponse = async (response) => {
      setLoading(true);
      setError('');
      const result = await socialLogin('google', { credential: response.credential });
      if (result.success && result.user.role === 'customer') {
          onClose();
          navigate('/my-bookings', { replace: true });
      } else {
          setError(result.message || "Login failed.");
      }
      setLoading(false);
  };

  const handleGoogleLoginClick = () => {
      if (window.google) {
        window.google.accounts.id.prompt();
      } else {
        setError("Google Login is not ready yet. Please try again in a moment.");
      }
  };

  const handleFacebookLoginClick = () => {
      if (window.FB) {
          window.FB.login(async (response) => {
              if (response.authResponse) {
                  setLoading(true);
                  setError('');
                  const result = await socialLogin('facebook', { accessToken: response.authResponse.accessToken });
                  if (result.success && result.user.role === 'customer') {
                      onClose();
                      navigate('/my-bookings', { replace: true });
                  } else {
                      setError(result.message);
                  }
                  setLoading(false);
              } else {
                  setError('Facebook login was cancelled or failed.');
              }
          }, { scope: 'email,public_profile' });
      } else {
          setError("Facebook Login is not ready yet. Please try again in a moment.");
      }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
        <div className="p-8">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{isLoginView ? 'Welcome Back' : 'Create Your Account'}</h2>
            </div>

            <div className="flex border-b mb-6">
                <button onClick={() => handleTabChange('customer')} className={`w-1/2 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'customer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}><User size={16}/> Customer</button>
                <button onClick={() => handleTabChange('staff')} className={`w-1/2 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'staff' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}><Shield size={16}/> Staff</button>
            </div>

            {error && <div className="mb-4 text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {!isLoginView && activeTab === 'customer' && (
                <div className="flex gap-4">
                  <input type="text" name="firstName" placeholder="First Name" onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
                  <input type="text" name="lastName" placeholder="Last Name" onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
                </div>
              )}
              <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Password" value={formData.password} onChange={handleInputChange} className="w-full p-3 border rounded-lg" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500"><EyeOff size={18} className={showPassword ? '' : 'hidden'}/><Eye size={18} className={showPassword ? 'hidden' : ''}/></button>
              </div>
              
              {isLoginView && <div className="text-right"><Link to="/forgot-password" onClick={onClose} className="text-sm text-blue-600 hover:underline">Forgot password?</Link></div>}
              
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:bg-blue-400">{loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Create Account')}</button>
            </form>
            
            {activeTab === 'customer' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
                </div>
                <div className="space-y-3">
                  <button onClick={handleGoogleLoginClick} type="button" className="w-full flex justify-center items-center gap-3 py-3 border rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                      <img src="https://cdn.builder.io/api/v1/image/assets/TEMP/5a73199f1bb1d3ea89b40297fa0cb3c5a5d23d64a09d3c0065afa4619abb32ce?apiKey=597363a3080546f9b072bf59bebbfd17&" alt="Google" className="w-5 h-5"/> Continue with Google
                  </button>
                  <button onClick={handleFacebookLoginClick} type="button" className="w-full flex justify-center items-center gap-3 py-3 border rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                      <img src="https://cdn.builder.io/api/v1/image/assets/TEMP/3feb9724a7eb37edc68e698d2bf9cfdafff2e78a2d0733da73a89c1beed3d397?apiKey=597363a3080546f9b072bf59bebbfd17&" alt="Facebook" className="w-5 h-5"/> Continue with Facebook
                  </button>
                </div>
              </>
            )}

            <p className="mt-6 text-center text-sm text-gray-500">
              {isLoginView ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => { setIsLoginView(!isLoginView); resetForm(); }} className="font-semibold text-blue-600 hover:underline">
                {isLoginView ? 'Sign up' : 'Sign in'}
              </button>
            </p>
        </div>
      </div>
    </div>
  );
}

