import React from 'react';
import { Thread, User } from '../types/index';
import { UI_STRINGS } from '../constants/index';

interface ChatViewProps {
  nightConfig: { isNightOn: boolean };
  thread?: Thread | null;
  pendingUser?: User | null;  // usuário selecionado mas ainda sem thread
  users: User[];
  currentUserId: string;
  onBack: () => void;
  onBlock: (userId: string) => void;
  onSendMessage: (text: string) => void;
  onAccept: (threadId: string) => void;
  onAddReaction: (msgId: string, reaction: string) => void;
  reactionMenuMsgId: string | null;
  setReactionMenuMsgId: (id: string | null) => void;
  handleMessageTouchStart: (id: string) => void;
  handleMessageTouchEnd: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  nightConfig,
  thread,
  pendingUser,
  users,
  currentUserId,
  onBack,
  onBlock,
  onSendMessage,
  onAccept,
  onAddReaction,
  reactionMenuMsgId,
  setReactionMenuMsgId,
  handleMessageTouchStart,
  handleMessageTouchEnd
}) => {
  /* ===========================
     BLOQUEIO GLOBAL
     =========================== */
  if (!nightConfig?.isNightOn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white max-w-md mx-auto">
        <div className="text-sm text-gray-500 font-medium text-center px-6">
          O chat está offline no momento.<br />
          Aguarde o administrador ativar o sistema.
        </div>
      </div>
    );
  }

  /* ===========================
     PROTEÇÃO CRÍTICA - permite pendingUser sem thread
     =========================== */
  const isPendingMode = !thread && !!pendingUser;

  if (!thread && !pendingUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white max-w-md mx-auto">
        <div className="text-sm text-gray-500 font-medium">
          Carregando conversa…
        </div>
      </div>
    );
  }

  const otherId = isPendingMode
    ? pendingUser?.id
    : thread?.participants?.find(id => id !== currentUserId);

  /* ===========================
     USUÁRIO ESTÁVEL (ONLINE)
     =========================== */
  const stableOtherUser = React.useMemo(() => {
    if (!otherId) return null;
    return users.find(u => u.id === otherId) || null;
  }, [users, otherId]);

  /* ===========================
     STORAGE SAFE HELPERS
     =========================== */
  const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  const STORAGE_KEY = otherId ? `chat_user_${otherId}` : null;

  const safeSetStorage = React.useCallback((key: string, value: string) => {
    if (!canUseStorage) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }, [canUseStorage]);

  const safeGetStorage = React.useCallback((key: string) => {
    if (!canUseStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [canUseStorage]);

  /* ===========================
     SALVA SNAPSHOT (quando tiver online)
     =========================== */
  React.useEffect(() => {
  if (!stableOtherUser || !STORAGE_KEY) return;

  // 🔒 só salva se vier do perfil real
  const realAvatar = (stableOtherUser as any).avatar?.trim() || (stableOtherUser as any).avatar_url?.trim();
  const realName = stableOtherUser.nickname?.trim();

  if (!realAvatar && !realName) return;

  const snapshot = {
    nickname: realName || '',
    avatar_url: realAvatar || ''
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}, [stableOtherUser, STORAGE_KEY]);

  /* ===========================
     AVATAR + NOME (com fallback)
     =========================== */
  const [avatarSrc, setAvatarSrc] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string>('Usuário');

 React.useEffect(() => {
  // 1️⃣ prioridade: perfil real vindo do banco
  if (stableOtherUser) {
    const realAvatar = (stableOtherUser as any).avatar?.trim() || (stableOtherUser as any).avatar_url?.trim();
    const realName = stableOtherUser.nickname?.trim();

    if (realAvatar) setAvatarSrc(realAvatar);
    if (realName) setDisplayName(realName);

    return;
  }

  // 2️⃣ fallback: snapshot salvo
  if (STORAGE_KEY) {
    const cached = safeGetStorage(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        if (parsed?.avatar_url?.trim()) {
          setAvatarSrc(parsed.avatar_url);
        }

        if (parsed?.nickname?.trim()) {
          setDisplayName(parsed.nickname);
        }
      } catch {
        // ignore
      }
    }
  }
}, [stableOtherUser, STORAGE_KEY, safeGetStorage]);


  /* ===========================
     STATUS VISUAL
     =========================== */
  const isOnline = users.some(u => u.id === otherId);

  return (
    <div className="flex flex-col h-[100dvh] bg-white fixed inset-0 z-50 max-w-md mx-auto">
      {/* HEADER */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 p-2 rounded-full hover:bg-gray-100"
          >
            ←
          </button>

          {/* AVATAR + STATUS */}
          <div className="relative mr-3 flex items-center gap-2">
            {/* AVATAR */}
            {avatarSrc ? (
              <img
                src={avatarSrc}
                className="w-8 h-8 rounded-full object-cover"
                draggable={false}
                alt=""
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-700 select-none">
                {displayName.trim().charAt(0).toUpperCase()}
              </div>
            )}

            {/* STATUS */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>

          {/* NOME */}
          <div className="flex flex-col">
            <span className="text-sm font-bold">
              {displayName}
            </span>

            {thread?.isOtherTyping && (
              <span className="text-[10px] text-blue-500 animate-pulse">
                digitando...
              </span>
            )}
          </div>
        </div>

        {otherId && (
          <button
            onClick={() => onBlock(otherId)}
            className="text-[10px] text-red-500 font-bold"
          >
            BLOQUEAR
          </button>
        )}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {isPendingMode ? (
          /* Modo pendente - sem thread ainda, mostra convite para iniciar conversa */
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <p className="text-sm mb-2">Inicie uma conversa com {displayName}</p>
            <p className="text-xs">Envie uma mensagem para começar!</p>
          </div>
        ) : thread?.status === 'pending' && thread?.participants[1] === currentUserId ? (
          <div className="bg-white p-6 rounded-xl border text-center space-y-4">
            <p className="text-sm text-gray-600">
              Você recebeu uma solicitação
            </p>
            <button
              onClick={() => onAccept(thread.id)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
            >
              ACEITAR
            </button>
          </div>
        ) : (
          thread?.messages?.map(msg => (
            <div
              key={msg.id}
              className={`flex ${
                msg.senderId === currentUserId
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                onMouseDown={() => handleMessageTouchStart(msg.id)}
                onMouseUp={handleMessageTouchEnd}
                onTouchStart={() => handleMessageTouchStart(msg.id)}
                onTouchEnd={handleMessageTouchEnd}
                onDoubleClick={() => onAddReaction(msg.id, '❤️')}
                className={`max-w-[80%] p-3 rounded-xl text-sm ${
                  msg.senderId === currentUserId
                    ? 'bg-black text-white'
                    : 'bg-white border'
                } ${msg.isPending ? 'opacity-50' : ''}`}
              >
                {msg.text}

                {msg.reaction && (
                  <div className="text-xs mt-1">{msg.reaction}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* INPUT - sempre mostra no modo pendente ou quando tem permissão */}
      {(isPendingMode ||
        thread?.status === 'accepted' ||
        (thread?.status === 'pending' && thread?.participants[0] === currentUserId)) ? (
        <div className="p-4 border-t flex space-x-2">
          <input
            className="flex-1 border rounded-lg p-3 text-base"
            placeholder="Digite uma mensagem…"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                onSendMessage(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <button
            className="px-4 bg-black text-white rounded-lg"
            onClick={e => {
              const input =
                e.currentTarget.previousElementSibling as HTMLInputElement;
              if (input?.value.trim()) {
                onSendMessage(input.value);
                input.value = '';
              }
            }}
          >
            Enviar
          </button>
        </div>
      ) : (
        <div className="p-4 text-center text-[10px] text-gray-400">
          {UI_STRINGS.REQUEST_PENDING}
        </div>
      )}

      {reactionMenuMsgId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setReactionMenuMsgId(null)}
        />
      )}
    </div>
  );
};
