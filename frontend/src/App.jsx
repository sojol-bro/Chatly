import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useStore from './store/useStore';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import { LogIn, User as UserIcon, Lock, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function App() {
  const { user, token, setAuth, setConversations, setMessages } = useStore();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('alice123');
  const [error, setError] = useState('');

  // Fetch conversations when logged in
  useEffect(() => {
    if (token) {
      const fetchConversations = async () => {
        try {
          const res = await axios.get(`${API_BASE}/conversations/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setConversations(res.data);
          
          // Pre-fetch messages for each conversation
          res.data.forEach(async (conv) => {
            const msgRes = await axios.get(`${API_BASE}/conversations/${conv.id}/messages/`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(conv.id, msgRes.data.results);
          });
        } catch (err) {
          console.error('Failed to fetch data', err);
        }
      };
      fetchConversations();
    }
  }, [token, setConversations, setMessages]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/token/`, { username, password });
      setAuth({ id: res.data.user_id, username: res.data.username }, res.data.access_token);
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F8F7FB] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-stitch/10 p-10 border border-gray-100">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-stitch rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-stitch/40">
              <LogIn size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">Stitch Chat</h1>
            <p className="text-gray-500 mt-2">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:border-stitch focus:bg-white outline-none transition-all"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 focus:border-stitch focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl border border-red-100">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stitch text-white font-bold py-4 rounded-2xl shadow-lg shadow-stitch/30 hover:bg-stitch-dark active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Login Now'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              Testing? Use <span className="text-stitch font-semibold">alice</span> / <span className="text-stitch font-semibold">alice123</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <div className="max-w-[1440px] w-full mx-auto flex shadow-2xl overflow-hidden my-0 sm:my-4 sm:rounded-3xl border border-white/50">
        <ChatSidebar />
        <ChatWindow />
      </div>
    </div>
  );
}

export default App;
