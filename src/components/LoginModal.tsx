import React, { useState } from 'react';
import type { User, DashboardData } from '../types';

interface LoginModalProps {
  data: DashboardData;
  onLogin: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ data, onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleLogin = () => {
    const user = data.users.find(u => u.id === selectedUserId);
    if (user) {
      onLogin(user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full mx-4">
        <h2 className="text-2xl font-extrabold mb-6 text-[#1a202c] leading-tight">
          Bienvenue sur T2<br/>Dashboard
        </h2>
        <p className="mb-4 text-gray-600 text-sm">
          Veuillez sélectionner votre nom pour continuer :
        </p>

        <select
          className="w-full p-3 mb-6 bg-gray-50 border border-gray-200 rounded-md text-gray-800 focus:ring-2 focus:ring-[#94a3b8] outline-none"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">-- Sélectionnez un utilisateur --</option>
          {data.users.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>

        <button
          onClick={handleLogin}
          disabled={!selectedUserId}
          className="w-full py-3 px-4 bg-[#94a3b8] hover:bg-[#64748b] disabled:opacity-50 text-white font-bold rounded-md transition-colors"
        >
          Accéder au Dashboard
        </button>
      </div>
    </div>
  );
};

export default LoginModal;
