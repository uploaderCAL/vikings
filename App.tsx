import React, { useState, useEffect, useRef } from 'react';
import {
  Gender,
  VisibilityPreference,
  User,
  Thread,
  NightConfig,
  Message
} from './types/index';
import { UI_STRINGS, MOCK_AVATARS } from './constants/index';
import { Haptics } from './utils/hapticUtils';

// Componentes Modularizados
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { PeopleList } from './components/PeopleList';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { AdminDashboard } from './components/AdminDashboard';

import { createClient } from '@supabase/supabase-js';

// ---------------------------
// Supabase client (REAL)
// ---------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase env vars missing");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ---------------------------
// Helpers: mapeamento DB <-> UI
// ---------------------------
type NightConfigRow = {
  id: number;
  is_night_on: boolean;
  active_wifi_ssid: string | null;
  allowed_wifi_ssids: string[] | null;
  shutdown_at: string | null;
  warning_broadcast: string | null;
};

type ProfileRow = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  gender: string | null;
  visibility: string | null;
  is_present: boolean | null;
  last_seen_at: string | null;
  created_at: string;
};

type ThreadRow = {
  id: string;
  user_a: string;
  user_b: string;
  status: string;
  last_activity: string;
  is_typing_a?: boolean | null;
  is_typing_b?: boolean | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  reaction: string | null;
  created_at: string;
};

const toNightConfigUI = (row: NightConfigRow): NightConfig => {
  return {
    isNightOn: !!row.is_night_on,
    validWifiSSIDs: row.allowed_wifi_ssids && Array.isArray(row.allowed_wifi_ssids) ? row.allowed_wifi_ssids : [],
    currentWifiSSID: row.active_wifi_ssid ?? null,
    shutdownTimer: row.shutdown_at ? new Date(row.shutdown_at).getTime() : null,
    warningBroadcast: row.warning_broadcast ?? null,
  };
};

const toUserUI = (p: ProfileRow): User => {
  const gender = (p.gender as any) || Gender.MALE;
  const visibility = (p.visibility as any) || VisibilityPreference.EVERYONE;

  return {
    id: p.id,
    nickname: p.nickname,
    gender,
    visibility,
    avatar: p.avatar_url || null, // ✅ NUNCA avatar fake aqui
    isPresent: true,
    joinedAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
};

const uploadAvatar = async (
  base64Image: string,
  userId: string
): Promise<string> => {
  // remove header "data:image/xxx;base64,"
  const base64 = base64Image.split(',')[1];

  // converte para bytes
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });

  const filePath = `avatars/${userId}.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, blob, {
      upsert: true,
      contentType: 'image/jpeg',
    });

  if (error) {
    console.error('uploadAvatar error:', error);
    throw error;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
};


const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDebug, setIsDebug] = useState(false);

  // =====================================================
// 1) RESTORE AUTH SESSION (não perde login no refresh)
// =====================================================
useEffect(() => {
  const restoreSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('restoreSession error:', error);
      return;
    }

    if (data?.session?.user?.id) {
      console.log('Session restored:', data.session.user.id);
    }
  };

  restoreSession();
}, []);


  // Night config (vindo do DB)
  const [nightConfig, setNightConfig] = useState<NightConfig>({
    isNightOn: false,
    validWifiSSIDs: [],
    currentWifiSSID: null,
    shutdownTimer: null,
    warningBroadcast: null,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('people');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [reactionMenuMsgId, setReactionMenuMsgId] = useState<string | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isLoggingOutRef = useRef(false);

  const [isBooting, setIsBooting] = useState(true);

  const longPressTimer = useRef<number | null>(null);

  // ---------------------------
  // 0) Hash mode (#admin / #debug)
  // ---------------------------
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#admin') setIsAdminMode(true);
      else if (hash === '#debug') {
        setIsDebug(true);
      } else {
        setIsAdminMode(false);
        setIsDebug(false);
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();

    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // ---------------------------
  // 1) Night config: load + realtime updates
  // ---------------------------
  useEffect(() => {
    let channel: any;

    const loadNightConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('night_config')
          .select('*')
          .eq('id', 1)
          .single();

        if (error) throw error;
        if (data) setNightConfig(toNightConfigUI(data as NightConfigRow));
      } catch (e) {
        // Se night_config não tiver permissões, o app fica offline.
        // Não explode o layout.
        console.error('NightConfig load error:', e);
      }
    };

    loadNightConfig();

    channel = supabase
      .channel('system_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'night_config' },
        (payload: any) => {
          const next = payload?.new as NightConfigRow | undefined;
          if (next && next.id === 1) setNightConfig(toNightConfigUI(next));
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ---------------------------
  // 2) Admin actions (REAL DB)
  // ---------------------------
  const updateNightConfig = async (patch: Partial<NightConfigRow>) => {
    const { data, error } = await supabase
      .from('night_config')
      .update({ ...patch })
      .eq('id', 1)
      .select('*')
      .single();

    if (error) throw error;
    if (data) setNightConfig(toNightConfigUI(data as NightConfigRow));
  };

  const toggleNight = async () => {
    try {
      await updateNightConfig({ is_night_on: !nightConfig.isNightOn });
    } catch (e) {
      console.error('toggleNight error:', e);
    }
  };

  const broadcastMsg = async (mins: number) => {
    try {
      const msg =
        mins <= 0
          ? 'O sistema será encerrado agora.'
          : `O sistema será encerrado em ${mins} minutos.`;
      await updateNightConfig({ warning_broadcast: msg });

      // limpa após 10s (só UI)
      setTimeout(async () => {
        try {
          await updateNightConfig({ warning_broadcast: null });
        } catch {}
      }, 10000);
    } catch (e) {
      console.error('broadcastMsg error:', e);
    }
  };

  const setTimer = async (mins: number) => {
    try {
      const expiry = new Date(Date.now() + mins * 60 * 1000).toISOString();
      await updateNightConfig({ shutdown_at: expiry });
      await broadcastMsg(mins);
    } catch (e) {
      console.error('setTimer error:', e);
    }
  };

  const addSSID = async (ssid: string) => {
    try {
      const list = nightConfig.validWifiSSIDs || [];
      if (list.includes(ssid)) return;

      await updateNightConfig({
        allowed_wifi_ssids: [...list, ssid],
      });
    } catch (e) {
      console.error('addSSID error:', e);
    }
  };

  const removeSSID = async (ssid: string) => {
    try {
      const next = (nightConfig.validWifiSSIDs || []).filter(s => s !== ssid);
      const active = nightConfig.currentWifiSSID === ssid ? null : nightConfig.currentWifiSSID;

      await updateNightConfig({
        allowed_wifi_ssids: next,
        active_wifi_ssid: active,
      });
    } catch (e) {
      console.error('removeSSID error:', e);
    }
  };

  const setActiveSSID = async (ssid: string | null) => {
    try {
      await updateNightConfig({ active_wifi_ssid: ssid });
    } catch (e) {
      console.error('setActiveSSID error:', e);
    }
  };

  // =====================================================
// 2) RESTORE PROFILE -> currentUser (após refresh)
// =====================================================
useEffect(() => {
  const restoreProfile = async () => {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;

    if (!authUser || currentUser || isLoggingOutRef.current) {
      setIsBooting(false);   // 👈 AQUI
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('restoreProfile error:', error);
      setIsBooting(false);   // 👈 E AQUI
      return;
    }

    if (profile) {
      setCurrentUser({
        id: profile.id,
        nickname: profile.nickname,
        gender: profile.gender,
        visibility: profile.visibility,
        avatar: profile.avatar_url,
        isPresent: true,
        joinedAt: new Date(profile.created_at).getTime(),
      });
    }

    setIsBooting(false);     // 👈 E AQUI
  };

  restoreProfile();
}, [currentUser]);



  // ---------------------------
  // 3) Onboarding REAL (auth + profile upsert)
  // ---------------------------
  const handleOnboarding = async (data: Partial<User>) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      if (!SUPABASE_ANON_KEY) {
        throw new Error('Falta VITE_SUPABASE_ANON_KEY no .env');
      }

      const { data: existing } = await supabase.auth.getUser();

let authUserId: string;

if (existing?.user) {
  authUserId = existing.user.id;
} else {
  const { data: authData, error } =
    await supabase.auth.signInAnonymously();
  if (error) throw error;
  authUserId = authData.user.id;
}


      // 🔒 avatar: base64 NUNCA vai para o banco
let avatarUrl: string | null = null;

if (uploadedImage) {
  avatarUrl = await uploadAvatar(uploadedImage, authUserId);
}

const profile = {
  id: authUserId,
  nickname: data.nickname || 'Usuário',
  avatar_url: avatarUrl, // ✅ SEMPRE URL ou null
  gender: (data.gender as any) || Gender.MALE,
  visibility: (data.visibility as any) || VisibilityPreference.EVERYONE,
  is_present: true,
  last_seen_at: new Date().toISOString(),
};


      const { error: profErr } = await supabase.from('profiles').upsert(profile);
      if (profErr) throw profErr;

      setCurrentUser({
      id: profile.id,
      nickname: profile.nickname,
      gender: profile.gender,
      visibility: profile.visibility,
      avatar: profile.avatar_url, // null é OK
      isPresent: true,
      last_seen_at: profile.last_seen_at,
      });
    } catch (e: any) {
      setAuthError(e?.message || 'Erro desconhecido');
      console.error('handleOnboarding error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // 4) Presence REAL (heartbeat + filter by last_seen_at)
  // ---------------------------
  useEffect(() => {
    if (!currentUser || isLoggingOutRef.current) return;

    let stopped = false;
    const HEARTBEAT_MS = 5000;
    const ACTIVE_WINDOW_MS = 5000;

    const heartbeat = async () => {
      if (!currentUser || stopped) return;
      try {
        await supabase
          .from('profiles')
          .update({
            last_seen_at: new Date().toISOString(),
            is_present: true,
          })
          .eq('id', currentUser.id);
      } catch (e) {
        console.error('heartbeat error:', e);
      }
    };

    const loadUsers = async () => {
      if (!currentUser || stopped) return;
      try {
        const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .gte('last_seen_at', cutoff);

        if (error) throw error;

        const rows = (data || []) as ProfileRow[];
        const list = rows
          .filter(p => p.id !== currentUser.id)
          .map(toUserUI);

        setUsers(list);
      } catch (e) {
        console.error('loadUsers error:', e);
      }
    };

    // realtime profiles (opcional; polling garante)
    const channel = supabase
      .channel('presence_profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    // start
    heartbeat();
    loadUsers();

    const hb = setInterval(heartbeat, HEARTBEAT_MS);
    const poll = setInterval(loadUsers, 3000);

    const onBeforeUnload = () => {
      try {
        // best effort (não confie 100% nisso)
        supabase
          .from('profiles')
          .update({ is_present: false })
          .eq('id', currentUser.id);
      } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      stopped = true;
      clearInterval(hb);
      clearInterval(poll);
      window.removeEventListener('beforeunload', onBeforeUnload);
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // ---------------------------
  // 5) Threads + Messages REAL (sync + realtime)
  // ---------------------------
  useEffect(() => {
    if (!currentUser) return;

    let stopped = false;

    const syncThreads = async () => {
      if (!currentUser || stopped) return;

      try {
        // threads do usuário
        const { data: th, error: thErr } = await supabase
          .from('threads')
          .select('*')
          .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`)
          .order('last_activity', { ascending: false });

        if (thErr) throw thErr;

        const threadRows = (th || []) as ThreadRow[];
        const threadIds = threadRows.map(t => t.id);

        // mensagens de todas as threads
        let msgRows: MessageRow[] = [];
        if (threadIds.length > 0) {
          const { data: ms, error: msErr } = await supabase
            .from('messages')
            .select('*')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: true });

          if (msErr) throw msErr;
          msgRows = (ms || []) as MessageRow[];
        }

        // monta Thread UI
        const uiThreads: Thread[] = threadRows.map(t => {
          const messages: Message[] = msgRows
            .filter(m => m.thread_id === t.id)
            .map(m => ({
              id: m.id,
              senderId: m.sender_id,
              text: m.text,
              timestamp: new Date(m.created_at).getTime(),
              reaction: m.reaction || '',
            }));

          const otherId = t.user_a === currentUser.id ? t.user_b : t.user_a;

          return {
            id: t.id,
            participants: [t.user_a, t.user_b],
            status: (t.status as any) || 'pending',
            messages,
            lastActivity: t.last_activity ? new Date(t.last_activity).getTime() : Date.now(),
            isOtherTyping: false,
            otherUserId: otherId,
          } as any;
        });

        setThreads(uiThreads);
      } catch (e) {
        console.error('syncThreads error:', e);
      }
    };

    syncThreads();

    const channel = supabase
      .channel('threads_messages_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads' },
        () => syncThreads()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => syncThreads()
      )
      .subscribe();

    const poll = setInterval(syncThreads, 3000);

    return () => {
      stopped = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // ---------------------------
  // 6) Start conversation REAL
  // ---------------------------
  const startConversation = async (target: User) => {
    if (!currentUser) return;

    // já existe thread entre os dois?
    const existing = threads.find(t => t.participants.includes(target.id));
    if (existing) {
      setActiveChatId(existing.id);
      setActiveTab('chat_view');
      return;
    }

    try {
      const now = new Date().toISOString();

      const { data: inserted, error } = await supabase
        .from('threads')
        .insert({
          user_a: currentUser.id,
          user_b: target.id,
          status: 'pending',
          last_activity: now,
          is_typing_a: false,
          is_typing_b: false,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!inserted?.id) throw new Error('Falha ao criar conversa');

      setActiveChatId(inserted.id);
      setActiveTab('chat_view');

      Haptics.light();
    } catch (e) {
      console.error('startConversation error:', e);
    }
  };

  // ---------------------------
  // 7) Send message REAL (no bot)
  // ---------------------------
  const sendMessage = async (text: string) => {
    const threadId = activeChatId;
    if (!threadId || !currentUser) return;

    const trimmed = (text || '').trim();
    if (!trimmed) return;

    try {
      const now = new Date().toISOString();

      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: currentUser.id,
          text: trimmed,
          reaction: null,
          created_at: now,
        });

      if (msgErr) throw msgErr;

      const { error: thErr } = await supabase
        .from('threads')
        .update({ last_activity: now })
        .eq('id', threadId);

      if (thErr) throw thErr;

      Haptics.light();
    } catch (e) {
      console.error('sendMessage error:', e);
    }
  };

  // ---------------------------
  // 8) Reactions REAL
  // ---------------------------
  const handleReaction = async (msgId: string, reaction: string) => {
    if (!msgId) return;

    try {
      if (reaction) Haptics.light();

      // toggling: buscar atual local (se existir)
      const thread = threads.find(t => t.messages.some(m => m.id === msgId));
      const existing = thread?.messages.find(m => m.id === msgId)?.reaction || '';

      const next = reaction === existing ? '' : reaction;

      const { error } = await supabase
        .from('messages')
        .update({ reaction: next || null })
        .eq('id', msgId);

      if (error) throw error;
    } catch (e) {
      console.error('handleReaction error:', e);
    }
  };

  // ---------------------------
  // 9) Block (local)
  // ---------------------------
  const blockUser = (uid: string) => {
    setBlockedIds(prev => [...prev, uid]);
    setActiveChatId(null);
    setActiveTab('chats');
  };

    // ---------------------------
  // 9) Edit profile
  // ---------------------------

  const handleEditProfile = async () => {
  try {
    // 🚫 trava qualquer effect que ainda tente rodar
    isLoggingOutRef.current = true;

    // mata estado local imediatamente
    setCurrentUser(null);

    // limpa sessão da noite
    sessionStorage.clear();

    // desloga do Supabase
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  // reload limpo
  window.location.reload();
};

// ---------------------------
// BOOT GATE (evita pulo de telas)
// ---------------------------
if (isBooting) {
  return (
    <div className="h-[100dvh] flex items-center justify-center bg-gray-50">
      <span className="text-xs text-gray-400 font-bold">
        Conectando…
      </span>
    </div>
  );
}


  // ---------------------------
  // 10) Admin UI (sem "admin rastros" no app)
  // ---------------------------
  if (isAdminMode) return (
    <AdminDashboard
      nightConfig={nightConfig} users={users} threads={threads}
      onToggleNight={toggleNight} onBroadcast={broadcastMsg} onSetTimer={setTimer}
      onAddSSID={addSSID} onRemoveSSID={removeSSID} onSetActiveSSID={setActiveSSID}
      onExit={() => window.location.hash = ''}
    />
  );

  // ---------------------------
  // 11) Offline gate: precisa admin ligar + selecionar wifi ativo
  // ---------------------------
  if (!nightConfig.isNightOn && !isDebug) return (
    <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-white">
      <p className="text-gray-400 font-bold mb-8 uppercase tracking-widest text-xs">{UI_STRINGS.APP_INACTIVE}</p>
      <button onClick={() => window.location.hash = '#debug'} className="text-[10px] text-gray-200 border px-4 py-2 rounded-full uppercase">Modo Teste</button>
    </div>
  );

  // Só funciona se admin tiver selecionado UM wifi ativo
  const activeWifi = nightConfig.currentWifiSSID;
  const connected = sessionStorage.getItem('connected_ssid');

  const userNeedsToConnect =
    !isDebug &&
    (!activeWifi || !connected || connected !== activeWifi);

  if (userNeedsToConnect) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-10 bg-gray-50">
        <div className="bg-white p-8 rounded-3xl border shadow-sm w-full max-w-xs space-y-4">
          <p className="text-xs text-gray-500 text-center">{UI_STRINGS.WIFI_REQUIRED}</p>

          {!activeWifi ? (
            <div className="text-[11px] text-gray-500 text-center">
              Sistema ligado, mas <b>nenhuma rede ativa</b> foi selecionada no Admin.
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => { sessionStorage.setItem('connected_ssid', activeWifi); window.location.reload(); }}
                className="w-full py-4 border rounded-2xl font-bold text-xs transition-colors bg-gray-50 hover:bg-gray-100 text-gray-600"
              >
                Conectar em: {activeWifi}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------
  // 12) Onboarding
  // ---------------------------
  if (!currentUser) {
  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col justify-center">
      <Onboarding
        onComplete={handleOnboarding}
        uploadedImage={uploadedImage}
        setUploadedImage={setUploadedImage}
      />

      {authError && (
        <div className="fixed bottom-4 inset-x-4 z-50 bg-red-600 text-white p-3 rounded-2xl text-[10px] font-bold text-center shadow-xl">
          {authError}
        </div>
      )}

      {isLoading && (
        <div className="fixed top-4 inset-x-4 z-50 bg-black/80 text-white p-3 rounded-2xl text-[10px] font-bold text-center shadow-xl">
          Conectando…
        </div>
      )}
    </div>
  );
}


  // ---------------------------
  // 13) Filtering + threads for UI
  // ---------------------------
  const filteredUsers = users.filter(u => {
    if (blockedIds.includes(u.id)) return false;
    if (currentUser.visibility === VisibilityPreference.MEN && u.gender !== Gender.MALE) return false;
    if (currentUser.visibility === VisibilityPreference.WOMEN && u.gender !== Gender.FEMALE) return false;
    return true;
  });

  const activeThreads = threads.filter(t => !t.participants.some(p => blockedIds.includes(p)));

  const unreadCount = threads.filter(t => {
  if (!currentUser) return false;

  const lastMsg =
    t.messages && t.messages.length > 0
      ? t.messages[t.messages.length - 1]
      : null;

  return lastMsg && lastMsg.senderId !== currentUser.id;
}).length;


    return (
  <Layout
    activeTab={activeTab}
    onTabChange={setActiveTab}
    isDebug={isDebug}
    user={{
      nickname: currentUser.nickname,
      avatar: currentUser.avatar || null
    }}
    onEditProfile={handleEditProfile}
     unreadCount={unreadCount}
  >

      {nightConfig.warningBroadcast && (
        <div className="fixed top-20 inset-x-4 z-50 bg-blue-600 text-white p-3 rounded-2xl text-[10px] font-bold text-center shadow-xl animate-bounce">
          {nightConfig.warningBroadcast}
        </div>
      )}

      {activeTab === 'people' && (
        <PeopleList users={filteredUsers} onStartChat={startConversation} isDebug={isDebug} />
      )}

      {activeTab === 'chats' && (
        <ChatList
          threads={activeThreads} users={users} currentUserId={currentUser.id}
          onOpenChat={id => { setActiveChatId(id); setActiveTab('chat_view'); }}
          onAccept={async id => {
            try {
              Haptics.light();
              await supabase.from('threads').update({ status: 'accepted' }).eq('id', id);
            } catch (e) {
              console.error('accept thread error:', e);
            }
          }}
          onBlock={blockUser}
        />
      )}

      {activeTab === 'chat_view' && activeChatId && (
        <ChatView
          nightConfig={nightConfig}
          thread={threads.find(t => t.id === activeChatId)!}
          users={users}
          currentUserId={currentUser.id}
          onBack={() => setActiveTab('chats')}
          onBlock={blockUser}
          onSendMessage={sendMessage}
          onAccept={async id => {
            try {
              Haptics.light();
              await supabase.from('threads').update({ status: 'accepted' }).eq('id', id);
            } catch (e) {
              console.error('accept thread error:', e);
            }
          }}
          onAddReaction={(mid, r) => handleReaction(mid, r)}
          reactionMenuMsgId={reactionMenuMsgId}
          setReactionMenuMsgId={setReactionMenuMsgId}
          handleMessageTouchStart={id => {
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
            longPressTimer.current = window.setTimeout(() => {
              Haptics.light();
              setReactionMenuMsgId(id);
            }, 600);
          }}
          handleMessageTouchEnd={() => {
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }}
        />
      )}
    </Layout>
  );
};

export default App;
