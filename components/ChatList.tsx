import React from 'react';
import { Thread, User } from '../types/index';

interface ChatListProps {
  threads: Thread[];
  users: User[];
  currentUserId: string;
  onOpenChat: (threadId: string) => void;
  onAccept: (threadId: string) => void;
  onBlock: (userId: string) => void;
}

type CachedUser = {
  nickname?: string;
  avatar?: string;
  avatar_url?: string;
};

export const ChatList: React.FC<ChatListProps> = ({
  threads,
  users,
  currentUserId,
  onOpenChat,
  onAccept,
  onBlock
}) => {
  const canUseStorage =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  const safeGetStorage = (key: string) => {
    if (!canUseStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  return (
    <div className="p-4 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-6 px-1">
        Suas Mensagens
      </h2>

      {threads.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
          <p className="text-sm text-gray-400 font-medium px-6">
            Envie uma saudação para alguém interessante na aba de Pessoas!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => {
            const otherId = thread.participants.find(
              id => id !== currentUserId
            );

            const otherUser: User | CachedUser | null =
              users.find(u => u.id === otherId) ||
              (() => {
                if (!otherId) return null;
                const cached = safeGetStorage(`chat_user_${otherId}`);
                if (!cached) return null;
                try {
                  return JSON.parse(cached) as CachedUser;
                } catch {
                  return null;
                }
              })();

            const lastMsg =
              thread.messages && thread.messages.length > 0
                ? thread.messages[thread.messages.length - 1]
                : null;

            const hasUnread =
              !!lastMsg && lastMsg.senderId !== currentUserId;

            const isRecipient = thread.participants[1] === currentUserId;
            const isPending = thread.status === 'pending';

            const name = (otherUser as any)?.nickname || 'Usuário';
            const avatar =
              (otherUser as any)?.avatar ||
              (otherUser as any)?.avatar_url ||
              '';

            return (
              <div
                key={thread.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden hover:bg-gray-50 transition-colors"
              >
                <div
                  onClick={() => onOpenChat(thread.id)}
                  className="flex items-center p-4 cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="relative mr-4">
                    {avatar?.trim() ? (
                      <img
                        src={avatar}
                        className="w-12 h-12 rounded-full object-cover shadow-sm"
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-base font-bold text-gray-700 select-none shadow-sm">
                        {name.trim().charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* 🔴 Badge de mensagem não respondida */}
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate">
                      {name}
                    </h4>
                    <p className="text-xs truncate mt-0.5 text-gray-400">
                      {lastMsg?.text || ' '}
                    </p>
                  </div>
                </div>

                {/* Convite pendente */}
                {isPending && isRecipient && (
                  <div className="px-4 pb-4 flex space-x-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onAccept(thread.id);
                      }}
                      className="flex-1 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-xl shadow-sm"
                    >
                      ACEITAR
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (otherId) onBlock(otherId);
                      }}
                      className="px-4 py-2 text-gray-400 text-[10px] font-bold border rounded-xl"
                    >
                      IGNORAR
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
