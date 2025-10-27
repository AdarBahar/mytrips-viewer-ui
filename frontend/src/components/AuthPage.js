import { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { appLogin, jwtLogin, register } from '../services/authService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [useAppLogin, setUseAppLogin] = useState(true); // Toggle between app-login and JWT
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login flow
        if (useAppLogin) {
          // Use app-login endpoint (stateless)
          const result = await appLogin({
            email: formData.email,
            password: formData.password
          });

          if (result.authenticated) {
            toast.success('Login successful!');
            // Store user info for app-login mode
            const userData = {
              id: result.user_id,
              email: formData.email,
              username: formData.email.split('@')[0], // Extract username from email
              authenticated: true
            };
            // Use a special token format to indicate app-login mode
            onLogin(`app-login:${result.user_id}`, userData);
          } else {
            toast.error(result.message || 'Invalid credentials');
          }
        } else {
          // Use traditional JWT login
          const result = await jwtLogin({
            username: formData.username,
            password: formData.password
          });

          if (result.success) {
            const { access_token, user } = result.data;
            if (!access_token || !user) {
              toast.error('Login failed: Invalid server response');
              return;
            }
            toast.success('Login successful!');
            onLogin(access_token, user);
          } else {
            toast.error(result.error);
          }
        }
      } else {
        // Registration flow (always uses JWT)
        const result = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        if (result.success) {
          const { access_token, user } = result.data;
          if (!access_token || !user) {
            toast.error('Registration failed: Invalid server response');
            return;
          }
          toast.success('Registration successful!');
          onLogin(access_token, user);
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Route Tracker
          </h1>
          <p className="text-slate-600">Real-time location monitoring</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Show email field for app-login or registration */}
          {(useAppLogin && isLogin) || !isLogin ? (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                name="email"
                data-testid="auth-email-input"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="border-slate-300 focus:border-blue-500"
              />
            </div>
          ) : null}

          {/* Show username field for JWT login or registration */}
          {(!useAppLogin && isLogin) || !isLogin ? (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700">Username</Label>
              <Input
                id="username"
                name="username"
                data-testid="auth-username-input"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                className="border-slate-300 focus:border-blue-500"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700">Password</Label>
            <Input
              id="password"
              name="password"
              data-testid="auth-password-input"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="border-slate-300 focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            data-testid="auth-submit-button"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-xl transition-colors"
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </Button>
        </form>

        {/* Auth method toggle (only show for login) */}
        {isLogin && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setUseAppLogin(!useAppLogin)}
              className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              {useAppLogin ? 'Use JWT Login' : 'Use App Login'}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            data-testid="auth-toggle-button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>

        {/* Info about current auth method */}
        {isLogin && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-slate-600 text-center">
              {useAppLogin ? (
                <>
                  <strong>App Login:</strong> Stateless authentication using email
                  <br />
                  <span className="text-slate-500">Use: testuser@example.com / password123</span>
                </>
              ) : (
                <>
                  <strong>JWT Login:</strong> Token-based authentication using username
                  <br />
                  <span className="text-slate-500">Use: testuser / password123</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}