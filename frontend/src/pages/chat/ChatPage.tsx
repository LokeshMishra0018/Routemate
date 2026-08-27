import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Check,
  CheckCheck,
  Search,
  User,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Conversation, Message } from '../../types';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Badge';
import { EmptyState, LoadingSpinner } from '../../components/ui/EmptyState';
import { cn } from '../../lib/utils';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId || null);
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

  // If no active conv in URL, pick the first one
  useEffect(() => {
    if (!activeConvId && conversations && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [activeConvId, conversations]);

  // 2. Fetch messages for active conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', activeConvId],
    queryFn: async () => {
      if (!activeConvId) return [];
      const res = await apiClient.get(`/messaging/conversations/${activeConvId}/messages`);
      return res.data.data as Message[];
    },
    enabled: !!activeConvId,
  });

  // 3. Socket.IO Listeners for realtime messages & typing
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

  // 4. Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeConvId) throw new Error('No active conversation');
      const res = await apiClient.post(`/messaging/conversations/${activeConvId}/messages`, { content });
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

  const activeConversation = conversations?.find((c) => c.id === activeConvId);
  const otherParticipantId = activeConversation?.participants.find((p) => p !== user?.id);
  const otherProfile = otherParticipantId && activeConversation?.participantProfiles
    ? activeConversation.participantProfiles[otherParticipantId]
    : undefined;

  return (
    <div className="h-[calc(100vh-140px)] min-h-[500px] flex rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
      {/* Sidebar: Conversations List */}
      <aside className="w-full sm:w-80 md:w-96 border-r border-slate-800 bg-slate-950/60 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Messages
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {convsLoading && <LoadingSpinner size="sm" text="Loading chats..." />}

          {!convsLoading && (!conversations || conversations.length === 0) && (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations yet. Connect with travel buddies to start chatting.
            </div>
          )}

          {!convsLoading &&
            conversations?.map((conv) => {
              const partnerId = conv.participants.find((p) => p !== user?.id);
              const partnerProfile = partnerId && conv.participantProfiles ? conv.participantProfiles[partnerId] : undefined;
              const isActive = conv.id === activeConvId;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    'w-full p-4 flex items-start gap-3 text-left transition-colors hover:bg-slate-800/50',
                    isActive && 'bg-slate-800/80 border-l-4 border-indigo-500'
                  )}
                >
                  <Avatar
                    name={partnerProfile?.fullName || 'Traveler'}
                    src={partnerProfile?.avatarUrl}
                    size="md"
                    verified={partnerProfile?.verificationStatus === 'approved'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-100 truncate">
                        {partnerProfile?.fullName || 'Travel Partner'}
                      </h4>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-slate-500">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {conv.lastMessage ? conv.lastMessage.content : 'Started a conversation'}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      {/* Active Conversation Panel */}
      <section className="flex-1 flex flex-col bg-slate-900/40">
        {activeConvId && (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  name={otherProfile?.fullName || 'Traveler'}
                  src={otherProfile?.avatarUrl}
                  size="sm"
                  verified={otherProfile?.verificationStatus === 'approved'}
                />
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    {otherProfile?.fullName || 'Travel Partner'}
                    {otherProfile?.verificationStatus === 'approved' && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-medium">Verified Campus Member</span>
                </div>
              </div>
              {otherParticipantId && (
                <Link to={`/profile/${otherParticipantId}`}>
                  <Button size="sm" variant="ghost" leftIcon={<User className="w-3.5 h-3.5" />} className="text-xs">
                    View Profile
                  </Button>
                </Link>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {messagesLoading && <LoadingSpinner text="Fetching message history..." />}

              {!messagesLoading && messages && messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-xs text-slate-500">
                  Say hi to your verified travel buddy! Coordinate your pickup point, schedule, and luggage.
                </div>
              )}

              {messages?.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed break-words',
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      )}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {otherUserTyping && (
                <div className="flex items-center gap-1.5 text-slate-400 text-xs italic">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-150" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-300" />
                  <span>Traveler is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={sendMessageMutation.isPending}
                disabled={!inputText.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        )}

        {!activeConvId && (
          <div className="h-full flex items-center justify-center p-8">
            <EmptyState
              icon={<MessageSquare className="w-7 h-7" />}
              title="No Conversation Selected"
              description="Select a chat from the sidebar to start messaging your travel companions."
            />
          </div>
        )}
      </section>
    </div>
  );
};
