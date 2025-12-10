'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, Send, Eye, Calendar, DollarSign, User, Plus, X } from 'lucide-react';
import { downloadQuotePDF } from '@/lib/pdf-generator';
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureLocked } from "@/components/FeatureLocked";
import { API_URL } from '@/lib/utils';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  progress: number; // 0-100
}

interface ItemBreakdown {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  progress: number;
  originalEstimate: number;
  totalInvoiced: number;
  totalPaid: number;
  remainingToInvoice: number;
  balanceOwed: number;
  percentageInvoiced: number;
  percentagePaid: number;
}

interface FinancialBreakdown {
  quoteId: string;
  quoteTitle: string;
  quoteStatus: string;
  overall: {
    totalEstimate: number;
    totalInvoiced: number;
    totalPaid: number;
    totalRemainingToInvoice: number;
    totalBalanceOwed: number;
    percentageInvoiced: number;
    percentagePaid: number;
  };
  items: ItemBreakdown[];
}

interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  expiresAt?: string;
  sentAt?: string;
  createdAt: string;
  notes?: string;
  items: QuoteItem[];
  lead: {
    id: string;
    name: string;
    email: string;
  };
}

export default function QuotesPage() {
  const { user } = useUser();
  const { hasFeature, plan, loading: subscriptionLoading } = useSubscription();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [financialBreakdown, setFinancialBreakdown] = useState<FinancialBreakdown | null>(null);
  const [businessName, setBusinessName] = useState('Your Business');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuote, setNewQuote] = useState({
    recipientName: '',
    recipientEmail: '',
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    taxRate: 0,
    discount: 0,
    notes: '',
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchQuotes();
      fetchBusinessName();
    }
  }, [user]);

  const fetchQuotes = async () => {
    try {
      const response = await fetch(`${API_URL}/quotes?userId=${user?.id}`);
      const data = await response.json();
      // Ensure data is an array before setting
      setQuotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      setQuotes([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessName = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me?userId=${user?.id}`);
      const data = await response.json();
      if (data.businessName) {
        setBusinessName(data.businessName);
      }
    } catch (error) {
      console.error('Failed to fetch business name:', error);
    }
  };

  const fetchFinancialBreakdown = async (quoteId: string) => {
    try {
      const response = await fetch(`${API_URL}/quotes/${quoteId}/financial-breakdown?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setFinancialBreakdown(data);
      }
    } catch (error) {
      console.error('Failed to fetch financial breakdown:', error);
    }
  };

  const sendQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`${API_URL}/quotes/${quoteId}/send?userId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send quote';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      alert('Quote sent successfully!');
      fetchQuotes();
    } catch (error: any) {
      console.error('Failed to send quote:', error);
      const errorMsg = error.message || 'Failed to send quote';
      
      if (errorMsg.includes('Gmail not connected')) {
        alert('❌ Gmail Not Connected\n\nPlease connect your Gmail account in Settings to send quotes via email.');
      } else {
        alert(`❌ Error: ${errorMsg}`);
      }
    }
  };

  const updateItemProgress = async (quoteId: string, itemId: string, progress: number) => {
    try {
      const response = await fetch(`${API_URL}/quotes/${quoteId}/items/${itemId}/progress?userId=${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      // Update local state
      setQuotes(quotes.map(q => {
        if (q.id === quoteId) {
          return {
            ...q,
            items: q.items.map(item => 
              item.id === itemId ? { ...item, progress } : item
            )
          };
        }
        return q;
      }));

      // Update selectedQuote if it's the one being modified
      if (selectedQuote?.id === quoteId) {
        setSelectedQuote({
          ...selectedQuote,
          items: selectedQuote.items.map(item =>
            item.id === itemId ? { ...item, progress } : item
          )
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Failed to update progress');
    }
  };

  const createProgressInvoice = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) {
      alert('Quote not found');
      return;
    }

    // Check if any items have progress
    const itemsWithProgress = quote.items.filter(item => item.progress > 0);
    if (itemsWithProgress.length === 0) {
      alert('No items have progress set. Please update the progress for at least one item before creating an invoice.');
      return;
    }

    // Calculate invoice amounts based on progress
    const subtotal = quote.items.reduce((sum, item) => sum + (item.total * (item.progress / 100)), 0);
    const taxRate = quote.subtotal > 0 ? quote.tax / quote.subtotal : 0;
    const tax = subtotal * taxRate;
    const discountRate = quote.subtotal > 0 ? quote.discount / quote.subtotal : 0;
    const discount = subtotal * discountRate;
    const total = subtotal + tax - discount;

    if (total <= 0) {
      alert('Invoice total is $0. Please ensure items have progress greater than 0%.');
      return;
    }

    const confirmMsg = `Create progress invoice for $${total.toFixed(2)}?\n\nThis will invoice based on current progress:\n${itemsWithProgress.map(i => `• ${i.description}: ${i.progress}%`).join('\n')}`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/invoices/progress-from-quote/${quoteId}?userId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create progress invoice');
      }

      const invoice = await response.json();
      alert(`✓ Progress invoice created successfully!\n\nInvoice #${invoice.invoiceNumber}\nAmount: $${invoice.total.toFixed(2)}\n\nYou can view it in the Billing section.`);
      
      // Optionally navigate to billing page
      if (confirm('Would you like to view the invoice now?')) {
        window.location.href = '/dashboard/billing';
      }
    } catch (error) {
      console.error('Error creating progress invoice:', error);
      alert('Failed to create progress invoice');
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    try {
      await fetch(`${API_URL}/quotes/${quoteId}?userId=${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchQuotes();
    } catch (error) {
      console.error('Failed to update quote status:', error);
    }
  };

  const handleCreateQuote = async () => {
    if (!user || !newQuote.recipientName || !newQuote.recipientEmail || !newQuote.title) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate items
    const validItems = newQuote.items.filter(item => item.description && item.quantity > 0 && item.unitPrice >= 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid item with description, quantity, and price');
      return;
    }

    try {
      // First, get the database user ID
      const userResponse = await fetch(`${API_URL}/auth/me?userId=${user.id}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }
      const userData = await userResponse.json();
      if (!userData.id) {
        throw new Error('User not found in database');
      }

      // Create or find a lead for this recipient
      const leadResponse = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          userId: userData.id,
          name: newQuote.recipientName,
          email: newQuote.recipientEmail,
          source: 'manual_quote',
          stage: 'quoted',
        }),
      });

      if (!leadResponse.ok) {
        const errorData = await leadResponse.text();
        console.error('Lead creation error:', errorData);
        throw new Error(`Failed to create lead: ${errorData}`);
      }

      const lead = await leadResponse.json();
      console.log('Lead created:', lead);

      // Now create the quote
      const quoteData = {
        userId: userData.id,
        leadId: lead.id,
        title: newQuote.title,
        description: newQuote.description || '',
        notes: newQuote.notes || '',
        items: validItems,
        taxRate: newQuote.taxRate || 0,
        discount: newQuote.discount || 0,
      };

      console.log('Creating quote with data:', quoteData);

      const response = await fetch(`${API_URL}/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`,
        },
        body: JSON.stringify(quoteData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Quote created:', result);
        alert('Quote created successfully!');
        setShowCreateModal(false);
        setNewQuote({
          recipientName: '',
          recipientEmail: '',
          title: '',
          description: '',
          items: [{ description: '', quantity: 1, unitPrice: 0 }],
          taxRate: 0,
          discount: 0,
          notes: '',
        });
        fetchQuotes();
      } else {
        const errorData = await response.text();
        console.error('Quote creation error:', errorData);
        throw new Error(`Failed to create quote: ${errorData}`);
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      alert(`Failed to create quote: ${error.message}`);
    }
  };

  const addQuoteItem = () => {
    setNewQuote({
      ...newQuote,
      items: [...newQuote.items, { description: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const generateQuoteWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setGeneratingQuote(true);
    try {
      const response = await fetch(`${API_URL}/ai/generate-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          businessType: user?.publicMetadata?.businessType || 'general contractor',
          userId: user?.id,
        }),
      });

      const data = await response.json();
      
      // Populate the quote form with AI-generated data
      setNewQuote({
        ...newQuote,
        title: data.title || newQuote.title,
        description: data.description || newQuote.description,
        notes: data.notes || newQuote.notes,
        taxRate: data.taxRate || newQuote.taxRate,
        items: data.items || newQuote.items,
      });
      
      setAiPrompt('');
    } catch (error) {
      console.error('Failed to generate quote:', error);
      alert('Failed to generate quote. Please try again.');
    } finally {
      setGeneratingQuote(false);
    }
  };

  const removeQuoteItem = (index: number) => {
    const items = newQuote.items.filter((_, i) => i !== index);
    setNewQuote({ ...newQuote, items });
  };

  const updateQuoteItem = (index: number, field: string, value: any) => {
    const items = [...newQuote.items];
    items[index] = { ...items[index], [field]: value };
    setNewQuote({ ...newQuote, items });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredQuotes = statusFilter === 'all' 
    ? quotes 
    : quotes.filter(quote => quote.status === statusFilter);

  const statusCounts = {
    all: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading quotes...</div>
      </div>
    );
  }

  // Check if user has access to quote generation feature
  if (!hasFeature('quote_generation')) {
    return (
      <FeatureLocked
        feature="Quote Generation"
        requiredPlan="Starter"
        description="Create and send professional quotes to your clients with automated PDF generation."
      />
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              Estimates
            </h1>
            <p className="text-gray-500 mt-2">
              View and manage all your estimates
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Estimate
            </Button>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{quotes.length}</div>
              <div className="text-sm text-gray-500">Total Estimates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Draft</p>
              <p className="text-2xl font-bold">
                {quotes?.filter((q) => q.status === 'draft').length || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sent</p>
              <p className="text-2xl font-bold text-blue-600">
                {quotes?.filter((q) => q.status === 'sent').length || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Accepted</p>
              <p className="text-2xl font-bold text-green-600">
                {quotes?.filter((q) => q.status === 'accepted').length || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-purple-600">
                ${quotes?.reduce((sum, q) => sum + q.total, 0).toFixed(0) || '0'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b">
        {[
          { value: 'all', label: 'All Estimates' },
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'accepted', label: 'Accepted' },
          { value: 'rejected', label: 'Rejected' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 font-medium transition-colors ${
              statusFilter === filter.value
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {filter.label}
            <span className="ml-2 text-sm bg-gray-100 px-2 py-0.5 rounded-full">
              {statusCounts[filter.value as keyof typeof statusCounts]}
            </span>
          </button>
        ))}
      </div>

      {/* Quotes List */}
      {filteredQuotes?.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {statusFilter === 'all' ? 'No estimates yet' : `No ${statusFilter} estimates`}
          </h3>
          <p className="text-gray-500">
            {statusFilter === 'all' 
              ? 'Create your first estimate by clicking the Create Estimate button above'
              : `There are no estimates with ${statusFilter} status`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes?.map((quote) => (
            <Card
              key={quote.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => {
                const newQuote = selectedQuote?.id === quote.id ? null : quote;
                setSelectedQuote(newQuote);
                if (newQuote) {
                  fetchFinancialBreakdown(newQuote.id);
                } else {
                  setFinancialBreakdown(null);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{quote.title || 'Untitled Quote'}</h3>
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status}
                    </Badge>
                    <span className="text-sm text-gray-500">#{quote.quoteNumber}</span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {quote.lead.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(quote.createdAt)}
                    </div>
                    {quote.expiresAt && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Calendar className="h-4 w-4" />
                        Expires {formatDate(quote.expiresAt)}
                      </div>
                    )}
                  </div>

                  {quote.description && (
                    <p className="text-sm text-gray-600 mb-3">{quote.description}</p>
                  )}

                  {/* Expanded Details */}
                  {selectedQuote?.id === quote.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Line Items</h4>
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="text-left p-2 font-medium">Description</th>
                                <th className="text-right p-2 font-medium">Qty</th>
                                <th className="text-right p-2 font-medium">Unit Price</th>
                                <th className="text-right p-2 font-medium">Total</th>
                                <th className="text-center p-2 font-medium">Progress</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quote.items.map((item) => (
                                <tr key={item.id} className="border-t border-gray-200">
                                  <td className="p-2">{item.description}</td>
                                  <td className="text-right p-2">{item.quantity}</td>
                                  <td className="text-right p-2">${item.unitPrice.toFixed(2)}</td>
                                  <td className="text-right p-2">${item.total.toFixed(2)}</td>
                                  <td className="p-2">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all ${
                                            item.progress === 100 ? 'bg-green-500' : 
                                            item.progress >= 50 ? 'bg-blue-500' : 
                                            'bg-yellow-500'
                                          }`}
                                          style={{ width: `${item.progress}%` }}
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => updateItemProgress(quote.id, item.id, Math.max(0, item.progress - 25))}
                                          className="px-1 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                                          disabled={item.progress === 0}
                                        >
                                          −
                                        </button>
                                        <span className="text-xs font-medium min-w-[35px] text-center">{item.progress}%</span>
                                        <button
                                          onClick={() => updateItemProgress(quote.id, item.id, Math.min(100, item.progress + 25))}
                                          className="px-1 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                                          disabled={item.progress === 100}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Financial Breakdown Section */}
                      {financialBreakdown && financialBreakdown.quoteId === quote.id && (
                        <div className="mb-4 border-t pt-4">
                          <h4 className="font-semibold text-lg text-gray-800 mb-3">Financial Breakdown</h4>
                          
                          {/* Overall Summary */}
                          <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <h5 className="font-semibold text-sm text-gray-700 mb-2">Overall Summary</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Original Estimate:</span>
                                <span className="font-semibold ml-2">${financialBreakdown.overall.totalEstimate.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Total Invoiced:</span>
                                <span className="font-semibold ml-2">${financialBreakdown.overall.totalInvoiced.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Payments Received:</span>
                                <span className="font-semibold ml-2 text-green-600">${financialBreakdown.overall.totalPaid.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Balance Owed:</span>
                                <span className="font-semibold ml-2 text-orange-600">${financialBreakdown.overall.totalBalanceOwed.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Remaining to Invoice:</span>
                                <span className="font-semibold ml-2 text-blue-600">${financialBreakdown.overall.totalRemainingToInvoice.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Invoiced Progress:</span>
                                <span className="font-semibold ml-2">{financialBreakdown.overall.percentageInvoiced.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Per-Job Breakdown */}
                          <div className="space-y-3">
                            <h5 className="font-semibold text-sm text-gray-700">Job-by-Job Breakdown</h5>
                            {financialBreakdown.items.map((item, index) => (
                              <div key={item.itemId} className="bg-gray-50 p-3 rounded border border-gray-200">
                                <div className="font-medium text-sm mb-2">Job {index + 1}: {item.description}</div>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <div>
                                    <span className="text-gray-600">Original Estimate:</span>
                                    <span className="font-semibold ml-1">${item.originalEstimate.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Progress:</span>
                                    <span className="font-semibold ml-1">{item.progress}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Total Invoiced:</span>
                                    <span className="font-semibold ml-1">${item.totalInvoiced.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Payments Received:</span>
                                    <span className="font-semibold ml-1 text-green-600">${item.totalPaid.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Balance Owed:</span>
                                    <span className="font-semibold ml-1 text-orange-600">${item.balanceOwed.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Remaining to Invoice:</span>
                                    <span className="font-semibold ml-1 text-blue-600">${item.remainingToInvoice.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="h-1.5 bg-blue-500 rounded-full"
                                      style={{ width: `${item.percentageInvoiced}%` }}
                                    />
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.percentageInvoiced.toFixed(1)}% invoiced
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {quote.notes && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Notes</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded">
                            {quote.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="ml-6 text-right">
                  <div className="text-2xl font-bold text-blue-600 mb-4">
                    ${quote.total.toFixed(2)}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadQuotePDF(
                          {
                            ...quote,
                            taxRate: quote.tax / quote.subtotal || 0,
                            taxAmount: quote.tax,
                            validUntil: quote.expiresAt ? new Date(quote.expiresAt) : undefined,
                            items: quote.items,
                          },
                          businessName
                        );
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    {quote.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendQuote(quote.id);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Quote
                      </Button>
                    )}
                    {quote.status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendQuote(quote.id);
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Resend Quote
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuoteStatus(quote.id, 'accepted');
                          }}
                        >
                          ✓ Mark Accepted
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuoteStatus(quote.id, 'rejected');
                          }}
                        >
                          ✗ Mark Rejected
                        </Button>
                      </>
                    )}
                    {(quote.status === 'sent' || quote.status === 'accepted') && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          createProgressInvoice(quote.id);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Create Progress Invoice
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newQuote = selectedQuote?.id === quote.id ? null : quote;
                        setSelectedQuote(newQuote);
                        if (newQuote) {
                          fetchFinancialBreakdown(newQuote.id);
                        } else {
                          setFinancialBreakdown(null);
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {selectedQuote?.id === quote.id ? 'Hide' : 'View'} Details
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create New Estimate</h2>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowCreateModal(false);
                  setNewQuote({
                    recipientName: '',
                    recipientEmail: '',
                    title: '',
                    description: '',
                    items: [{ description: '', quantity: 1, unitPrice: 0 }],
                    taxRate: 0,
                    discount: 0,
                    notes: '',
                  });
                  setAiPrompt('');
                }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* AI Quote Generator */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-semibold text-lg mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ✨ AI Quote Generator
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Describe the work and AI will generate line items, pricing, and details automatically
                </p>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Describe the work... (e.g., 'Install concrete driveway 20x30 feet with stamped finish' or 'HVAC system replacement for 2000 sq ft home')"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="flex-1"
                    disabled={generatingQuote}
                  />
                  <Button
                    onClick={generateQuoteWithAI}
                    disabled={!aiPrompt.trim() || generatingQuote}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 whitespace-nowrap self-end"
                  >
                    {generatingQuote ? 'Generating...' : 'Generate Quote'}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-4 text-center">Or manually create a quote below:</p>
              </div>

              {/* Recipient Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Recipient Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <Input
                      value={newQuote.recipientName}
                      onChange={(e) => setNewQuote({ ...newQuote, recipientName: e.target.value })}
                      placeholder="Client Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      value={newQuote.recipientEmail}
                      onChange={(e) => setNewQuote({ ...newQuote, recipientEmail: e.target.value })}
                      placeholder="client@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Quote Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Quote Details</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <Input
                    value={newQuote.title}
                    onChange={(e) => setNewQuote({ ...newQuote, title: e.target.value })}
                    placeholder="Quote for..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={newQuote.description}
                    onChange={(e) => setNewQuote({ ...newQuote, description: e.target.value })}
                    placeholder="Brief description of the work..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Line Items</h3>
                  <Button onClick={addQuoteItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                {newQuote.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        value={item.description}
                        onChange={(e) => updateQuoteItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuoteItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Qty"
                        min="1"
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateQuoteItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="w-32 flex items-center">
                      <span className="font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                    </div>
                    {newQuote.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuoteItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                    <Input
                      type="number"
                      value={newQuote.taxRate}
                      onChange={(e) => setNewQuote({ ...newQuote, taxRate: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Discount ($)</label>
                    <Input
                      type="number"
                      value={newQuote.discount}
                      onChange={(e) => setNewQuote({ ...newQuote, discount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {(() => {
                    const subtotal = newQuote.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                    const taxAmount = subtotal * (newQuote.taxRate / 100);
                    const total = subtotal + taxAmount - newQuote.discount;
                    return (
                      <>
                        <div className="flex justify-between mb-2">
                          <span>Subtotal:</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {newQuote.taxRate > 0 && (
                          <div className="flex justify-between mb-2 text-sm">
                            <span>Tax ({newQuote.taxRate}%):</span>
                            <span>${taxAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {newQuote.discount > 0 && (
                          <div className="flex justify-between mb-2 text-sm text-green-600">
                            <span>Discount:</span>
                            <span>-${newQuote.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <Textarea
                  value={newQuote.notes}
                  onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                  placeholder="Additional notes or terms..."
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateQuote} className="bg-blue-600 hover:bg-blue-700">
                Create Quote
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
