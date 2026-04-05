/* frontend/src/Login.jsx */
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, RefreshCcw } from 'lucide-react';

// *** BRANDING: Import your logo ***
// Note: Change to .png if you created the transparent watermark!
import cigLogo from './assets/cig-logo.jpg'; 

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Adjust this URL if your backend uses a different endpoint like /api/token/
      const response = await axios.post('https://cig-backend-62lz.onrender.com/api/login/', {
        username,
        password
      });
      
      // Store the token (checks for 'access' or 'token' depending on your Django setup)
      const token = response.data.access || response.data.token;
      localStorage.setItem('access_token', token);
      
      // Send user to the Dashboard
      navigate('/dashboard');
    } catch (err) {
      setError('❌ Invalid credentials. Please verify your username and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 1. Full screen Deep Navy background, perfectly centered
    <div className="min-h-screen bg-primary-deep-navy flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* 2. Massive Faint Background Watermark */}
      <img 
        src={cigLogo} 
        alt="" 
        className="absolute w-[800px] h-[800px] opacity-[0.03] grayscale invert pointer-events-none" 
      />

      {/* 3. The Premium Slate Login Card */}
      <div className="max-w-md w-full bg-slate-50 rounded-3xl shadow-2xl border-t-8 border-gold-highlight p-8 md:p-10 relative z-10">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-28 h-28 bg-white rounded-full shadow-sm border border-gray-200 overflow-hidden mb-6 flex items-center justify-center p-2">
            <img src={cigLogo} alt="CIG Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-3xl font-black text-primary-deep-navy uppercase tracking-wider mb-1">CIG Portal</h2>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent-teal" /> Secure Access
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-xl text-red-200 text-sm font-medium text-center shadow-inner">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-primary-deep-navy uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                disabled={isLoading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl text-primary-deep-navy font-bold focus:outline-none focus:ring-2 focus:ring-accent-teal focus:border-accent-teal transition shadow-sm"
                placeholder="Enter member ID"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary-deep-navy uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl text-primary-deep-navy font-bold focus:outline-none focus:ring-2 focus:ring-accent-teal focus:border-accent-teal transition shadow-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gold-highlight hover:bg-gold-highlight/90 text-primary-deep-navy font-black text-lg px-6 py-4 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-3 mt-4"
          >
            {isLoading ? <RefreshCcw className="w-6 h-6 animate-spin" /> : 'Authenticate'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-200 pt-6">
           <p className="text-xs text-gray-500 font-medium leading-relaxed">
             Authorized personnel only. By logging in, you agree to the CIG strict confidentiality and fiduciary protocols.
           </p>
        </div>

      </div>
    </div>
  );
}

export default Login;