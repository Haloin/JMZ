import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Zap, Crown, Globe, Lock, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Get started with basic downloads',
    icon: Zap,
    features: ['10 downloads per month', '720p max quality', '1 GB cloud storage', 'Standard support'],
    notIncluded: ['Proxy rotation', 'Stealth mode', 'No logging', 'Priority processing'],
    gradient: 'from-gray-500 to-gray-600',
    highlight: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    period: 'month',
    description: 'Great for casual users',
    icon: Zap,
    features: ['100 downloads per month', '1080p max quality', '10 GB cloud storage', 'Priority support', 'Download history'],
    notIncluded: ['Proxy rotation', 'Stealth mode', 'No logging'],
    gradient: 'from-blue-500 to-blue-600',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    period: 'month',
    description: 'For power users',
    icon: Crown,
    features: ['1,000 downloads per month', '4K max quality', '100 GB cloud storage', 'Priority support', 'API access', 'Batch downloads'],
    notIncluded: ['Proxy rotation', 'Stealth mode'],
    gradient: 'from-violet to-violet-dark',
    highlight: true,
  },
  {
    id: 'private',
    name: 'Private',
    price: 49.99,
    period: 'month',
    description: 'Ultimate privacy & unlimited access',
    icon: Shield,
    features: [
      'Unlimited downloads',
      '4K max quality',
      '500 GB cloud storage',
      'Proxy rotation',
      'Stealth mode',
      'IP anonymization',
      'No activity logging',
      '24/7 priority support',
      'Encrypted streams',
    ],
    notIncluded: [],
    gradient: 'from-violet via-pink-600 to-red-500',
    highlight: false,
    badge: 'Ultimate Privacy',
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (tierId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (tierId === 'free') {
      toast.success("You're already on the free plan");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ tier: tierId, yearly }),
      });
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error('Failed to start checkout');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Simple <span className="text-gradient">Pricing</span>
          </h1>
          <p className="text-secondary text-lg max-w-xl mx-auto">
            Start free. Upgrade when you need more. Cancel anytime.
          </p>

          <div className="flex items-center justify-center mt-8 gap-4">
            <span className={`text-sm ${!yearly ? 'text-white' : 'text-secondary'}`}>Monthly</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-14 h-7 rounded-full transition-colors ${yearly ? 'bg-violet' : 'bg-tertiary'}`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  yearly ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${yearly ? 'text-white' : 'text-secondary'}`}>
              Yearly <span className="text-green-400">(save 20%)</span>
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const monthlyPrice = yearly && tier.price > 0 ? tier.price * 0.8 : tier.price;
            const isCurrentPlan = user?.subscription_tier === tier.id;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative ${tier.highlight ? 'lg:-mt-4 lg:mb-4' : ''}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-gradient-to-r from-violet to-violet-dark text-white text-xs font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {tier.badge && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="bg-gradient-to-r from-violet via-pink-600 to-red-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div
                  className={`glass-strong rounded-2xl p-6 h-full flex flex-col ${
                    tier.highlight ? 'border-2 border-violet/50' : ''
                  } ${tier.badge ? 'border-2 border-pink-500/30' : ''}`}
                >
                  <div className="text-center mb-6">
                    <div className={`w-14 h-14 mx-auto bg-gradient-to-r ${tier.gradient} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                    <p className="text-sm text-secondary mt-1">{tier.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-white">
                        ${monthlyPrice === 0 ? '0' : monthlyPrice.toFixed(2)}
                      </span>
                      <span className="text-secondary ml-2">/{tier.period === 'forever' ? 'forever' : 'mo'}</span>
                    </div>
                    {yearly && tier.price > 0 && (
                      <p className="text-sm text-green-400 mt-1">
                        ${(monthlyPrice * 12).toFixed(0)} billed annually
                      </p>
                    )}
                  </div>

                  <div className="flex-grow space-y-2.5 mb-6">
                    {tier.features.map((f, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-secondary">{f}</span>
                      </div>
                    ))}
                    {tier.notIncluded.map((f, j) => (
                      <div key={j} className="flex items-start gap-2 opacity-40">
                        <X className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-secondary">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={loading || isCurrentPlan}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      tier.badge
                        ? 'bg-gradient-to-r from-violet via-pink-600 to-red-500 hover:opacity-90 text-white'
                        : tier.highlight
                        ? 'bg-gradient-to-r from-violet to-violet-dark hover:opacity-90 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isCurrentPlan ? 'Current Plan' : tier.id === 'free' ? 'Get Started Free' : `Subscribe`}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 glass-strong rounded-2xl p-8 border border-violet/20"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-violet to-violet-dark rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Why go Private?</h3>
                <p className="text-secondary text-sm">Maximum privacy, unlimited downloads, zero logging</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              {[{ icon: Globe, label: 'Proxy Rotation' }, { icon: Eye, label: 'No Logging' }, { icon: Lock, label: 'Encrypted' }].map(
                ({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-violet" />
                    <span className="text-sm text-secondary">{label}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center text-secondary text-sm"
        >
          Questions?{' '}
          <a href="mailto:support@vidsnatch.com" className="text-violet hover:text-violet-light transition-colors">
            Contact support
          </a>
        </motion.p>
      </div>
    </div>
  );
};

export default Pricing;


