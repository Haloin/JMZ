import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the Terms of Service');
      return;
    }
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created!');
      navigate('/portal');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-violet/10 via-primary to-violet-dark/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-strong rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-violet to-violet-dark rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Join <span className="text-gradient">VidSnatch</span>
            </h1>
            <p className="text-secondary">Unlimited private downloads</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  className="w-full bg-tertiary border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-secondary focus:outline-none focus:border-violet transition-colors"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  className="w-full bg-tertiary border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-secondary focus:outline-none focus:border-violet transition-colors"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className="w-full bg-tertiary border border-white/10 rounded-lg py-3 pl-10 pr-12 text-white placeholder-secondary focus:outline-none focus:border-violet transition-colors"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  className="w-full bg-tertiary border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-secondary focus:outline-none focus:border-violet transition-colors"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-tertiary text-violet focus:ring-violet"
              />
              <span className="text-sm text-secondary">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener" className="text-violet hover:text-violet-light">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener" className="text-violet hover:text-violet-light">
                  Privacy Policy
                </a>
                . I am solely responsible for my use of this service.
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet to-violet-dark hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating accountâ€¦' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-secondary text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-violet hover:text-violet-light font-medium transition-colors"
            >
              Sign in
            </button>
          </p>

          <div className="mt-6 p-3 bg-violet/10 rounded-lg border border-violet/20">
            <p className="text-sm text-violet-light text-center">
              <Shield className="inline w-4 h-4 mr-1" />
              Encrypted storage Â· Private download queues Â· No logging on private tier
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;


