import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Mail, Lock, User, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AgentLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', name: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/agents/login`, loginData);
      localStorage.setItem('agent_token', res.data.token);
      localStorage.setItem('agent_data', JSON.stringify(res.data.agent));
      toast.success(`Welcome back, ${res.data.agent.name}!`);
      navigate('/agent/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.name) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/agents/register`, { ...registerData, role: 'agent' });
      toast.success('Account created! Please login.');
      setLoginData({ email: registerData.email, password: registerData.password });
      setRegisterData({ email: '', password: '', name: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white" data-testid="agent-login-page">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#111111] flex items-center justify-center shadow-lg">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#111111]">24gameapi</h1>
        <p className="text-sm text-gray-500">Agent Portal</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-gray-200" data-testid="auth-card">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger value="login" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white" data-testid="login-tab">Login</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white" data-testid="register-tab">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardHeader>
                <CardTitle className="text-[#111111]">Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access the dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="agent@24gameapi.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="pl-10 border-gray-200 focus:border-[#111111] focus:ring-[#111111]"
                      data-testid="login-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="pl-10 border-gray-200 focus:border-[#111111] focus:ring-[#111111]"
                      data-testid="login-password-input"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-full bg-[#111111] hover:bg-[#333] text-white"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </CardContent>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister}>
              <CardHeader>
                <CardTitle className="text-[#111111]">Create account</CardTitle>
                <CardDescription>Join the team as a support agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="John Doe"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="pl-10 border-gray-200 focus:border-[#111111] focus:ring-[#111111]"
                      data-testid="register-name-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="agent@24gameapi.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="pl-10 border-gray-200 focus:border-[#111111] focus:ring-[#111111]"
                      data-testid="register-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="pl-10 border-gray-200 focus:border-[#111111] focus:ring-[#111111]"
                      data-testid="register-password-input"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-full bg-[#111111] hover:bg-[#333] text-white"
                  disabled={loading}
                  data-testid="register-submit-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      <p className="mt-6 text-sm text-gray-500">
        Looking to chat?{' '}
        <Link to="/" className="text-[#111111] font-medium hover:underline">
          Start a conversation
        </Link>
      </p>
    </div>
  );
}
