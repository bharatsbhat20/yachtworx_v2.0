import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, DollarSign, Calendar, Star, ArrowRight, CheckCircle,
  TrendingUp, Shield, Zap, ChevronRight
} from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { StarRating } from '../components/ui/StarRating';

const benefits = [
  {
    icon: Users,
    title: 'More Clients',
    description: 'Get discovered by thousands of yacht owners in your area actively searching for your expertise.',
    gradient: 'from-ocean-500 to-ocean-600',
  },
  {
    icon: Calendar,
    title: 'Easy Scheduling',
    description: 'Manage your calendar, accept bookings, and coordinate jobs all from one intuitive dashboard.',
    gradient: 'from-teal-500 to-teal-600',
  },
  {
    icon: Shield,
    title: 'Payment Protection',
    description: 'Secure, guaranteed payments. Get paid automatically when jobs are marked complete. No chasing invoices.',
    gradient: 'from-navy-400 to-navy-600',
  },
  {
    icon: Star,
    title: 'Build Your Reputation',
    description: 'Collect verified reviews from real clients. A strong rating profile drives more inquiries and higher rates.',
    gradient: 'from-gold-400 to-gold-500',
  },
];

const providerSteps = [
  { num: '01', title: 'Create your profile', description: 'List your services, certifications, and past work. Takes 10 minutes. Your profile starts appearing in searches immediately.' },
  { num: '02', title: 'Receive job requests', description: 'Get instant notifications when boat owners need your expertise. Review jobs, submit quotes, and win work on your terms.' },
  { num: '03', title: 'Complete & get paid', description: 'Do great work, collect a verified review, and receive automatic payment. Build your reputation month by month.' },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 0,
    period: 'Free forever',
    description: 'Perfect for getting started and testing the platform',
    features: [
      'Profile listing',
      'Up to 5 active quotes',
      '3 completed jobs/month',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get Started Free',
    variant: 'outline' as const,
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 29,
    period: 'per month',
    description: 'For established professionals growing their client base',
    features: [
      'Everything in Starter',
      'Unlimited quotes & jobs',
      'Priority listing placement',
      'Advanced analytics',
      'Client messaging',
      'Invoice management',
      'Phone & email support',
    ],
    cta: 'Start 14-Day Trial',
    variant: 'ocean' as const,
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    period: 'per month',
    description: 'For boatyards and multi-technician operations',
    features: [
      'Everything in Professional',
      'Multi-technician accounts',
      'Fleet contract management',
      'Custom branded profile',
      'API access',
      'Dedicated account manager',
      '24/7 priority support',
    ],
    cta: 'Contact Sales',
    variant: 'navy' as const,
    highlighted: false,
  },
];

const testimonials = [
  {
    name: 'Marcus Chen',
    role: 'Marine Mechanic, 18 years',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    rating: 5,
    text: 'Yachtworx completely transformed my business. I went from spending hours on the phone to having a full calendar with qualified leads. My revenue is up 40% this year.',
  },
  {
    name: 'Jennifer Park',
    role: 'Yacht Detailer & Varnisher',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    rating: 5,
    text: 'The quality of clients on Yachtworx is exceptional. These are serious boat owners who value professional work. I\'ve built relationships with clients who are now on annual maintenance plans.',
  },
  {
    name: 'Diego Ramirez',
    role: 'Professional Rigger',
    avatar: 'https://randomuser.me/api/portraits/men/56.jpg',
    rating: 5,
    text: 'I was skeptical about another platform, but Yachtworx is genuinely different. The digital boat profiles mean clients have all their vessel info ready before I even arrive. It saves me hours.',
  },
];

export const ProviderLanding: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #082B38 0%, #0E4057 40%, #0D9B8A 100%)'
        }} />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 80% 20%, #C9943A 0%, transparent 40%),
                             radial-gradient(circle at 20% 80%, #1A6B9A 0%, transparent 40%)`
          }}
        />
        <svg className="absolute bottom-0 text-gray-50 fill-current" viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: '100%' }}>
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1350,20 1440,40 L1440,80 L0,80 Z" />
        </svg>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-500/30 text-teal-300 text-sm px-4 py-2 rounded-full mb-8 font-medium">
              <Zap size={14} className="fill-current" />
              Join 2,847 verified marine professionals
            </div>
            <h1 className="text-5xl sm:text-6xl font-heading font-bold text-white mb-6 leading-tight">
              Grow Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-ocean-300">
                Marine Business
              </span>
            </h1>
            <p className="text-xl text-white/70 mb-8 leading-relaxed">
              Connect with thousands of yacht owners actively searching for your expertise. Manage bookings, build your reputation, and grow your client base — all in one platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register-provider" className="btn-gold text-base px-8 py-4">
                Register Now — Free
                <ArrowRight size={18} />
              </Link>
              <Link to="/marketplace" className="btn-ghost text-base px-8 py-4">
                See How It Works
              </Link>
            </div>
            <div className="flex gap-6 mt-8">
              {[
                { value: '2,847', label: 'Active Providers' },
                { value: '$4.2k', label: 'Avg. Monthly Revenue' },
                { value: '4.8★', label: 'Provider Satisfaction' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-xl font-heading font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8">
              <p className="text-white/60 text-sm font-medium mb-6">Provider Dashboard Preview</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'This Month', value: '$4,280', icon: DollarSign },
                  { label: 'Active Jobs', value: '7', icon: Calendar },
                  { label: 'Profile Views', value: '284', icon: Users },
                  { label: 'Rating', value: '4.9 ★', icon: Star },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/10 rounded-2xl p-4">
                    <stat.icon size={18} className="text-teal-400 mb-2" />
                    <p className="text-xl font-heading font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-white/50">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {['Annual Engine Service - Sea Breeze', 'Hull Cleaning - Nautilus', 'Rigging Inspection - Blue Horizon'].map((job, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-teal-400' : i === 1 ? 'bg-gold-400' : 'bg-ocean-400'}`} />
                    <span className="text-sm text-white/80 truncate">{job}</span>
                    <ChevronRight size={14} className="text-white/40 ml-auto flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="teal" className="mb-4">Why Yachtworx</Badge>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-navy-500 mb-4">
              Built for marine professionals
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              We built Yachtworx with input from hundreds of service providers. Every feature is designed to save you time and help you earn more.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${b.gradient} mb-5`}>
                  <b.icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-heading font-semibold text-navy-500 mb-3">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="ocean" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl font-heading font-bold text-navy-500 mb-4">
              Start earning in 3 simple steps
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {providerSteps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-ocean-500 text-white font-heading font-bold text-xl mb-6 shadow-lg">
                  {step.num}
                </div>
                <h3 className="text-xl font-heading font-semibold text-navy-500 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="gold" className="mb-4">Pricing</Badge>
            <h2 className="text-4xl font-heading font-bold text-navy-500 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-500">Start free. Scale as you grow. Cancel anytime.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-3xl p-8 ${plan.highlighted
                  ? 'bg-gradient-to-br from-navy-500 to-ocean-600 text-white ring-4 ring-ocean-500 ring-offset-4 scale-105'
                  : 'bg-white border border-gray-100 shadow-sm'
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center gap-1 bg-gold-500 text-navy-500 text-xs font-bold px-3 py-1 rounded-full mb-4">
                    <TrendingUp size={12} /> Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-heading font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-navy-500'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-white/70' : 'text-gray-400'}`}>
                  {plan.description}
                </p>
                <div className="mb-8">
                  <span className={`text-5xl font-heading font-bold ${plan.highlighted ? 'text-white' : 'text-navy-500'}`}>
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className={`text-sm ml-1 ${plan.highlighted ? 'text-white/60' : 'text-gray-400'}`}>
                      /{plan.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2.5">
                      <CheckCircle size={16} className={plan.highlighted ? 'text-teal-300' : 'text-teal-500'} />
                      <span className={`text-sm ${plan.highlighted ? 'text-white/80' : 'text-gray-600'}`}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register-provider"
                  className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-heading font-semibold text-sm transition-all ${
                    plan.highlighted
                      ? 'bg-white text-navy-500 hover:bg-gray-100'
                      : plan.variant === 'navy'
                      ? 'bg-navy-500 text-white hover:bg-navy-600'
                      : 'border-2 border-ocean-500 text-ocean-500 hover:bg-ocean-50'
                  }`}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-heading font-bold text-navy-500 mb-4">
              Providers love Yachtworx
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-100"
              >
                <StarRating rating={t.rating} className="mb-4" />
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
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #082B38 0%, #0E4057 40%, #0D9B8A 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-6">
              Ready to grow your<br />marine business?
            </h2>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Join over 2,800 marine professionals already using Yachtworx to connect with clients, manage their business, and earn more.
            </p>
            <Link to="/register-provider" className="btn-gold text-lg px-10 py-5">
              Create Free Provider Account
              <ArrowRight size={20} />
            </Link>
            <p className="mt-4 text-sm text-white/50">No credit card required. Free account available.</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
