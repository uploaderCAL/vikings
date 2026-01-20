import React from 'react';
import { UI_STRINGS } from '../constants/index';

/**
 * Vegas Layout
 *
 * Regras respeitadas:
 * - NÃO desloga em sleep / background
 * - NÃO reage a reload
 * - Reset SOMENTE por:
 *   - botão explícito
 *   - fechar aba / app
 *   - fim da noite (via hook)
 */

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDebug?: boolean;
}

function resetVegasSession() {
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  // força voltar para onboarding
  window.location.reload();
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  isDebug
}) => (
  <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl overflow-hidden relative">
    {isDebug && (
      <div className="bg-blue-600 text-white text-[10px] font-bold text-center py-0.5 uppercase tracking-tighter z-50">
        MODO DE HOMOLOGAÇÃO
      </div>
    )}

    {/* HEADER */}
    <header className="bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Vikings Pub
        </h1>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          O que acontece aqui, fica aqui
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            Online
          </span>
        </div>

        {/* BOTÃO EXPLÍCITO DE RESET */}
        <button
          onClick={resetVegasSession}
          className="text-[10px] font-bold uppercase text-gray-400 hover:text-red-500 transition-colors"
        >
          Trocar avatar
        </button>
      </div>
    </header>

    {/* CONTEÚDO */}
    <main className="flex-1 overflow-y-auto bg-gray-50 pb-20">
      {children}
    </main>

    {/* NAV */}
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex justify-around p-2 shadow-sm z-10">
      <button
        onClick={() => onTabChange('people')}
        className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
          activeTab === 'people'
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-400'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">
          {UI_STRINGS.NAV_PEOPLE}
        </span>
      </button>

      <button
        onClick={() => onTabChange('chats')}
        className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
          activeTab === 'chats'
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-400'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">
          {UI_STRINGS.NAV_CHATS}
        </span>
      </button>
    </nav>
  </div>
);
