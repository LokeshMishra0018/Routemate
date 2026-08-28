import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Search,
  User,
  Plus,
  Smile,
  Check,
  CheckCheck,
  Lock,
  MoreVertical,
  Phone,
  Video,
  Sparkles,
  Compass,
  SlidersHorizontal,
  Bell,
  Users,
  Radio,
  Settings,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Conversation, Message, PublicProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Badge';
import { TrustBadge } from '../../components/common/TrustBadge';
import { TrustScoreMeter } from '../../components/ui/TrustScoreMeter';
import { LoadingSpinner } from '../../components/ui/EmptyState';
import { cn } from '../../lib/utils';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
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

  // Default to first conversation
  useEffect(() => {
    if (!activeConvId && conversations && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [activeConvId, conversations]);

  // Helper to extract companion profile from conversation
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

  // 2. Fetch full companion profile
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

  const isSendingRef = useRef(false);

  // 4. Socket.IO Realtime Listeners
  useEffect(() => {
    if (!socket || !activeConvId) return;

    socket.emit('join_conversation', { conversationId: activeConvId });

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId === activeConvId) {
        queryClient.setQueryData<Message[]>(['conversation-messages', activeConvId], (old) => {
          if (!old) return [msg];
          const newId = msg.id || (msg as any)._id;
          if (old.some((m) => (m.id || (m as any)._id) === newId)) return old;
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

  // 5. Send message mutation with strict deduplication
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
        const newId = newMsg.id || (newMsg as any)._id;
        if (old.some((m) => (m.id || (m as any)._id) === newId)) return old;
        return [...old, newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
    },
    onSettled: () => {
      isSendingRef.current = false;
    },
  });

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sendMessageMutation.isPending || isSendingRef.current) return;

    isSendingRef.current = true;
    setInputText('');
    sendMessageMutation.mutate(text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (socket && activeConvId && !isTyping) {
      setIsTyping(true);
      socket.emit('typing', { conversationId: activeConvId });
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  // Deduplicate messages by ID before rendering
  const displayedMessages = useMemo(() => {
    if (!messages) return [];
    const seen = new Set<string>();
    return messages.filter((msg) => {
      const id = msg.id || (msg as any)._id;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [messages]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    let list = conversations;

    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      list = list.filter((conv) => {
        const partner = getPartnerFromConv(conv, user?.id);
        const nameMatch = partner?.fullName?.toLowerCase().includes(q);
        const collegeMatch = partner?.collegeName?.toLowerCase().includes(q);
        const lastMsg = (conv.lastMessage as any)?.body || (conv.lastMessage as any)?.content || '';
        const msgMatch = lastMsg.toLowerCase().includes(q);
        return nameMatch || collegeMatch || msgMatch;
      });
    }

    if (filterTab === 'unread') {
      list = list.filter((c) => (c.unreadCount ?? 0) > 0);
    }

    return list;
  }, [conversations, sidebarSearch, filterTab, user?.id]);

  return (
    <div className="h-[calc(100vh-120px)] min-h-[620px] flex rounded-xl overflow-hidden border border-[#d1d7db] shadow-2xl bg-[#efeae2] font-sans antialiased text-[#111b21]">
      {/* ================= 1. WhatsApp Left Thin App Strip ================= */}
      <div className="w-14 bg-[#f0f2f5] border-r border-[#e9edef] flex-col items-center justify-between py-3 shrink-0 hidden md:flex select-none">
        {/* Top Navigation Icons */}
        <div className="flex flex-col items-center gap-4 text-[#54656f]">
          <button
            title="Chats"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#d9fdd3] text-[#008069] relative shadow-sm"
          >
            <MessageSquare className="w-5 h-5" />
            {conversations && conversations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#25d366] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {conversations.length}
              </span>
            )}
          </button>

          <Link to="/trips" title="Campus Trips" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] text-[#54656f] transition-colors">
            <Compass className="w-5 h-5" />
          </Link>

          <Link to="/groups" title="Campus Carpool Groups" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] text-[#54656f] transition-colors">
            <Users className="w-5 h-5" />
          </Link>

          <Link to="/safety" title="Safety Hub" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] text-[#54656f] transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </Link>
        </div>

        {/* Bottom User Avatar */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/profile" title="My Profile">
            <Avatar
              name={user?.fullName || 'Me'}
              size="sm"
              className="ring-2 ring-[#008069] cursor-pointer"
            />
          </Link>
        </div>
      </div>

      {/* ================= 2. WhatsApp Left Chats Sidebar ================= */}
      <aside className="w-full sm:w-80 md:w-96 bg-white border-r border-[#e9edef] flex flex-col shrink-0">
        {/* Chats Top Header */}
        <div className="px-4 py-3.5 bg-white flex items-center justify-between">
          <h1 className="text-xl font-black text-[#111b21] tracking-tight">
            Chats <span className="text-xs font-normal text-[#667781] ml-1">Messages</span>
          </h1>

          <div className="flex items-center gap-2 text-[#54656f]">
            <Link
              to="/trips"
              title="New Trip / Message"
              className="p-1.5 hover:bg-[#f0f2f5] rounded-full transition-colors text-[#54656f]"
            >
              <Plus className="w-5 h-5" />
            </Link>
            <button className="p-1.5 hover:bg-[#f0f2f5] rounded-full transition-colors text-[#54656f]">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Search Bar */}
        <div className="px-3 pt-1 pb-2 bg-white">
          <div className="flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-[#54656f] mr-3 shrink-0" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full bg-transparent border-0 text-xs text-[#111b21] placeholder-[#667781] focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* WhatsApp Filter Chips (All, Unread, Favourites) */}
        <div className="px-3 pb-2 flex items-center gap-1.5 bg-white border-b border-[#f0f2f5]">
          <button
            onClick={() => setFilterTab('all')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterTab === 'all'
                ? 'bg-[#d9fdd3] text-[#008069] font-bold'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterTab === 'unread'
                ? 'bg-[#d9fdd3] text-[#008069] font-bold'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            )}
          >
            Unread
          </button>
          <button className="px-3 py-1 rounded-full text-xs font-medium bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]">
            Campus Buddies
          </button>
        </div>

        {/* Conversations Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
          {convsLoading && (
            <div className="p-8 flex justify-center">
              <LoadingSpinner size="sm" text="Loading chats..." />
            </div>
          )}

          {!convsLoading && (!conversations || conversations.length === 0) && (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#f0f2f5] text-[#008069] flex items-center justify-center mx-auto shadow-inner">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#111b21]">No chats yet</p>
              <p className="text-xs text-[#667781] leading-relaxed">
                Connect with verified student companions on campus trips to coordinate and chat securely.
              </p>
              <Link to="/trips">
                <Button size="sm" variant="primary" className="text-xs bg-[#008069] hover:bg-[#00705a] text-white">
                  Browse Campus Trips
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
              const isLastMsgMine = conv.lastMessage?.senderId === user?.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    'w-full px-3.5 py-3 flex items-center gap-3 text-left transition-colors',
                    isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      name={partnerProfile?.fullName || 'Traveler'}
                      src={partnerProfile?.avatarUrl}
                      size="md"
                      verified={partnerProfile?.verificationStatus === 'approved'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-[#111b21] truncate flex items-center gap-1">
                        <span>{partnerProfile?.fullName || 'Travel Partner'}</span>
                        <TrustBadge
                          tier={partnerProfile?.verificationTier || (partnerProfile?.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                          iconOnly
                          size="xs"
                        />
                      </h4>
                      {lastMsgTime && (
                        <span className="text-[11px] text-[#667781] shrink-0">
                          {lastMsgTime}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-[#667781] truncate font-normal flex items-center gap-1 max-w-[210px]">
                        {isLastMsgMine && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />}
                        <span className="truncate">{lastMsgText}</span>
                      </p>

                      {partnerProfile?.collegeName && (
                        <span className="text-[10px] font-bold text-[#008069] bg-[#d9fdd3] px-1.5 py-0.5 rounded shrink-0 ml-1">
                          {partnerProfile.collegeName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      {/* ================= 3. WhatsApp Main Chat Room ================= */}
      <section className="flex-1 flex flex-col bg-[#efeae2] relative min-w-0">
        {activeConvId && (
          <>
            {/* WhatsApp Top Contact Header */}
            <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between gap-3 z-10 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={otherProfile?.fullName || 'Traveler'}
                  src={otherProfile?.avatarUrl}
                  size="md"
                  verified={otherProfile?.verificationStatus === 'approved'}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <h3 className="text-sm font-bold text-[#111b21] truncate flex items-center gap-1">
                      <span>{otherProfile?.fullName || 'Student Travel Companion'}</span>
                      <TrustBadge
                        tier={otherProfile?.verificationTier || (otherProfile?.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                        iconOnly
                        size="xs"
                      />
                    </h3>
                    <TrustBadge
                      tier={otherProfile?.verificationTier || (otherProfile?.verificationStatus === 'approved' ? 'fully_verified' : 'partially_verified')}
                      size="xs"
                    />
                  </div>

                  <p className="text-xs text-[#667781] truncate">
                    {otherUserTyping ? (
                      <span className="text-[#008069] font-bold animate-pulse">typing...</span>
                    ) : otherProfile?.collegeName ? (
                      <span>{otherProfile.collegeName}</span>
                    ) : (
                      'online'
                    )}
                  </p>
                </div>
              </div>

              {/* Right Side Header Icons */}
              <div className="flex items-center gap-2 text-[#54656f] shrink-0">
                {otherProfile?.trustScore !== undefined && (
                  <div className="hidden lg:inline-flex">
                    <TrustScoreMeter score={otherProfile.trustScore} size="sm" />
                  </div>
                )}

                {otherParticipantId && (
                  <Link to={`/profile/${otherParticipantId}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<User className="w-3.5 h-3.5 text-[#008069]" />}
                      className="text-xs text-[#111b21] hover:bg-[#e9edef] border-0"
                    >
                      Profile
                    </Button>
                  </Link>
                )}

                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors text-[#54656f]">
                  <Search className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-[#e9edef] rounded-full transition-colors text-[#54656f]">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* WhatsApp Chat Wallpaper Background */}
            <div
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 relative"
              style={{
                backgroundColor: '#efeae2',
                backgroundImage: `radial-gradient(#d1d7db 1.2px, transparent 1.2px)`,
                backgroundSize: '18px 18px',
              }}
            >
              {/* WhatsApp Centered Date Badge */}
              <div className="flex justify-center my-2 sticky top-2 z-10">
                <span className="bg-white text-[#54656f] text-[11px] font-semibold px-3 py-1 rounded-md shadow-sm border border-[#e9edef]">
                  TODAY
                </span>
              </div>

              {/* WhatsApp E2EE Notice Banner */}
              <div className="max-w-md mx-auto my-3 p-2 rounded-lg bg-[#ffeecd] border border-[#ffdf9e] text-center shadow-sm">
                <div className="flex items-center justify-center gap-1.5 text-[#54656f] text-xs font-semibold">
                  <Lock className="w-3 h-3 text-[#54656f]" /> Messages are end-to-end encrypted
                </div>
                <p className="text-[10px] text-[#667781] mt-0.5">
                  No one outside of this chat can read them. Coordinate campus trips safely.
                </p>
              </div>

              {messagesLoading && (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner text="Loading messages..." />
                </div>
              )}

              {!messagesLoading && messages && messages.length === 0 && (
                <div className="h-44 flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-white text-[#008069] flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#111b21]">
                    Say hello to {otherProfile?.fullName || 'your companion'}!
                  </p>
                  <p className="text-[11px] text-[#667781]">
                    Confirm pickup point, departure timing, luggage, and fare sharing.
                  </p>
                </div>
              )}

              {/* Message Bubbles */}
              {displayedMessages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                const messageBody = (msg as any).body || msg.content || '';
                const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'relative max-w-[85%] sm:max-w-[65%] px-3 pt-1.5 pb-1 text-xs shadow-sm leading-relaxed break-words',
                        isMe
                          ? 'bg-[#d9fdd3] text-[#111b21] rounded-lg rounded-tr-none'
                          : 'bg-white text-[#111b21] rounded-lg rounded-tl-none'
                      )}
                    >
                      {/* Message Content */}
                      <p className="text-xs text-[#111b21] pr-14 leading-relaxed font-normal">
                        {messageBody}
                      </p>

                      {/* WhatsApp Inline Timestamp & Blue Double Ticks */}
                      <div className="absolute bottom-0.5 right-1.5 flex items-center gap-1 text-[10px] text-[#667781] select-none">
                        <span>{timeString}</span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {otherUserTyping && (
                <div className="flex items-center gap-2 bg-white text-[#667781] text-xs px-3 py-1.5 rounded-full w-fit shadow-sm border border-[#e9edef]">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008069] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008069] animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008069] animate-bounce delay-300" />
                  </div>
                  <span className="text-[11px] text-[#008069] font-medium">
                    {otherProfile?.fullName || 'Traveler'} is typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ================= WhatsApp Bottom Input Bar ================= */}
            <form
              onSubmit={handleSend}
              className="p-2.5 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-2 z-10"
            >
              {/* Plus Attachment Icon */}
              <button
                type="button"
                className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] rounded-full transition-colors"
                title="Attach"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Emoji Icon */}
              <button
                type="button"
                className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-[#e9edef] rounded-full transition-colors hidden sm:inline-flex"
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder="Type a message"
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-white text-[#111b21] placeholder-[#667781] border border-transparent focus:border-transparent rounded-lg px-4 py-2 text-xs focus:ring-0 focus:outline-none shadow-sm"
              />

              {/* Green Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || sendMessageMutation.isPending}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-white transition-all shadow-sm shrink-0',
                  inputText.trim()
                    ? 'bg-[#008069] hover:bg-[#00705a] cursor-pointer'
                    : 'bg-[#008069]/60 text-white/80 cursor-not-allowed'
                )}
                title="Send Message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </>
        )}

        {!activeConvId && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[#f0f2f5]">
            <div className="w-16 h-16 rounded-full bg-[#d9fdd3] text-[#008069] flex items-center justify-center shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#111b21]">RouteMate Messages</h3>
              <p className="text-xs text-[#667781] max-w-sm leading-relaxed">
                Send and receive messages with verified student travel companions to coordinate your campus rides seamlessly.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#667781] bg-white px-3 py-1.5 rounded-full border border-[#e9edef] shadow-sm">
              <Lock className="w-3.5 h-3.5 text-[#54656f]" /> End-to-end encrypted for student privacy
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
