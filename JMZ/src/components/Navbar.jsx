import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Download, Menu, X, Shield, Crown, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-primary/80 border-b border-white/10"
    >
      <div className="w-full px-6 sm:px-16 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet to-violet-dark flex items-center justify-center shadow-lg shadow-violet/30">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-wide">VidSnatch</h1>
                <p className="text-violet-light text-xs -mt-1">Download anything</p>
              </div>
            </motion.div>
          </Link>

          <ul className="hidden md:flex items-center gap-6">
            <li>
              <button
                onClick={() => navigate('/pricing')}
                className="text-secondary hover:text-white text-sm font-medium transition-colors"
              >
                Pricing
              </button>
            </li>

            {isAuthenticated ? (
              <>
                <li>
                  <button
                    onClick={() => navigate('/portal')}
                    className="text-secondary hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Portal
                  </button>
                </li>
                <li>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet/10 border border-violet/20">
                    <Crown className="w-4 h-4 text-violet" />
                    <span className="text-sm text-violet-light capitalize">{user?.subscription_tier || 'Free'}</span>
                  </div>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="text-secondary hover:text-white text-sm font-medium transition-colors"
                  >
                    Log out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-secondary hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet to-violet-dark text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Get Started
                  </button>
                </li>
              </>
            )}
          </ul>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: mobileOpen ? 'auto' : 0, opacity: mobileOpen ? 1 : 0 }}
        className="md:hidden overflow-hidden bg-primary/95 backdrop-blur-xl"
      >
        <ul className="px-6 py-4 space-y-4">
          <li>
            <button
              onClick={() => { navigate('/pricing'); setMobileOpen(false); }}
              className="text-secondary hover:text-white text-sm w-full text-left flex items-center gap-3"
            >
              <Crown className="w-5 h-5" /> Pricing
            </button>
          </li>
          {isAuthenticated ? (
            <>
              <li>
                <button
                  onClick={() => { navigate('/portal'); setMobileOpen(false); }}
                  className="text-secondary hover:text-white text-sm w-full text-left flex items-center gap-3"
                >
                  <Shield className="w-5 h-5" /> Portal
                </button>
              </li>
              <li>
                <button onClick={handleLogout} className="text-red-400 text-sm w-full text-left">
                  Log out
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <button
                  onClick={() => { navigate('/login'); setMobileOpen(false); }}
                  className="text-secondary hover:text-white text-sm w-full text-left flex items-center gap-3"
                >
                  <LogIn className="w-5 h-5" /> Sign In
                </button>
              </li>
              <li>
                <button
                  onClick={() => { navigate('/register'); setMobileOpen(false); }}
                  className="text-violet text-sm w-full text-left flex items-center gap-3"
                >
                  <UserPlus className="w-5 h-5" /> Get Started
                </button>
              </li>
            </>
          )}
        </ul>
      </motion.div>
    </motion.nav>
  );
};

export default Navbar;


