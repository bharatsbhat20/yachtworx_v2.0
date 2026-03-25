import React from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-ocean-500 to-teal-500 rounded-xl">
                <Anchor size={18} className="text-white" />
              </div>
              <span className="font-heading font-bold text-xl">
                Yacht<span className="text-teal-400">worx</span>
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              The all-in-one platform for yacht owners and marine service providers. Manage your fleet, find trusted professionals, and keep your boats in peak condition.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="p-2.5 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Dashboard', to: '/dashboard' },
                { label: 'Marketplace', to: '/marketplace' },
                { label: 'Service Requests', to: '/requests' },
                { label: 'Document Vault', to: '/documents' },
                { label: 'Messages', to: '/messages' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Providers */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">
              For Providers
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Why Yachtworx?', to: '/for-providers' },
                { label: 'Register as Provider', to: '/register-provider' },
                { label: 'Provider Dashboard', to: '/provider-dashboard' },
                { label: 'Pricing Plans', to: '/for-providers' },
                { label: 'Success Stories', to: '/for-providers' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-white/60">
                <Mail size={14} className="text-teal-400 flex-shrink-0" />
                hello@yachtworx.io
              </li>
              <li className="flex items-center gap-2.5 text-sm text-white/60">
                <Phone size={14} className="text-teal-400 flex-shrink-0" />
                +1 (310) 555-0127
              </li>
              <li className="flex items-start gap-2.5 text-sm text-white/60">
                <MapPin size={14} className="text-teal-400 flex-shrink-0 mt-0.5" />
                1234 Harbor Blvd, Suite 500<br />Marina del Rey, CA 90292
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} Yachtworx Technologies, Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link) => (
              <a key={link} href="#" className="text-xs text-white/40 hover:text-white/70 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
