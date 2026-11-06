import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare } from 'lucide-react';
import type { User, ChatMessage } from '../types';
import { fetchChat, sendChat } from '../api';

interface ChatBoxProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ user, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Poll for messages every 3 seconds
    const interval = setInterval(async () => {
      const msgs = await fetchChat();
      setMessages(msgs);
    }, 3000);

    // Initial fetch
    fetchChat().then(setMessages);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      user: user.name,
      text: newMessage,
      timestamp: new Date().toISOString()
    };

    // Optimistic update
    setMessages([...messages, msg]);
    await sendChat(msg);
    setNewMessage('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-96 bg-[#181818] shadow-2xl border-l border-gray-800 z-50 flex flex-col"
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-indigo-600 text-white">
            <h2 className="font-bold flex items-center gap-2">
              <MessageSquare size={20} /> Discussion d'équipe
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141414] custom-scrollbar">
            {messages.map((msg) => {
              const isMe = msg.user === user.name;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-500 mb-1 px-1">{msg.user}</span>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    isMe
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-gray-800 border border-gray-700 rounded-tl-none shadow-sm text-gray-200'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-800 bg-[#181818]">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-indigo-500 focus:bg-black outline-none transition-all text-white placeholder-gray-500"
                placeholder="Écrire un message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatBox;
