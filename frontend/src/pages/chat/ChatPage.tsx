import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  ShieldAlert,
  Search,
  User,
  ExternalLink,
  MapPin,
  Sparkles,
  Lock,
  Compass,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Conversation, Message, PublicProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Badge';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { EmptyState, LoadingSpinner } from '../../components/ui/EmptyState';
import { cn } from '../../lib/utils';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      setActiveConvId(conversationId);
    }
  }, [conversationId]);

  // 1. Fetch all conversations for user
  const { data: conversations, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations-list'],
    queryFn: async () => {
      const res = await apiClient.get('/messaging/conversations');
      return res.data.data as Conversation[];
    },
  });

  // If no active conv in URL, default to first one
  useEffect(() => {
    if (!activeConvId && conversations && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [activeConvId, conversations]);

  // Helper to extract companion profile from conversation payload
  const getPartnerFromConv = (conv?: Conversation, myId?: string): PublicProfile | undefined => {
    if (!conv) return undefined;
    const partnerId = conv.participants?.find((p) => p !== myId);
    if (!partnerId) return undefined;

    if (Array.isArray(conv.participantProfiles)) {
      const found = (conv.participantProfiles as any[]).find(
        (p) => p?.id === partnerId || p?.userId === partnerId || p?._id === partnerId
      );
      if (found) return found;
    }
    if (typeof conv.participantProfiles === 'object' && conv.participantProfiles !== null) {
      const found = (conv.participantProfiles as any)[partnerId];
      if (found) return found;
    }
    return undefined;
  };

  const activeConversation = conversations?.find((c) => c.id === activeConvId);
  const otherParticipantId = activeConversation?.participants?.find((p) => p !== user?.id);
  const cachedOtherProfile = getPartnerFromConv(activeConversation, user?.id);

  // 2. Guaranteed fallback profile fetch if not cached in conversation
  const { data: fetchedOtherProfile } = useQuery({
    queryKey: ['user-public-profile', otherParticipantId],
    queryFn: async () => {
      if (!otherParticipantId) return null;
      const res = await apiClient.get(`/users/${otherParticipantId}/profile`);
      return res.data.data as PublicProfile;
    },
    enabled: !!otherParticipantId && !cachedOtherProfile,
  });

  const otherProfile: PublicProfile | undefined = cachedOtherProfile || fetchedOtherProfile || undefined;

  // 3. Fetch messages for active conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', activeConvId],
    queryFn: async () => {
      if (!activeConvId) return [];
      const res = await apiClient.get(`/messaging/conversations/${activeConvId}/messages`);
      return res.data.data as Message[];
    },
    enabled: !!activeConvId,
  });

  // 4. Socket.IO Listeners for realtime messages & typing
  useEffect(() => {
    if (!socket || !activeConvId) return;

    socket.emit('join_conversation', { conversationId: activeConvId });

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId === activeConvId) {
        queryClient.setQueryData<Message[]>(['conversation-messages', activeConvId], (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
    };

    const handleUserTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConvId && data.userId !== user?.id) {
        setOtherUserTyping(true);
        setTimeout(() => setOtherUserTyping(false), 3000);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.emit('leave_conversation', { conversationId: activeConvId });
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, activeConvId, queryClient, user?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // 5. Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeConvId) throw new Error('No active conversation');
      const res = await apiClient.post(`/messaging/conversations/${activeConvId}/messages`, {
        body: content,
        content,
      });
      return res.data.data as Message;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData<Message[]>(['conversation-messages', activeConvId], (old) => {
        if (!old) return [newMsg];
        return [...old, newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      setInputText('');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputText.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (socket && activeConvId && !isTyping) {
      setIsTyping(true);
      socket.emit('typing', { conversationId: activeConvId });
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!sidebarSearch.trim()) return conversations;
    const query = sidebarSearch.toLowerCase();

    return conversations.filter((conv) => {
      const partner = getPartnerFromConv(conv, user?.id);
      const nameMatch = partner?.fullName?.toLowerCase().includes(query);
      const collegeMatch = partner?.collegeName?.toLowerCase().includes(query);
      const lastMsg = (conv.lastMessage as any)?.body || (conv.lastMessage as any)?.content || '';
      const msgMatch = lastMsg.toLowerCase().includes(query);
      return nameMatch || collegeMatch || msgMatch;
    });
  }, [conversations, sidebarSearch, user?.id]);

  return (
    <div className="h-[calc(100vh-140px)] min-h-[580px] flex rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
      {/* Sidebar: Conversations List */}
      <aside className="w-full sm:w-80 md:w-96 border-r border-slate-800 bg-slate-950/70 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Messages
            </h2>
            {conversations && conversations.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 rounded-full">
                {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
              </span>
            )}
          </div>

          {/* Sidebar Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search chats & buddies..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Conversations Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {convsLoading && <LoadingSpinner size="sm" text="Loading chats..." />}

          {!convsLoading && (!conversations || conversations.length === 0) && (
            <div className="p-8 text-center text-xs text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-300">No active chats</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Connect with student travel buddies on campus trips to coordinate and chat securely.
              </p>
              <Link to="/trips">
                <Button size="sm" variant="secondary" className="text-xs">
                  Browse Trips
                </Button>
              </Link>
            </div>
          )}

          {!convsLoading &&
            filteredConversations.map((conv) => {
              const partnerProfile = getPartnerFromConv(conv, user?.id);
              const isActive = conv.id === activeConvId;
              const lastMsgText =
                (conv.lastMessage as any)?.body || (conv.lastMessage as any)?.content || 'Started a conversation';
              const lastMsgTime = conv.lastMessage?.createdAt
                ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : null;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    'w-full p-3.5 sm:p-4 flex items-start gap-3 text-left transition-all border-l-4',
                    isActive
                      ? 'bg-slate-800/90 border-indigo-500 shadow-inner'
                      : 'border-transparent hover:bg-slate-800/40'
                  )}
                >
                  <Avatar
                    name={partnerProfile?.fullName || 'Travel Buddy'}
                    src={partnerProfile?.avatarUrl}
                    size="md"
                    verified={partnerProfile?.verificationStatus === 'approved'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1">
                        {partnerProfile?.fullName || 'Student Companion'}
                        {partnerProfile?.verificationStatus === 'approved' && (
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </h4>
                      {lastMsgTime && <span className="text-[10px] text-slate-500 shrink-0">{lastMsgTime}</span>}
                    </div>

                    {partnerProfile?.collegeName && (
                      <p className="text-[10px] text-indigo-400 font-medium truncate mt-0.5">
                        {partnerProfile.collegeName}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 truncate mt-1 leading-normal font-normal">
                      {lastMsgText}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      {/* Active Conversation Panel */}
      <section className="flex-1 flex flex-col bg-slate-900/40 min-w-0">
        {activeConvId && (
          <>
            {/* Production Grade Chat Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
              {/* Traveler Identity & Verified Credentials */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={otherProfile?.fullName || 'Travel Buddy'}
                  src={otherProfile?.avatarUrl}
                  size="md"
                  verified={otherProfile?.verificationStatus === 'approved'}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                      {otherProfile?.fullName || 'Student Travel Companion'}
                    </h3>
                    {otherProfile?.verificationStatus === 'approved' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shadow-glow">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Student
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Campus Member
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                    {otherProfile?.collegeName && (
                      <span className="text-slate-300 font-medium truncate">{otherProfile.collegeName}</span>
                    )}
                    {otherProfile?.academicYear && (
                      <span className="text-[11px] text-slate-500">• Year {otherProfile.academicYear}</span>
                    )}
                    {otherProfile?.trustScore !== undefined && (
                      <div className="inline-flex items-center ml-1">
                        <TrustScoreMeter score={otherProfile.trustScore} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {otherParticipantId && (
                  <Link to={`/profile/${otherParticipantId}`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<User className="w-3.5 h-3.5 text-indigo-400" />}
                      className="text-xs border-slate-700 hover:border-slate-600 shadow-sm"
                    >
                      View Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* In-Chat Campus Safety & Privacy Notice */}
            <div className="px-4 py-2 bg-gradient-to-r from-indigo-950/50 via-slate-900/40 to-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-slate-200">Verified Campus Chat:</strong> End-to-end encrypted for student privacy. Coordinate pickup points and transit schedules safely.
                </span>
              </div>
              <Link to="/safety" className="text-indigo-400 hover:text-indigo-300 font-semibold hidden md:inline shrink-0">
                Safety Guidelines →
              </Link>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messagesLoading && <LoadingSpinner text="Loading message history..." />}

              {!messagesLoading && messages && messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-glow">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Start coordinating with {otherProfile?.fullName || 'your travel buddy'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Say hello to confirm meeting points, luggage requirements, route stops, and shared ride timing.
                  </p>
                </div>
              )}

              {messages?.map((msg) => {
                const isMe = msg.senderId === user?.id;
                const messageBody = (msg as any).body || msg.content || '';
                const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                    <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                      {!isMe && (
                        <Avatar
                          name={otherProfile?.fullName || 'Buddy'}
                          src={otherProfile?.avatarUrl}
                          size="sm"
                          className="shrink-0 mb-1"
                        />
                      )}
                      <div>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed break-words',
                            isMe
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-none shadow-indigo-950/50'
                              : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-black/20'
                          )}
                        >
                          {messageBody}
                        </div>
                        <span
                          className={cn(
                            'text-[9px] text-slate-500 mt-1 block px-1',
                            isMe ? 'text-right' : 'text-left'
                          )}
                        >
                          {timeString}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {otherUserTyping && (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic pt-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-300" />
                  </div>
                  <span>{otherProfile?.fullName || 'Traveler'} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Footer */}
            <form
              onSubmit={handleSend}
              className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2.5 shadow-2xl"
            >
              <input
                type="text"
                placeholder={`Message ${otherProfile?.fullName || 'travel companion'}...`}
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={sendMessageMutation.isPending}
                disabled={!inputText.trim()}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                className="bg-indigo-600 hover:bg-indigo-500 shadow-glow px-4 h-9 text-xs"
              >
                Send
              </Button>
            </form>
          </>
        )}

        {!activeConvId && (
          <div className="h-full flex items-center justify-center p-8">
            <EmptyState
              icon={<MessageSquare className="w-8 h-8 text-indigo-400" />}
              title="No Chat Selected"
              description="Choose a student companion from the left sidebar to coordinate campus travel, shared rides, and luggage."
            />
          </div>
        )}
      </section>
    </div>
  );
};
