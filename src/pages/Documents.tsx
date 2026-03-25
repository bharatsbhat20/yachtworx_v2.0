import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Search, FileText, Shield, Wrench, BookOpen, ClipboardCheck, Filter } from 'lucide-react';
import { mockDocuments } from '../data/mockData';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

const docCategories = ['All', 'Registration', 'Insurance', 'Maintenance', 'Survey', 'Manual'];

const categoryConfig = {
  Registration: { icon: ClipboardCheck, color: 'bg-ocean-100 text-ocean-600', emoji: '📋' },
  Insurance: { icon: Shield, color: 'bg-teal-100 text-teal-600', emoji: '🛡️' },
  Maintenance: { icon: Wrench, color: 'bg-gold-100 text-gold-600', emoji: '🔧' },
  Survey: { icon: FileText, color: 'bg-purple-100 text-purple-600', emoji: '🔍' },
  Manual: { icon: BookOpen, color: 'bg-navy-100 text-navy-600', emoji: '📖' },
};

const boatNames: Record<string, string> = {
  'boat-1': 'Sea Breeze',
  'boat-2': 'Nautilus',
  'boat-3': 'Blue Horizon',
};

export const Documents: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBoat, setSelectedBoat] = useState('All');

  const filtered = mockDocuments.filter(doc => {
    const matchesSearch = !search || doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.type === selectedCategory;
    const matchesBoat = selectedBoat === 'All' || doc.boatId === selectedBoat;
    return matchesSearch && matchesCategory && matchesBoat;
  });

  const categoryCounts = docCategories.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? mockDocuments.length : mockDocuments.filter(d => d.type === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-navy-500 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-heading font-bold text-white mb-2">Document Vault</h1>
              <p className="text-white/60">Secure storage for all your vessel documentation</p>
            </motion.div>
            <button className="btn-gold text-sm py-2.5 px-5">
              <Upload size={16} /> Upload Document
            </button>
          </div>

          <div className="mt-6 flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                leftIcon={<Search size={16} />}
                className="bg-white"
              />
            </div>
            <select
              value={selectedBoat}
              onChange={e => setSelectedBoat(e.target.value)}
              className="px-4 py-2.5 rounded-xl border-0 bg-white text-navy-500 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500/30"
            >
              <option value="All">All Vessels</option>
              <option value="boat-1">Sea Breeze</option>
              <option value="boat-2">Nautilus</option>
              <option value="boat-3">Blue Horizon</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-8">
          {docCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-navy-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {categoryCounts[cat]}
              </span>
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Documents', value: mockDocuments.length, icon: FileText },
            { label: 'Vessels Covered', value: 3, icon: Shield },
            { label: 'Expiring Soon', value: 1, icon: Filter },
            { label: 'Storage Used', value: '68 MB', icon: Upload },
          ].map(stat => (
            <Card key={stat.label} padding="sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-ocean-50 rounded-lg">
                  <stat.icon size={18} className="text-ocean-500" />
                </div>
                <div>
                  <p className="text-xl font-heading font-bold text-navy-500">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Documents Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((doc, i) => {
              const config = categoryConfig[doc.type as keyof typeof categoryConfig];
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover className="group">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-xl text-2xl flex-shrink-0`}>
                        {config?.emoji || '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-heading font-semibold text-navy-500 leading-snug mb-1 line-clamp-2">
                          {doc.name}
                        </h3>
                        <Badge variant="gray" className="text-xs">{doc.type}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Vessel</span>
                        <span className="font-medium text-navy-500">{doc.boatId ? boatNames[doc.boatId] : 'Fleet'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Uploaded</span>
                        <span className="font-medium text-navy-500">
                          {new Date(doc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Size</span>
                        <span className="font-medium text-navy-500">{doc.size}</span>
                      </div>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 text-sm text-ocean-500 hover:text-ocean-600 font-medium py-2 rounded-xl hover:bg-ocean-50 transition-colors border border-ocean-100">
                      <Download size={14} /> Download
                    </button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-heading font-semibold text-navy-500 mb-2">No documents found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or upload new documents</p>
            <button className="btn-ocean">
              <Upload size={16} /> Upload Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
