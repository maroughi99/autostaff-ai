'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureLocked } from "@/components/FeatureLocked";
import { API_URL } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Mail, 
  Inbox, 
  Star, 
  Send, 
  Clock, 
  Filter,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  MapPin,
  Sparkles,
  Trash
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type Message = {
  id: string;
  subject: string;
  content: string;
  fromEmail: string;
  toEmail: string;
  direction: 'inbound' | 'outbound';
  isAiGenerated: boolean;
  aiApprovalNeeded: boolean;
  aiClassification?: string;
  aiSentiment?: string;
  sentAt: string;
  readAt?: string;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    email: string;
    stage: string;
    priority: string;
    serviceType?: string;
  };
};

export default function InboxPage() {
  const { user } = useUser();
  const { hasFeature, plan, loading: subscriptionLoading } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'leads' | 'ai-pending'>('all');
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadMessages();
    }
  }, [user, filter]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/messages?userId=${user?.id}${filter !== 'all' ? `&filter=${filter}` : ''}`;
      console.log('Fetching messages from:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Received messages:', data.length, data);
        setMessages(data);
        if (data.length > 0 && !selectedMessage) {
          setSelectedMessage(data[0]);
        }
      } else {
        console.error('API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleApproveAndSend = async () => {
    if (!selectedMessage || !user) return;
    
    setProcessing(true);
    try {
      // Approve the draft
      const approveRes = await fetch(`${API_URL}/messages/${selectedMessage.id}/approve?userId=${user.id}`, {
        method: 'POST',
      });
      
      if (!approveRes.ok) {
        const errorData = await approveRes.json().catch(() => ({ message: approveRes.statusText }));
        console.error('Approve error response:', errorData);
        throw new Error(errorData.message || `Approve failed: ${approveRes.statusText}`);
      }
      
      // Send the message
      const sendRes = await fetch(`${API_URL}/messages/${selectedMessage.id}/send?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userClerkId: user.id }),
      });
      
      if (!sendRes.ok) {
        const errorData = await sendRes.json().catch(() => ({ message: sendRes.statusText }));
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      const result = await sendRes.json();
      console.log('Send result:', result);
      
      toast.success('Message sent successfully! ✉️');
      setSelectedMessage(null);
      loadMessages();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedMessage) return;
    if (!confirm('Are you sure you want to reject this AI response?')) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/messages/${selectedMessage.id}/reject`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        throw new Error('Failed to reject draft');
      }
      
      toast.success('Draft rejected');
      setSelectedMessage(null);
      loadMessages();
    } catch (error: any) {
      console.error('Failed to reject:', error);
      toast.error(error.message || 'Failed to reject draft');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditOpen = () => {
    if (!selectedMessage) return;
    setEditedSubject(selectedMessage.subject || '');
    setEditedContent(selectedMessage.content);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMessage) return;
    
    setProcessing(true);
    try {
      await fetch(`${API_URL}/messages/${selectedMessage.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editedSubject,
          content: editedContent,
        }),
      });
      
      setEditDialogOpen(false);
      loadMessages();
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update draft');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (messageId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    setProcessing(true);
    try {
      await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
      });
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      loadMessages();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete message');
    } finally {
      setProcessing(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-purple-100 text-purple-800';
      case 'quoted': return 'bg-indigo-100 text-indigo-800';
      case 'scheduled': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading inbox...</div>
      </div>
    );
  }

  // Check if user has access to email integration feature
  if (!hasFeature('email_integration')) {
    return (
      <FeatureLocked
        feature="Email Integration & Inbox"
        requiredPlan="Starter"
        description="Manage all your client communications with AI-powered email integration and smart inbox features."
      />
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Message List */}
      <div className="w-full md:w-96 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Inbox</h2>
            <Badge variant="secondary" className="ml-auto">
              {messages.length}
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex gap-1 sm:gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="flex-1 text-xs sm:text-sm"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
              className="flex-1 text-xs sm:text-sm"
            >
              Unread
            </Button>
            <Button
              size="sm"
              variant={filter === 'leads' ? 'default' : 'outline'}
              onClick={() => setFilter('leads')}
              className="flex-1 text-xs sm:text-sm"
            >
              <Star className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Leads</span>
            </Button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 animate-pulse" />
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm">Your AI employee will capture emails here</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                onClick={() => setSelectedMessage(message)}
                className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                  selectedMessage?.id === message.id ? 'bg-accent' : ''
                } ${!message.readAt && message.direction === 'inbound' ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-sm truncate">
                        {message.lead.name}
                      </span>
                      {message.isAiGenerated && (
                        <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-medium truncate mb-1">
                      {message.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {message.content.substring(0, 80)}...
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(message.lead.priority)}`}>
                        {message.lead.priority}
                      </Badge>
                      <Badge className={`text-xs ${getStageColor(message.lead.stage)}`}>
                        {message.lead.stage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDelete(message.id, e)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-6 border-b">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{selectedMessage.subject}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{selectedMessage.lead.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{selectedMessage.fromEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {selectedMessage.isAiGenerated && selectedMessage.aiApprovalNeeded && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated - Needs Approval
                  </Badge>
                )}
              </div>

              {/* Lead Info */}
              <Card className="p-4 bg-muted/30">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Stage</p>
                    <Badge className={getStageColor(selectedMessage.lead.stage)}>
                      {selectedMessage.lead.stage}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Priority</p>
                    <Badge variant="outline" className={getPriorityColor(selectedMessage.lead.priority)}>
                      {selectedMessage.lead.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Service</p>
                    <p className="font-medium">{selectedMessage.lead.serviceType || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Sentiment</p>
                    <p className="font-medium capitalize">{selectedMessage.aiSentiment || 'Neutral'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Message Content */}
            <div className="flex-1 overflow-auto p-6">
              <Card className="p-6">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {selectedMessage.content}
                  </pre>
                </div>
              </Card>

              {/* AI Response Actions */}
              {selectedMessage.isAiGenerated && selectedMessage.aiApprovalNeeded && (
                <div className="mt-6 flex gap-3">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleApproveAndSend}
                    disabled={processing}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {processing ? 'Sending...' : 'Approve & Send'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleEditOpen}
                    disabled={processing}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Edit Response
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleReject}
                    disabled={processing}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a message to view</p>
              <p className="text-sm">Choose a message from the list to see details</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit AI Response</DialogTitle>
            <DialogDescription>
              Modify the AI-generated response before sending
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input 
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={12}
                placeholder="Email content"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={processing}
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
