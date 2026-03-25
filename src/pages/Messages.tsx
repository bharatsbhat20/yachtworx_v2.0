import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Search, MoreVertical, Phone, Ship } from 'lucide-react';
import { mockConversations, mockMessages } from '../data/mockData';
import { Avatar } from '../components/ui/Avatar';
import { clsx } from 'clsx';

export const Messages: React.FC = () => {
  const [activeConv, setActiveConv] = useState(mockConversations[0].id);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversations = mockConversations.filter(c =>
    !search || c.participantNames.some(n => n.toLowerCase().includes(search.toLowerCase()))
  );

  const activeConversation = mockConversations.find(c => c.id === activeConv);
  const messages = mockMessages.filter(m => m.conversationId === activeConv);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessage('');
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatConvTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-screen bg-gray-50 pt-16 flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex gap-4 min-h-0">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-heading font-semibold text-navy-500 mb-3">Messages</h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-ocean-500/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              const providerName = conv.participantNames.find(n => n !== 'James Harrison') || conv.participantNames[1];
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv.id)}
                  className={clsx(
                    'w-full flex items-start gap-3 p-4 text-left transition-colors',
                    activeConv === conv.id ? 'bg-ocean-50' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar src={conv.avatar} alt={providerName} size="md" fallback={providerName} />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-ocean-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={clsx(
                        'text-sm truncate',
                        conv.unreadCount > 0 ? 'font-heading font-semibold text-navy-500' : 'font-medium text-navy-500'
                      )}>
                        {providerName}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatConvTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className={clsx(
                      'text-xs truncate',
                      conv.unreadCount > 0 ? 'text-navy-500 font-medium' : 'text-gray-400'
                    )}>
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Chat View */}
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-0"
        >
          {activeConversation && (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                {(() => {
                  const providerName = activeConversation.participantNames.find(n => n !== 'James Harrison') || activeConversation.participantNames[1];
                  return (
                    <>
                      <Avatar src={activeConversation.avatar} alt={providerName} size="md" fallback={providerName} />
                      <div className="flex-1">
                        <p className="font-heading font-semibold text-navy-500">{providerName}</p>
                        {activeConversation.relatedRequestId && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Ship size={11} />
                            Related to service request
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-navy-500 hover:bg-gray-100 rounded-xl transition-colors">
                          <Phone size={16} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-navy-500 hover:bg-gray-100 rounded-xl transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === 'user-1';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx('flex gap-3', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      {!isOwn && (
                        <Avatar
                          src={activeConversation.avatar}
                          alt={msg.senderName}
                          size="sm"
                          fallback={msg.senderName}
                          className="flex-shrink-0 mt-1"
                        />
                      )}
                      <div className={clsx('max-w-sm', isOwn ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
                        <div
                          className={clsx(
                            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                            isOwn
                              ? 'bg-ocean-500 text-white rounded-br-md'
                              : 'bg-gray-100 text-navy-500 rounded-bl-md'
                          )}
                        >
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    className="flex-1 bg-transparent text-sm text-navy-500 placeholder-gray-400 focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    className={clsx(
                      'p-2 rounded-lg transition-colors',
                      message.trim()
                        ? 'bg-ocean-500 text-white hover:bg-ocean-600'
                        : 'text-gray-300 cursor-not-allowed'
                    )}
                    disabled={!message.trim()}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
