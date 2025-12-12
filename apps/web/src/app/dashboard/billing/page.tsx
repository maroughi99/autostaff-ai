'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureLocked } from "@/components/FeatureLocked";
import { API_URL } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Invoice {
  id: string;
  invoiceNumber: string;
  leadId: string;
  quoteId?: string;
  title: string;
  description?: string;
  notes?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    status: string;
    paymentDate: string;
  }>;
}

export default function BillingPage() {
  const { user } = useUser();
  const { hasFeature, plan, loading: subscriptionLoading } = useSubscription();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user, filter]);

  const loadInvoices = async () => {
    try {
      const url = filter === 'all' 
        ? `${API_URL}/invoices?userId=${user?.id}`
        : `${API_URL}/invoices?userId=${user?.id}&status=${filter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-500',
      sent: 'bg-blue-500',
      paid: 'bg-green-500',
      partial: 'bg-yellow-500',
      overdue: 'bg-red-500',
      cancelled: 'bg-gray-700',
    };

    return (
      <Badge className={styles[status] || 'bg-gray-500'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleSendInvoice = async (invoiceId: string) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}/send?userId=${user.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Invoice sent successfully!');
        loadInvoices();
      } else {
        const error = await response.text();
        console.error('Failed to send invoice:', error);
        alert(`Failed to send invoice: ${error}`);
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert(`Failed to send invoice: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}?userId=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Invoice deleted successfully!');
        loadInvoices();
      } else {
        const error = await response.text();
        alert(`Failed to delete invoice: ${error}`);
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert(`Failed to delete invoice: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    setRecordingPayment(true);
    try {
      const response = await fetch(
        `${API_URL}/invoices/${selectedInvoice.id}/record-payment?userId=${user?.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(paymentAmount),
            method: paymentMethod,
            reference: paymentReference || undefined,
            notes: paymentNotes || undefined,
          }),
        }
      );

      if (response.ok) {
        alert('Payment recorded successfully!');
        setSelectedInvoice(null);
        setPaymentAmount('');
        setPaymentMethod('cash');
        setPaymentReference('');
        setPaymentNotes('');
        loadInvoices();
      } else {
        alert('Failed to record payment');
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const downloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}/pdf?userId=${user?.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  // Calculate totals
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);

  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading invoices...</p>
      </div>
    );
  }

  // Check if user has access to invoice generation feature
  if (!hasFeature('invoice_generation')) {
    return (
      <FeatureLocked
        feature="Invoice Generation & Billing"
        requiredPlan="Starter"
        description="Generate and manage professional invoices with automated billing and payment tracking."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Billing & Invoices</h1>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ${totalPaid.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ${totalOutstanding.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'draft', 'sent', 'partial', 'paid', 'overdue'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No invoices found
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {invoice.invoiceNumber}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>{invoice.lead.name}</strong> • {invoice.lead.email}
                    </p>
                    
                    <p className="font-medium mb-2">{invoice.title}</p>
                    
                    {invoice.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {invoice.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Issue Date</p>
                        <p className="font-medium">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-medium">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Amount</p>
                        <p className="font-medium">${invoice.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount Due</p>
                        <p className={`font-medium ${invoice.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${invoice.amountDue.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium mb-2">Items:</p>
                      {invoice.items.map((item) => (
                        <div
                          key={item.id}
                          className="text-sm text-gray-600 flex justify-between"
                        >
                          <span>
                            {item.quantity}x {item.description}
                          </span>
                          <span>${item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Payment History */}
                    {invoice.payments.length > 0 && (
                      <div className="border-t mt-3 pt-3">
                        <p className="text-sm font-medium mb-2">Payment History:</p>
                        {invoice.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="text-sm text-gray-600 flex justify-between"
                          >
                            <span>
                              {new Date(payment.paymentDate).toLocaleDateString()} •{' '}
                              {payment.method}
                              {payment.reference && ` (${payment.reference})`}
                            </span>
                            <span className="text-green-600 font-medium">
                              +${payment.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {invoice.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSendInvoice(invoice.id)}
                      >
                        Send Invoice
                      </Button>
                    )}
                    
                    {invoice.amountDue > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentAmount(invoice.amountDue.toString());
                            }}
                          >
                            Record Payment
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Record Payment - {invoice.invoiceNumber}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-medium">Amount</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Payment Method</label>
                              <select
                                className="w-full border rounded p-2"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                              >
                                <option value="cash">Cash</option>
                                <option value="check">Check</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">
                                Reference/Check Number
                              </label>
                              <Input
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                placeholder="Optional"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium">Notes</label>
                              <Textarea
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Optional payment notes"
                              />
                            </div>

                            <Button
                              className="w-full"
                              onClick={handleRecordPayment}
                              disabled={recordingPayment || !paymentAmount}
                            >
                              {recordingPayment ? 'Recording...' : 'Record Payment'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadPdf(invoice.id, invoice.invoiceNumber)}
                    >
                      Download PDF
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
