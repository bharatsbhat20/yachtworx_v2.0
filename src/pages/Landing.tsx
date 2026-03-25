import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Ship, FileText, BarChart2, Smartphone, Shield,
  ArrowRight, ChevronRight, CheckCircle, Zap,
  MapPin
} from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { Badge } from '../components/ui/Badge';
import { StarRating } from '../components/ui/StarRating';
import { Avatar } from '../components/ui/Avatar';
import { mockProviders, platformStats } from '../data/mockData';

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

const features = [
  {
    icon: Ship,
    title: 'Digital Twin',
    description: 'A living profile for every vessel. Track components, health scores, service history, and documents all in one intelligent dashboard.',
    color: 'from-ocean-500 to-ocean-600',
  },
  {
    icon: Zap,
    title: 'Smart Scheduling',
    description: 'AI-powered maintenance reminders based on engine hours, seasons, and manufacturer specifications. Never miss a service again.',
    color: 'from-teal-500 to-teal-600',
  },
  {
    icon: Shield,
    title: 'Verified Providers',
    description: 'Every service professional on our platform is background-checked, certified, and reviewed by real yacht owners. Zero surprises.',
    color: 'from-navy-400 to-navy-600',
  },
  {
    icon: FileText,
    title: 'Document Vault',
    description: 'Secure cloud storage for registration, insurance, surveys, manuals, and service receipts. Always accessible, always organized.',
    color: 'from-gold-400 to-gold-500',
  },
  {
    icon: BarChart2,
    title: 'Cost Analytics',
    description: 'See exactly where your money goes. Track depreciation, service costs, and get insights to maximize your boat\'s value.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Full-featured mobile experience. Request services from the dock, track jobs in real time, and message providers from anywhere.',
    color: 'from-rose-500 to-rose-600',
  },
];

const ownerSteps = [
  { step: '01', title: 'Create your fleet profile', description: 'Add your boats in minutes. Import specs from HIN or enter manually. Your digital twin is live instantly.' },
  { step: '02', title: 'Find & book professionals', description: 'Search verified local providers, compare quotes, read reviews, and book in one tap. All communication in-platform.' },
  { step: '03', title: 'Track everything automatically', description: 'Service records update automatically. Alerts fire when action is needed. Your fleet always knows what it needs.' },
];

const providerSteps = [
  { step: '01', title: 'Create your provider profile', description: 'List your services, certifications, and experience. Your professional profile reaches thousands of local boat owners.' },
  { step: '02', title: 'Receive job requests', description: 'Get notified instantly when owners need your expertise. Review job details, submit quotes, and win business on your terms.' },
  { step: '03', title: 'Get paid, build reputation', description: 'Secure payments processed automatically. Every completed job builds your reviews and grows your visibility on the platform.' },
];

const testimonials = [
  {
    name: 'Michael Torres',
    role: 'Owner of 48\' Jeanneau Sun Odyssey',
    avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    rating: 5,
    text: 'Yachtworx completely transformed how I manage my boat. Finding a qualified rigger used to take days of phone calls. Now I get three quotes within hours. The digital twin alone is worth the subscription.',
  },
  {
    name: 'Patricia Langford',
    role: 'Owner of 62\' Hatteras Motor Yacht',
    avatar: 'https://randomuser.me/api/portraits/women/35.jpg',
    rating: 5,
    text: 'I was skeptical at first, but after the first service request I was completely sold. My mechanic connected through Yachtworx, has been incredible, and I now have a complete digital service record for the boat.',
  },
  {
    name: 'David Kim',
    role: 'Liveaboard on Lagoon 450 Catamaran',
    avatar: 'https://randomuser.me/api/portraits/men/61.jpg',
    rating: 5,
    text: 'As a liveaboard, keeping up with maintenance is critical. The automated alerts and service history feature means I never forget anything. This app is essential for serious sailors.',
  },
];

const StatItem: React.FC<{ value: number; label: string; prefix?: string; suffix?: string; startCount: boolean }> = ({
  value, label, prefix = '', suffix = '', startCount
}) => {
  const count = useCountUp(value, 2000, startCount);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-heading font-bold text-white mb-2">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-white/60 text-sm font-medium">{label}</div>
    </div>
  );
};

export const Landing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'owners' | 'providers'>('owners');
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, #1A6B9A 0%, transparent 50%),
                               radial-gradient(circle at 80% 20%, #0D9B8A 0%, transparent 50%),
                               radial-gradient(circle at 50% 50%, #C9943A 0%, transparent 60%)`
            }}
          />
          {/* Wave SVG */}
          <svg className="absolute bottom-0 left-0 right-0 text-gray-50 fill-current" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,60 C360,120 720,0 1080,60 C1260,90 1350,30 1440,60 L1440,120 L0,120 Z" />
          </svg>
        </div>

        {/* Yacht silhouette */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <svg viewBox="0 0 800 400" className="w-full max-w-4xl" fill="white">
            <path d="M400 50 L100 300 L700 300 Z" />
            <path d="M400 80 L420 300 L380 300 Z" />
            <path d="M150 300 L650 300 L680 340 L120 340 Z" />
            <line x1="400" y1="50" x2="400" y2="340" stroke="white" strokeWidth="3"/>
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm px-4 py-2 rounded-full mb-8 font-medium">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              Now serving 12,400+ vessels in 48 states
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white leading-tight mb-6">
              Yacht Management,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-ocean-300">
                Reimagined
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
              The intelligent platform connecting yacht owners with elite marine professionals. Digital twin technology, smart maintenance alerts, and a marketplace of 2,800+ verified specialists.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard" className="btn-hero text-base px-8 py-4">
                Start Free Trial
                <ArrowRight size={18} />
              </Link>
              <Link to="/for-providers" className="btn-ghost text-base px-8 py-4">
                For Service Providers
                <ChevronRight size={18} />
              </Link>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8"
          >
            {[
              { value: '2,847', label: 'Verified Providers' },
              { value: '12,400+', label: 'Boats Managed' },
              { value: '98.2%', label: 'Satisfaction Rate' },
              { value: '$2.4M', label: 'Saved for Owners' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-heading font-bold text-white">{stat.value}</div>
                <div className="text-xs sm:text-sm text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="ocean" className="mb-4">Platform Features</Badge>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-navy-500 mb-4">
              Everything your fleet needs
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From single-vessel owners to multi-boat fleets, Yachtworx delivers the tools to keep your investment protected and your time on the water maximized.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-6`}>
                  <feature.icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-heading font-semibold text-navy-500 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-24 bg-navy-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-ocean-gradient opacity-50" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold text-white mb-4">
              The numbers speak for themselves
            </h2>
            <p className="text-white/60 text-lg">Trusted by yacht owners and service professionals across the country</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem value={platformStats.providers} label="Verified Providers" startCount={statsInView} />
            <StatItem value={platformStats.boatsManaged} label="Boats Managed" suffix="+" startCount={statsInView} />
            <StatItem value={Math.floor(platformStats.satisfactionRate)} label="Satisfaction Rate" suffix="%" startCount={statsInView} />
            <StatItem value={2} label="Saved for Owners" prefix="$" suffix=".4M" startCount={statsInView} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="teal" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-navy-500 mb-4">
              Up and running in minutes
            </h2>
          </motion.div>

          {/* Tab toggle */}
          <div className="flex justify-center mb-12">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab('owners')}
                className={`px-6 py-3 rounded-lg text-sm font-heading font-semibold transition-all ${
                  activeTab === 'owners'
                    ? 'bg-white text-navy-500 shadow-sm'
                    : 'text-gray-500 hover:text-navy-500'
                }`}
              >
                For Boat Owners
              </button>
              <button
                onClick={() => setActiveTab('providers')}
                className={`px-6 py-3 rounded-lg text-sm font-heading font-semibold transition-all ${
                  activeTab === 'providers'
                    ? 'bg-white text-navy-500 shadow-sm'
                    : 'text-gray-500 hover:text-navy-500'
                }`}
              >
                For Service Providers
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(activeTab === 'owners' ? ownerSteps : providerSteps).map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-gray-200 z-0" style={{ width: 'calc(100% - 2rem)', left: 'calc(50% + 2rem)' }} />
                )}
                <div className="relative text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-500 to-teal-500 text-white font-heading font-bold text-xl mb-6 shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-navy-500 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Providers */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4"
          >
            <div>
              <Badge variant="gold" className="mb-3">Trusted Professionals</Badge>
              <h2 className="text-4xl font-heading font-bold text-navy-500">
                Top-rated providers near you
              </h2>
            </div>
            <Link to="/marketplace" className="btn-outline whitespace-nowrap">
              View All Providers <ArrowRight size={16} />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockProviders.filter(p => p.featured).map((provider, i) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <Avatar src={provider.avatar} alt={provider.name} size="lg" fallback={provider.name} />
                  {provider.verified && (
                    <div className="p-1.5 bg-teal-50 rounded-lg">
                      <CheckCircle size={14} className="text-teal-500" />
                    </div>
                  )}
                </div>
                <h3 className="font-heading font-semibold text-navy-500 text-sm">{provider.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{provider.businessName}</p>
                <div className="flex items-center gap-1.5 mb-3">
                  <StarRating rating={provider.rating} size="sm" />
                  <span className="text-xs font-semibold text-navy-500">{provider.rating}</span>
                  <span className="text-xs text-gray-400">({provider.reviewCount})</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                  <MapPin size={11} />
                  <span>{provider.distance} mi away</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {provider.categories.slice(0, 2).map((cat) => (
                    <span key={cat} className="text-xs bg-ocean-50 text-ocean-600 px-2 py-0.5 rounded-full">
                      {cat}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="ocean" className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl font-heading font-bold text-navy-500 mb-4">
              Trusted by yacht owners everywhere
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-100"
              >
                <StarRating rating={t.rating} size="sm" className="mb-4" />
                <p className="text-gray-600 leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <Avatar src={t.avatar} alt={t.name} size="md" />
                  <div>
                    <p className="font-semibold text-navy-500 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, #0D9B8A 0%, transparent 50%),
                             radial-gradient(circle at 70% 50%, #C9943A 0%, transparent 50%)`
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-6">
              Ready to transform your<br />fleet management?
            </h2>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Join thousands of yacht owners who have discovered a better way to protect their investment and enjoy more time on the water.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard" className="btn-gold text-base px-8 py-4">
                Get Started Free
                <ArrowRight size={18} />
              </Link>
              <Link to="/marketplace" className="btn-ghost text-base px-8 py-4">
                Explore Marketplace
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/50">No credit card required. 14-day free trial.</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
