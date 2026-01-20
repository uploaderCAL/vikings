import React from 'react';
import { User } from '../types/index';

interface PeopleListProps {
  users: User[];
  onStartChat: (user: User) => void;
  isDebug?: boolean;
  onMockUsers?: () => void;
}

/**
 * 🔒 Persistência de ordem de usuários
 * - evita flicker
 * - evita troca de posição
 * - mantém ordem de entrada
 */
const STORAGE_KEY = 'people_order_v1';

export const PeopleList: React.FC<PeopleListProps> = ({
  users,
  onStartChat,
  isDebug,
  onMockUsers
}) => {
  const orderRef = React.useRef<Map<string, number>>(new Map());

  /**
   * 🔁 Carrega ordem persistida
   */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: [string, number][] = JSON.parse(raw);
      orderRef.current = new Map(parsed);
    } catch {
      // ignora corrupção
    }
  }, []);

  /**
   * 💾 Salva novos usuários na ordem
   */
  React.useEffect(() => {
    let changed = false;

    users.forEach(user => {
      if (!orderRef.current.has(user.id)) {
        orderRef.current.set(user.id, orderRef.current.size);
        changed = true;
      }
    });

    if (changed) {
      try {
        const serialized = JSON.stringify(
          Array.from(orderRef.current.entries())
        );
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch {
        // ignore
      }
    }
  }, [users]);

  /**
   * 🧠 Lista estável e ordenada
   */
  const stableUsers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      const aIndex = orderRef.current.get(a.id);
      const bIndex = orderRef.current.get(b.id);

      if (aIndex == null && bIndex == null) return 0;
      if (aIndex == null) return 1;
      if (bIndex == null) return -1;

      return aIndex - bIndex;
    });
  }, [users]);

  return (
    <div className="p-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-xl font-bold text-gray-900">
          Presentes Agora
        </h2>

        <div className="flex items-center space-x-2">
          {isDebug && (
            <button
              onClick={onMockUsers}
              className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold uppercase"
            >
              Mock +5
            </button>
          )}

          <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {stableUsers.length} Online
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stableUsers.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-gray-400 text-xs font-medium bg-white rounded-3xl border border-dashed">
            Ninguém com seu filtro está online agora.
          </div>
        ) : (
          stableUsers.map(user => (
            <div
              key={user.id}
              className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center"
            >
              <div className="relative mb-3 w-28 h-28 rounded-2xl overflow-hidden shadow-lg">
            <img
              src={user.avatar}
              className="w-full h-full object-cover"
              alt=""
              draggable={false}
            />

            {/* gradiente de destaque */}
            <div className="absolute inset-0 ring-1 ring-white/60 rounded-2xl" />

            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-1 border-white rounded-full" />
          </div>


              <h3 className="font-bold text-gray-900 truncate w-full text-sm">
                {user.nickname}
              </h3>

              <button
                onClick={() => onStartChat(user)}
                className="bg-gray-900 text-white w-full py-2.5 mt-4 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              >
                CONVERSAR
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
