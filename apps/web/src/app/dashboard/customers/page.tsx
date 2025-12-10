'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Plus, X, Building2, Mail, Phone, MapPin, Globe, DollarSign, Briefcase, Search, FileText, Receipt, Calendar, MessageSquare, Settings, ChevronRight, ChevronDown, Download, Send, Eye, Trash2 } from 'lucide-react';
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureLocked } from "@/components/FeatureLocked";
import { API_URL } from '@/lib/utils';

interface Job {
  id: string;
  jobName: string;
  leadId: string;
  customerId?: string;
  openingBalance?: number;
  openingBalanceDate?: string;
  companyName?: string;
  title?: string;
  firstName?: string;
  middleInitial?: string;
  lastName?: string;
  jobTitle?: string;
  mainPhone?: string;
  workPhone?: string;
  mobile?: string;
  fax?: string;
  mainEmail?: string;
  ccEmail?: string;
  website?: string;
  other1?: string;
  invoiceBillToAddress?: string;
  shipToAddress?: string;
  defaultShippingAddress?: boolean;
  isActive: boolean;
  status: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  notes?: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  mainEmail?: string;
  phone?: string;
  mainPhone?: string;
  address?: string;
  invoiceBillToAddress?: string;
  isActive: boolean;
  openingBalance?: number;
  createdAt: string;
  
  // Full customer details
  title?: string;
  firstName?: string;
  middleInitial?: string;
  lastName?: string;
  jobTitle?: string;
  workPhone?: string;
  mobile?: string;
  fax?: string;
  ccEmail?: string;
  website?: string;
  other1?: string;
  shipToAddress?: string;
  defaultShippingAddress?: boolean;
  openingBalanceDate?: string;
}

export default function CustomersPage() {
  const { user } = useUser();
  const { hasFeature, plan, loading: subscriptionLoading } = useSubscription();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showJobEditModal, setShowJobEditModal] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [selectedCustomerForJob, setSelectedCustomerForJob] = useState<Customer | null>(null);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState<Job | null>(null);
  const [selectedJobForEstimate, setSelectedJobForEstimate] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); // Currently expanded job
  const [activeTab, setActiveTab] = useState<'address' | 'payment' | 'tax' | 'additional' | 'job'>('address');
  const [jobActiveTab, setJobActiveTab] = useState<'address' | 'payment' | 'tax' | 'additional' | 'job'>('address');
  const [jobTab, setJobTab] = useState<'estimates' | 'invoices' | 'notes'>('estimates'); // Tab for selected job
  const [estimates, setEstimates] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showEstimateViewModal, setShowEstimateViewModal] = useState(false);
  const [showInvoiceViewModal, setShowInvoiceViewModal] = useState(false);
  const [customerTotalOwing, setCustomerTotalOwing] = useState<number>(0);
  const [jobTotalsOwing, setJobTotalsOwing] = useState<Record<string, number>>({});
  const [financialBreakdown, setFinancialBreakdown] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Helper function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' = 'success', duration: number = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const [newCustomer, setNewCustomer] = useState({
    companyName: '',
    title: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    jobTitle: '',
    mainPhone: '',
    workPhone: '',
    mobile: '',
    fax: '',
    mainEmail: '',
    ccEmail: '',
    website: '',
    other1: '',
    invoiceBillToAddress: '',
    shipToAddress: '',
    defaultShippingAddress: false,
    openingBalance: '',
    openingBalanceDate: new Date().toISOString().split('T')[0],
    isActive: true,
  });

  const [newJob, setNewJob] = useState({
    jobName: '',
    companyName: '',
    title: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    jobTitle: '',
    mainPhone: '',
    workPhone: '',
    mobile: '',
    fax: '',
    mainEmail: '',
    ccEmail: '',
    website: '',
    other1: '',
    invoiceBillToAddress: '',
    shipToAddress: '',
    defaultShippingAddress: false,
    openingBalance: '',
    openingBalanceDate: new Date().toISOString().split('T')[0],
    isActive: true,
  });

  const [newEstimate, setNewEstimate] = useState({
    title: '',
    description: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    taxRate: 0,
    discount: 0,
    notes: '',
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingQuote, setGeneratingQuote] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchJobsForCustomer(selectedCustomer.id);
      // Clear selected job and its data when customer changes
      setSelectedJob(null);
      setEstimates([]);
      setInvoices([]);
    }
  }, [selectedCustomer]);

  // Recalculate customer total whenever job totals change
  useEffect(() => {
    if (selectedCustomer) {
      const total = calculateCustomerTotalOwing();
      setCustomerTotalOwing(total);
    }
  }, [jobTotalsOwing, selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/customers?userId=${user?.id}`);
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async () => {
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCustomer,
          userId: user?.id,
          openingBalance: newCustomer.openingBalance ? parseFloat(newCustomer.openingBalance) : null,
        }),
      });

      if (response.ok) {
        await fetchCustomers();
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const resetForm = () => {
    setNewCustomer({
      companyName: '',
      title: '',
      firstName: '',
      middleInitial: '',
      lastName: '',
      jobTitle: '',
      mainPhone: '',
      workPhone: '',
      mobile: '',
      fax: '',
      mainEmail: '',
      ccEmail: '',
      website: '',
      other1: '',
      invoiceBillToAddress: '',
      shipToAddress: '',
      defaultShippingAddress: false,
      openingBalance: '',
      openingBalanceDate: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setActiveTab('address');
  };

  const copyAddressToShipping = () => {
    setNewCustomer(prev => ({
      ...prev,
      shipToAddress: prev.invoiceBillToAddress,
    }));
  };

  const fetchJobsForCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`${API_URL}/jobs?customerId=${customerId}&userId=${user?.id}`);
      const data = await response.json();
      const jobsList = Array.isArray(data) ? data : [];
      setJobs(jobsList);
      // Calculate total owing for each job
      await calculateAllJobTotals(jobsList);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setJobs([]);
    }
  };

  const fetchEstimatesForJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/quotes?userId=${user?.id}`);
      const data = await response.json();
      // Filter quotes by jobId
      const jobEstimates = Array.isArray(data) ? data.filter((q: any) => q.jobId === jobId) : [];
      setEstimates(jobEstimates);
    } catch (error) {
      console.error('Failed to fetch estimates:', error);
      setEstimates([]);
    }
  };

  const fetchInvoicesForJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/invoices?userId=${user?.id}`);
      const data = await response.json();
      // Filter invoices by jobId
      const jobInvoices = Array.isArray(data) ? data.filter((inv: any) => inv.jobId === jobId) : [];
      setInvoices(jobInvoices);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    }
  };

  const selectJob = async (job: Job) => {
    if (selectedJob?.id === job.id) {
      // Collapse if clicking same job
      setSelectedJob(null);
      setEstimates([]);
      setInvoices([]);
    } else {
      // Expand and load data
      setSelectedJob(job);
      setJobTab('estimates');
      await Promise.all([
        fetchEstimatesForJob(job.id),
        fetchInvoicesForJob(job.id),
      ]);
    }
  };

  // Calculate total owing from accepted estimates for a specific job
  const calculateJobTotalOwing = (jobId: string, jobEstimates: any[]) => {
    return jobEstimates
      .filter((estimate: any) => estimate.jobId === jobId && estimate.status === 'accepted')
      .reduce((total: number, estimate: any) => total + (estimate.total || 0), 0);
  };

  // Calculate total owing from all accepted estimates for a customer (all jobs)
  const calculateCustomerTotalOwing = (): number => {
    // Simply sum up all job totals that are already calculated
    const total = Object.values(jobTotalsOwing).reduce((sum, jobTotal) => sum + jobTotal, 0);
    console.log('Customer total owing from job totals:', total, jobTotalsOwing);
    return total;
  };

  // Calculate total owing for all jobs
  const calculateAllJobTotals = async (jobsList: Job[]) => {
    try {
      const response = await fetch(`${API_URL}/quotes?userId=${user?.id}`);
      const allEstimates = await response.json();
      
      const totals: Record<string, number> = {};
      jobsList.forEach((job: Job) => {
        totals[job.id] = calculateJobTotalOwing(job.id, allEstimates);
      });
      
      setJobTotalsOwing(totals);
    } catch (error) {
      console.error('Failed to calculate job totals:', error);
      setJobTotalsOwing({});
    }
  };

  const openJobModal = (customer: Customer) => {
    setSelectedCustomerForJob(customer);
    // Pre-fill job form with customer data
    setNewJob({
      jobName: '',
      companyName: customer.companyName || '',
      title: customer.title || '',
      firstName: customer.firstName || '',
      middleInitial: customer.middleInitial || '',
      lastName: customer.lastName || '',
      jobTitle: customer.jobTitle || '',
      mainPhone: customer.mainPhone || '',
      workPhone: customer.workPhone || '',
      mobile: customer.mobile || '',
      fax: customer.fax || '',
      mainEmail: customer.mainEmail || '',
      ccEmail: customer.ccEmail || '',
      website: customer.website || '',
      other1: customer.other1 || '',
      invoiceBillToAddress: customer.invoiceBillToAddress || '',
      shipToAddress: customer.shipToAddress || '',
      defaultShippingAddress: customer.defaultShippingAddress || false,
      openingBalance: '',
      openingBalanceDate: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setShowJobModal(true);
  };

  const createJob = async () => {
    if (!selectedCustomerForJob) return;
    
    if (!newJob.jobName || !newJob.jobName.trim()) {
      showToast('Please enter a job name', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newJob,
          userId: user?.id,
          leadId: selectedCustomerForJob.id,
          openingBalance: newJob.openingBalance ? parseFloat(newJob.openingBalance) : null,
        }),
      });

      if (response.ok) {
        await fetchJobsForCustomer(selectedCustomerForJob.id);
        setShowJobModal(false);
        resetJobForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to create job: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      showToast('Failed to create job. Please try again.', 'error');
    }
  };

  const updateJob = async () => {
    if (!selectedJobForEdit) return;
    
    if (!newJob.jobName || !newJob.jobName.trim()) {
      showToast('Please enter a job name', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/jobs/${selectedJobForEdit.id}?userId=${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newJob,
          openingBalance: newJob.openingBalance ? parseFloat(newJob.openingBalance) : null,
        }),
      });

      if (response.ok) {
        if (selectedCustomer) {
          await fetchJobsForCustomer(selectedCustomer.id);
        }
        setShowJobEditModal(false);
        setSelectedJobForEdit(null);
        resetJobForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to update job: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update job:', error);
      showToast('Failed to update job. Please try again.', 'error');
    }
  };

  const openJobEditModal = (job: Job) => {
    setSelectedJobForEdit(job);
    setNewJob({
      jobName: job.jobName || '',
      companyName: job.companyName || '',
      title: job.title || '',
      firstName: job.firstName || '',
      middleInitial: job.middleInitial || '',
      lastName: job.lastName || '',
      jobTitle: job.jobTitle || '',
      mainPhone: job.mainPhone || '',
      workPhone: job.workPhone || '',
      mobile: job.mobile || '',
      fax: job.fax || '',
      mainEmail: job.mainEmail || '',
      ccEmail: job.ccEmail || '',
      website: job.website || '',
      other1: job.other1 || '',
      invoiceBillToAddress: job.invoiceBillToAddress || '',
      shipToAddress: job.shipToAddress || '',
      defaultShippingAddress: job.defaultShippingAddress || false,
      openingBalance: job.openingBalance ? job.openingBalance.toString() : '',
      openingBalanceDate: job.openingBalanceDate || new Date().toISOString().split('T')[0],
      isActive: job.isActive !== undefined ? job.isActive : true,
    });
    setShowJobEditModal(true);
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/customers/${customerId}?userId=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCustomers();
        if (selectedCustomer?.id === customerId) {
          setSelectedCustomer(null);
          setJobs([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to delete customer: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
      showToast('Failed to delete customer. Please try again.', 'error');
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/jobs/${jobId}?userId=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (selectedCustomer) {
          await fetchJobsForCustomer(selectedCustomer.id);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to delete job: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
      showToast('Failed to delete job. Please try again.', 'error');
    }
  };

  const openEstimateModal = (job: Job) => {
    setSelectedJobForEstimate(job);
    setNewEstimate({
      title: `Estimate for ${job.jobName}`,
      description: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      discount: 0,
      notes: '',
    });
    setShowEstimateModal(true);
  };

  const createEstimate = async () => {
    if (!selectedJobForEstimate || !selectedCustomer) return;

    if (!newEstimate.title.trim()) {
      setToast({ message: 'Please enter an estimate title', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const items = newEstimate.items.filter(item => item.description.trim());
    if (items.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          leadId: selectedCustomer.id,
          jobId: selectedJobForEstimate.id,
          title: newEstimate.title,
          description: newEstimate.description,
          items: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          taxRate: newEstimate.taxRate,
          discount: newEstimate.discount,
          notes: newEstimate.notes,
        }),
      });

      if (response.ok) {
        setToast({ message: 'Estimate created successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
        setShowEstimateModal(false);
        const createdForJob = selectedJobForEstimate;
        setSelectedJobForEstimate(null);
        setAiPrompt('');
        setNewEstimate({
          title: '',
          description: '',
          items: [{ description: '', quantity: 1, unitPrice: 0 }],
          taxRate: 0,
          discount: 0,
          notes: '',
        });
        // Select the job and refresh its estimates
        setSelectedJob(createdForJob);
        setJobTab('estimates');
        await fetchEstimatesForJob(createdForJob.id);
        // Recalculate job totals (customer total will update via useEffect)
        await calculateAllJobTotals(jobs);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to create estimate: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Failed to create estimate:', error);
      showToast('Failed to create estimate. Please try again.', 'error');
    }
  };

  const addEstimateItem = () => {
    setNewEstimate(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeEstimateItem = (index: number) => {
    setNewEstimate(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateEstimateItem = (index: number, field: string, value: any) => {
    setNewEstimate(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateEstimateTotal = () => {
    const subtotal = newEstimate.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    const tax = subtotal * (newEstimate.taxRate / 100);
    const total = subtotal + tax - newEstimate.discount;
    return { subtotal, tax, total };
  };

  const generateEstimateWithAI = async () => {
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
      
      // Populate the estimate form with AI-generated data
      setNewEstimate({
        ...newEstimate,
        title: data.title || newEstimate.title,
        description: data.description || newEstimate.description,
        notes: data.notes || newEstimate.notes,
        taxRate: data.taxRate || newEstimate.taxRate,
        items: data.items || newEstimate.items,
      });
      
      setAiPrompt('');
    } catch (error) {
      console.error('Failed to generate estimate:', error);
      showToast('Failed to generate estimate. Please try again.', 'error');
    } finally {
      setGeneratingQuote(false);
    }
  };

  const sendEstimate = async (estimateId: string) => {
    try {
      const response = await fetch(`${API_URL}/quotes/${estimateId}/send?userId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send estimate';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      console.log('Setting toast notification');
      setToast({ message: 'Estimate sent successfully!', type: 'success' });
      setTimeout(() => {
        console.log('Clearing toast notification');
        setToast(null);
      }, 3000);
      if (selectedJob) {
        await fetchEstimatesForJob(selectedJob.id);
        // Recalculate job totals (customer total will update via useEffect)
        await calculateAllJobTotals(jobs);
      }
    } catch (error: any) {
      console.error('Failed to send estimate:', error);
      const errorMsg = error.message || 'Failed to send estimate';
      
      if (errorMsg.includes('Gmail not connected')) {
        showToast('Gmail Not Connected - Please connect your Gmail account in Settings to send estimates via email.', 'error', 4000);
      } else {
        showToast(`Error: ${errorMsg}`, 'error');
      }
    }
  };

  const deleteEstimate = async (estimateId: string) => {
    if (!confirm('Are you sure you want to delete this estimate? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/quotes/${estimateId}?userId=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (selectedJob) {
          await fetchEstimatesForJob(selectedJob.id);
          // Recalculate job totals (customer total will update via useEffect)
          await calculateAllJobTotals(jobs);
        }
        setToast({ message: 'Estimate deleted successfully', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to delete estimate: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete estimate:', error);
      showToast('Failed to delete estimate. Please try again.', 'error');
    }
  };

  const downloadEstimatePDF = async (estimate: any) => {
    try {
      const { downloadQuotePDF } = await import('@/lib/pdf-generator');
      await downloadQuotePDF(estimate, 'Your Business');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      showToast('Failed to download PDF. Please try again.', 'error');
    }
  };

  const viewEstimateDetails = async (estimate: any) => {
    setSelectedEstimate(estimate);
    setShowEstimateViewModal(true);
    // Fetch financial breakdown if estimate is accepted
    if (estimate.status === 'accepted') {
      await fetchFinancialBreakdown(estimate.id);
    }
  };

  const fetchFinancialBreakdown = async (estimateId: string) => {
    try {
      const response = await fetch(`${API_URL}/quotes/${estimateId}/financial-breakdown?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setFinancialBreakdown(data);
      } else {
        setFinancialBreakdown(null);
      }
    } catch (error) {
      console.error('Failed to fetch financial breakdown:', error);
      setFinancialBreakdown(null);
    }
  };

  const viewInvoiceDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowInvoiceViewModal(true);
  };

  const sendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}/send?userId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send invoice';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setToast({ message: 'Invoice sent successfully!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      if (selectedJob) {
        await fetchInvoicesForJob(selectedJob.id);
        await calculateAllJobTotals(jobs);
      }
    } catch (error: any) {
      console.error('Failed to send invoice:', error);
      const errorMsg = error.message || 'Failed to send invoice';
      
      if (errorMsg.includes('Gmail not connected')) {
        showToast('Gmail Not Connected - Please connect your Gmail account in Settings to send invoices via email.', 'error', 4000);
      } else {
        showToast(`Error: ${errorMsg}`, 'error');
      }
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/invoices/${invoiceId}?userId=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (selectedJob) {
          await fetchInvoicesForJob(selectedJob.id);
          await calculateAllJobTotals(jobs);
        }
        setToast({ message: 'Invoice deleted successfully', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to delete invoice: ${errorData.message || response.statusText}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      showToast('Failed to delete invoice. Please try again.', 'error');
    }
  };

  const updateItemProgress = async (estimateId: string, itemId: string, progress: number) => {
    try {
      const response = await fetch(`${API_URL}/quotes/${estimateId}/items/${itemId}/progress?userId=${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      // Update local state
      setEstimates(estimates.map(e => {
        if (e.id === estimateId) {
          return {
            ...e,
            items: e.items.map((item: any) => 
              item.id === itemId ? { ...item, progress } : item
            )
          };
        }
        return e;
      }));

      // Update selectedEstimate if it's the one being modified
      if (selectedEstimate?.id === estimateId) {
        setSelectedEstimate({
          ...selectedEstimate,
          items: selectedEstimate.items.map((item: any) =>
            item.id === itemId ? { ...item, progress } : item
          )
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      showToast('Failed to update progress', 'error');
    }
  };

  const getInvoicedAmountForQuote = (quoteId: string) => {
    // Sum only sent/paid invoices (not drafts) created from this quote
    return invoices
      .filter((inv: any) => inv.quoteId === quoteId && inv.status !== 'draft')
      .reduce((sum: number, inv: any) => sum + inv.total, 0);
  };

  const createProgressInvoice = async (estimateId: string) => {
    const estimate = estimates.find(e => e.id === estimateId);
    if (!estimate) {
      showToast('Estimate not found', 'error');
      return;
    }

    // Check if any items have progress
    const itemsWithProgress = estimate.items.filter((item: any) => item.progress > 0);
    if (itemsWithProgress.length === 0) {
      setToast({ message: 'No items have progress set. Please update the progress for at least one item before creating an invoice.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // Calculate invoice amounts based on progress
    const subtotal = estimate.items.reduce((sum: number, item: any) => sum + (item.total * (item.progress / 100)), 0);
    const taxRate = estimate.subtotal > 0 ? estimate.tax / estimate.subtotal : 0;
    const tax = subtotal * taxRate;
    const discountRate = estimate.subtotal > 0 ? estimate.discount / estimate.subtotal : 0;
    const discount = subtotal * discountRate;
    const total = subtotal + tax - discount;

    if (total <= 0) {
      showToast('Invoice total is $0. Please ensure items have progress greater than 0%.', 'error');
      return;
    }

    const confirmMsg = `Create progress invoice for $${total.toFixed(2)}?\n\nThis will invoice based on current progress:\n${itemsWithProgress.map((i: any) => `• ${i.description}: ${i.progress}%`).join('\n')}`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/invoices/progress-from-quote/${estimateId}?userId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create progress invoice');
      }

      const invoice = await response.json();
      showToast(`Progress invoice created successfully! Invoice #${invoice.invoiceNumber} - $${invoice.total.toFixed(2)}`, 'success', 4000);
      
      // Refresh invoices list for the job
      if (selectedJob) {
        await fetchInvoicesForJob(selectedJob.id);
      }
    } catch (error) {
      console.error('Error creating progress invoice:', error);
      showToast('Failed to create progress invoice', 'error');
    }
  };

  const resetJobForm = () => {
    setNewJob({
      jobName: '',
      companyName: '',
      title: '',
      firstName: '',
      middleInitial: '',
      lastName: '',
      jobTitle: '',
      mainPhone: '',
      workPhone: '',
      mobile: '',
      fax: '',
      mainEmail: '',
      ccEmail: '',
      website: '',
      other1: '',
      invoiceBillToAddress: '',
      shipToAddress: '',
      defaultShippingAddress: false,
      openingBalance: '',
      openingBalanceDate: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setJobActiveTab('address');
  };

  const copyJobAddressToShipping = () => {
    setNewJob(prev => ({
      ...prev,
      shipToAddress: prev.invoiceBillToAddress,
    }));
  };

  if (subscriptionLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Customer List (QuickBooks Style) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Customers & Jobs</h2>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers..."
              className="pl-9 bg-gray-50"
            />
          </div>

          {/* View Tabs */}
          <div className="mt-3 flex gap-1 text-xs">
            <button className="px-3 py-1 bg-blue-600 text-white rounded">
              Active Customers
            </button>
            <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">
              All
            </button>
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto">
          {customers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No customers yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {customers.map((customer) => (
                <div key={customer.id}>
                  <button
                    onClick={() => {
                      if (selectedCustomer?.id === customer.id) {
                        setSelectedCustomer(null);
                        setCustomerTotalOwing(0);
                      } else {
                        setSelectedCustomer(customer);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                      selectedCustomer?.id === customer.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {customer.companyName || customer.name || 'Unnamed Customer'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {customer.mainEmail || customer.email || customer.mainPhone || customer.phone || 'No contact info'}
                        </div>
                      </div>
                      {!customer.isActive && (
                        <Badge className="bg-gray-400 text-xs">Inactive</Badge>
                      )}
                    </div>
                  </button>
                  
                  {/* Jobs under customer */}
                  {selectedCustomer?.id === customer.id && jobs.length > 0 && (
                    <div className="bg-gray-50 border-l-4 border-blue-600">
                      {jobs.map((job) => (
                        <button
                          key={job.id}
                          className="w-full text-left px-8 py-2 hover:bg-blue-100 transition-colors"
                        >
                          <div className="text-sm text-gray-700 truncate flex items-center gap-2">
                            <Briefcase className="h-3 w-3" />
                            {job.jobName}
                          </div>
                          <div className="text-xs text-gray-500">{job.status}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600">
            <div>Total: {customers.length} customers</div>
            <div>Active: {customers.filter(c => c.isActive).length}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Action Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateModal(true)}
            >
              New Customer & Job
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
            {selectedCustomer && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openJobModal(selectedCustomer)}
                >
                  Add Job
                </Button>
                {customerTotalOwing > 0 && (
                  <div className="ml-4 flex items-center gap-2 bg-orange-100 border border-orange-300 rounded-lg px-3 py-1.5">
                    <DollarSign className="h-4 w-4 text-orange-700" />
                    <div className="text-sm">
                      <span className="font-semibold text-orange-900">${customerTotalOwing.toFixed(2)}</span>
                      <span className="text-orange-700 ml-1">owing</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {selectedCustomer && (
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  const email = selectedCustomer.mainEmail || selectedCustomer.email;
                  if (email) {
                    window.location.href = `mailto:${email}`;
                  } else {
                    showToast('No email address for this customer', 'error');
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  if (jobs.length === 0) {
                    showToast('Create a job first, then add estimates to the job', 'error');
                  } else if (jobs.length === 1) {
                    openEstimateModal(jobs[0]);
                  } else {
                    showToast('Select or expand a job below, then click the estimate button on that job', 'error', 4000);
                  }
                }}
                disabled={jobs.length === 0}
              >
                <FileText className="h-4 w-4 mr-1" />
                Create Estimate
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  showToast('Create invoice from Billing page or from an estimate', 'error');
                }}
              >
                <Receipt className="h-4 w-4 mr-1" />
                Create Invoice
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => deleteCustomer(selectedCustomer.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Delete Customer
              </Button>
            </div>
          )}
        </div>

        {/* Customer Details Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!selectedCustomer ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Select a customer
                </h3>
                <p className="text-gray-500 mb-6">
                  Choose a customer from the list to view details
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Customer Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedCustomer.companyName || selectedCustomer.name}
                      </h2>
                      <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-md">
                        <div className="text-xs font-semibold">TOTAL OWING</div>
                        <div className="text-2xl font-bold">${customerTotalOwing.toFixed(2)}</div>
                      </div>
                    </div>
                    {selectedCustomer.companyName && selectedCustomer.firstName && (
                      <p className="text-gray-600 mb-3">
                        {selectedCustomer.title} {selectedCustomer.firstName} {selectedCustomer.middleInitial} {selectedCustomer.lastName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={selectedCustomer.isActive ? 'bg-green-500' : 'bg-gray-400'}>
                      {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {/* Grand Total Owing - Prominent Display */}
                {customerTotalOwing > 0 && (
                  <div className="mb-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-500 rounded-full p-3">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-orange-900 uppercase tracking-wide">Grand Total Owing</div>
                          <div className="text-xs text-orange-700 mt-0.5">From all accepted estimates across all jobs</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-orange-600">
                          ${customerTotalOwing.toFixed(2)}
                        </div>
                        <div className="text-xs text-orange-700 mt-1">
                          {jobs.filter(j => jobTotalsOwing[j.id] > 0).length} job{jobs.filter(j => jobTotalsOwing[j.id] > 0).length !== 1 ? 's' : ''} with balance
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Jobs List */}
                <div className="mb-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Jobs
                      <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                        Total Owing: ${customerTotalOwing.toFixed(2)}
                      </span>
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => openJobModal(selectedCustomer)}
                      variant="outline"
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Job
                    </Button>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <Briefcase className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">No jobs yet</p>
                      <p className="text-xs text-gray-500 mb-3">
                        Create a job to track project-specific work
                      </p>
                      <Button
                        size="sm"
                        onClick={() => openJobModal(selectedCustomer)}
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add First Job
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {jobs.map((job) => (
                        <div
                          key={job.id}
                          className={`border rounded-lg ${selectedJob?.id === job.id ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}
                        >
                          {/* Job Header - Always Visible */}
                          <div 
                            className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => selectJob(job)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {selectedJob?.id === job.id ? (
                                    <ChevronDown className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                  <Briefcase className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-medium text-sm text-gray-900">{job.jobName}</h4>
                                  <Badge className="text-xs">{job.status}</Badge>
                                </div>
                                
                                {job.description && selectedJob?.id !== job.id && (
                                  <p className="text-xs text-gray-600 mb-1 ml-10">{job.description}</p>
                                )}
                                
                                {selectedJob?.id !== job.id && (
                                  <div className="flex gap-4 ml-10 text-xs text-gray-600">
                                    {job.startDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(job.startDate).toLocaleDateString()}
                                      </div>
                                    )}
                                    {job.openingBalance !== null && job.openingBalance !== undefined && (
                                      <div className="font-semibold text-blue-600">
                                        Opening Balance: ${job.openingBalance.toFixed(2)}
                                      </div>
                                    )}
                                    {jobTotalsOwing[job.id] > 0 && (
                                      <div className="flex items-center gap-1 font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                        <DollarSign className="h-3 w-3" />
                                        Owing: ${jobTotalsOwing[job.id].toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-6 px-2"
                                  onClick={() => openJobEditModal(job)}
                                  title="Edit Job"
                                >
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-6 px-2"
                                  onClick={() => openEstimateModal(job)}
                                  title="Create Estimate"
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="text-xs h-6 px-2"
                                  onClick={() => deleteJob(job.id)}
                                  title="Delete Job"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Job Details - Only when selected */}
                          {selectedJob?.id === job.id && (
                            <div className="border-t border-gray-200 bg-gray-50">
                              {/* Total Owing Banner */}
                              {jobTotalsOwing[job.id] > 0 && (
                                <div className="p-3 bg-orange-50 border-b border-orange-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-5 w-5 text-orange-600" />
                                      <div>
                                        <div className="text-xs font-medium text-orange-900">Total Owing from Accepted Estimates</div>
                                        <div className="text-sm text-orange-700">This job has accepted estimates awaiting payment</div>
                                      </div>
                                    </div>
                                    <div className="text-2xl font-bold text-orange-600">
                                      ${jobTotalsOwing[job.id].toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Job Info */}
                              <div className="p-3 grid grid-cols-2 gap-3 text-xs">
                                {job.description && (
                                  <div className="col-span-2">
                                    <span className="font-medium text-gray-700">Description:</span>
                                    <p className="text-gray-600 mt-1">{job.description}</p>
                                  </div>
                                )}
                                {job.mainEmail && (
                                  <div className="flex items-center gap-1 text-gray-600">
                                    <Mail className="h-3 w-3" />
                                    {job.mainEmail}
                                  </div>
                                )}
                                {job.mainPhone && (
                                  <div className="flex items-center gap-1 text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    {job.mainPhone}
                                  </div>
                                )}
                                {job.startDate && (
                                  <div className="flex items-center gap-1 text-gray-600">
                                    <Calendar className="h-3 w-3" />
                                    Start: {new Date(job.startDate).toLocaleDateString()}
                                  </div>
                                )}
                                {job.invoiceBillToAddress && (
                                  <div className="flex items-center gap-1 text-gray-600">
                                    <MapPin className="h-3 w-3" />
                                    {job.invoiceBillToAddress.split('\n')[0]}
                                  </div>
                                )}
                                {job.openingBalance !== null && job.openingBalance !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3 text-gray-600" />
                                    <span className="font-semibold text-blue-600">
                                      ${job.openingBalance.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Job Tabs */}
                              <div className="border-t border-gray-200 bg-white">
                                <div className="flex gap-1 px-3 border-b border-gray-200">
                                  <button 
                                    onClick={() => setJobTab('estimates')}
                                    className={`px-3 py-2 text-xs font-medium border-b-2 ${
                                      jobTab === 'estimates' 
                                        ? 'border-blue-600 text-blue-600' 
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    Estimates ({estimates.length})
                                  </button>
                                  <button 
                                    onClick={() => setJobTab('invoices')}
                                    className={`px-3 py-2 text-xs font-medium border-b-2 ${
                                      jobTab === 'invoices' 
                                        ? 'border-blue-600 text-blue-600' 
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    Invoices ({invoices.length})
                                  </button>
                                  <button 
                                    onClick={() => setJobTab('notes')}
                                    className={`px-3 py-2 text-xs font-medium border-b-2 ${
                                      jobTab === 'notes' 
                                        ? 'border-blue-600 text-blue-600' 
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    Notes
                                  </button>
                                </div>

                                {/* Tab Content */}
                                <div className="p-3">
                                  {jobTab === 'estimates' && (
                                    <div>
                                      {estimates.length === 0 ? (
                                        <div className="text-center py-6 text-xs text-gray-500">
                                          No estimates yet. Click "Create Estimate" to add one.
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {estimates.map((estimate) => (
                                            <div key={estimate.id} className="border border-gray-200 rounded p-2 text-xs hover:bg-gray-50">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900">{estimate.title}</div>
                                                  <div className="text-gray-500 mt-1">#{estimate.quoteNumber}</div>
                                                  <Badge className="mt-1 text-xs">{estimate.status}</Badge>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-semibold text-blue-600">${estimate.total.toFixed(2)}</div>
                                                  <div className="flex gap-1 mt-1">
                                                    <Button size="sm" variant="outline" className="h-5 px-1 text-xs" onClick={() => viewEstimateDetails(estimate)}>
                                                      <Eye className="h-3 w-3" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-5 px-1 text-xs" onClick={() => downloadEstimatePDF(estimate)}>
                                                      <Download className="h-3 w-3" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-5 px-1 text-xs" onClick={() => sendEstimate(estimate.id)}>
                                                      <Send className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {jobTab === 'invoices' && (
                                    <div>
                                      {invoices.length === 0 ? (
                                        <div className="text-center py-6 text-xs text-gray-500">
                                          No invoices yet. Create from accepted estimates.
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {invoices.map((invoice) => (
                                            <div key={invoice.id} className="border border-gray-200 rounded p-2 text-xs hover:bg-gray-50">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900">{invoice.title || 'Invoice'}</div>
                                                  <div className="text-gray-500 mt-1">#{invoice.invoiceNumber}</div>
                                                  <Badge className="mt-1 text-xs">{invoice.status}</Badge>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-semibold text-blue-600">${invoice.total.toFixed(2)}</div>
                                                  {invoice.amountPaid > 0 && (
                                                    <div className="text-green-600 text-xs">Paid: ${invoice.amountPaid.toFixed(2)}</div>
                                                  )}
                                                  <div className="flex gap-1 mt-1 justify-end">
                                                    <Button 
                                                      size="sm" 
                                                      variant="outline" 
                                                      className="h-5 px-2 text-xs" 
                                                      onClick={() => viewInvoiceDetails(invoice)}
                                                      title="View Invoice"
                                                    >
                                                      <Eye className="h-3 w-3" />
                                                    </Button>
                                                    {invoice.status === 'draft' && (
                                                      <Button 
                                                        size="sm" 
                                                        variant="default" 
                                                        className="h-5 px-2 text-xs bg-blue-600" 
                                                        onClick={() => sendInvoice(invoice.id)}
                                                        title="Send Invoice to Customer"
                                                      >
                                                        <Send className="h-3 w-3" />
                                                      </Button>
                                                    )}
                                                    <Button 
                                                      size="sm" 
                                                      variant="destructive" 
                                                      className="h-5 px-2 text-xs" 
                                                      onClick={() => deleteInvoice(invoice.id)}
                                                      title="Delete Invoice"
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {jobTab === 'notes' && (
                                    <div className="text-center py-6 text-xs text-gray-500">
                                      Notes feature coming soon...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Contact Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      {selectedCustomer.mainEmail && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {selectedCustomer.mainEmail}
                        </div>
                      )}
                      {selectedCustomer.mainPhone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {selectedCustomer.mainPhone}
                        </div>
                      )}
                      {selectedCustomer.mobile && (
                        <div className="text-gray-600 pl-6">Mobile: {selectedCustomer.mobile}</div>
                      )}
                      {selectedCustomer.workPhone && (
                        <div className="text-gray-600 pl-6">Work: {selectedCustomer.workPhone}</div>
                      )}
                      {selectedCustomer.website && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Globe className="h-4 w-4 text-gray-400" />
                          {selectedCustomer.website}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Address</h3>
                    {(() => {
                      const customerAddress = selectedCustomer.invoiceBillToAddress || selectedCustomer.address || selectedCustomer.shipToAddress;
                      const jobAddress = jobs.length > 0 ? jobs[0].invoiceBillToAddress : null;
                      const displayAddress = customerAddress || jobAddress;
                      
                      return displayAddress ? (
                        <div className="text-sm text-gray-600 whitespace-pre-line">
                          {displayAddress}
                          {!customerAddress && jobAddress && (
                            <span className="text-xs text-gray-400 block mt-1">(from job)</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">No address on file</div>
                      );
                    })()}
                  </div>

                  {/* Financial */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial</h3>
                    <div className="space-y-2 text-sm">
                      {selectedCustomer.openingBalance !== null && selectedCustomer.openingBalance !== undefined ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          Opening Balance: ${selectedCustomer.openingBalance.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-gray-400">No opening balance</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">New Customer</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Customer Name and Opening Balance */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CUSTOMER NAME
                  </label>
                  <Input
                    value={newCustomer.companyName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                    placeholder="Company or full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OPENING BALANCE
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newCustomer.openingBalance}
                      onChange={(e) => setNewCustomer({ ...newCustomer, openingBalance: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AS OF
                    </label>
                    <Input
                      type="date"
                      value={newCustomer.openingBalanceDate}
                      onChange={(e) => setNewCustomer({ ...newCustomer, openingBalanceDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex gap-2">
                  {[
                    { id: 'address', label: 'Address Info' },
                    { id: 'payment', label: 'Payment Settings' },
                    { id: 'tax', label: 'Sales Tax Settings' },
                    { id: 'additional', label: 'Additional Info' },
                    { id: 'job', label: 'Job Info' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address Info Tab */}
              {activeTab === 'address' && (
                <div className="space-y-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      COMPANY NAME
                    </label>
                    <Input
                      value={newCustomer.companyName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                    />
                  </div>

                  {/* Full Name */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        FULL NAME
                      </label>
                      <select
                        value={newCustomer.title}
                        onChange={(e) => setNewCustomer({ ...newCustomer, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Mr./Ms./...</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        &nbsp;
                      </label>
                      <Input
                        value={newCustomer.firstName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                        placeholder="First"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        &nbsp;
                      </label>
                      <Input
                        value={newCustomer.middleInitial}
                        onChange={(e) => setNewCustomer({ ...newCustomer, middleInitial: e.target.value })}
                        placeholder="M.I."
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        &nbsp;
                      </label>
                      <Input
                        value={newCustomer.lastName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                        placeholder="Last"
                      />
                    </div>
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      JOB TITLE
                    </label>
                    <Input
                      value={newCustomer.jobTitle}
                      onChange={(e) => setNewCustomer({ ...newCustomer, jobTitle: e.target.value })}
                    />
                  </div>

                  {/* Contact Methods - Left Column */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Main Phone
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newCustomer.mainPhone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, mainPhone: e.target.value })}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Work Phone
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newCustomer.workPhone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, workPhone: e.target.value })}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newCustomer.mobile}
                            onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                            placeholder="Mobile number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fax
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newCustomer.fax}
                            onChange={(e) => setNewCustomer({ ...newCustomer, fax: e.target.value })}
                            placeholder="Fax number"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Methods - Right Column */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Main Email
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="email"
                            value={newCustomer.mainEmail}
                            onChange={(e) => setNewCustomer({ ...newCustomer, mainEmail: e.target.value })}
                            placeholder="Email address"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CC Email
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="email"
                            value={newCustomer.ccEmail}
                            onChange={(e) => setNewCustomer({ ...newCustomer, ccEmail: e.target.value })}
                            placeholder="CC Email"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Website
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newCustomer.website}
                            onChange={(e) => setNewCustomer({ ...newCustomer, website: e.target.value })}
                            placeholder="Website URL"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Other 1
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newCustomer.other1}
                            onChange={(e) => setNewCustomer({ ...newCustomer, other1: e.target.value })}
                            placeholder="Other contact"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-sm text-gray-700 mb-3">ADDRESS DETAILS</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Invoice/Bill To */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          INVOICE/BILL TO
                        </label>
                        <Textarea
                          value={newCustomer.invoiceBillToAddress}
                          onChange={(e) => setNewCustomer({ ...newCustomer, invoiceBillToAddress: e.target.value })}
                          placeholder="Street address&#10;City, State ZIP"
                          rows={4}
                        />
                      </div>

                      {/* Ship To */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            SHIP TO
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={copyAddressToShipping}
                          >
                            Copy &gt;&gt;
                          </Button>
                        </div>
                        <Textarea
                          value={newCustomer.shipToAddress}
                          onChange={(e) => setNewCustomer({ ...newCustomer, shipToAddress: e.target.value })}
                          placeholder="Street address&#10;City, State ZIP"
                          rows={4}
                        />
                        <div className="mt-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newCustomer.defaultShippingAddress}
                              onChange={(e) => setNewCustomer({ ...newCustomer, defaultShippingAddress: e.target.checked })}
                              className="rounded"
                            />
                            Default shipping address
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Tabs (Placeholder) */}
              {activeTab === 'payment' && (
                <div className="text-center py-8 text-gray-500">
                  Payment settings coming soon
                </div>
              )}
              {activeTab === 'tax' && (
                <div className="text-center py-8 text-gray-500">
                  Sales tax settings coming soon
                </div>
              )}
              {activeTab === 'additional' && (
                <div className="text-center py-8 text-gray-500">
                  Additional information coming soon
                </div>
              )}
              {activeTab === 'job' && (
                <div className="text-center py-8 text-gray-500">
                  Job information coming soon
                </div>
              )}

              {/* Customer Status */}
              <div className="mt-6 pt-4 border-t">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!newCustomer.isActive}
                    onChange={(e) => setNewCustomer({ ...newCustomer, isActive: !e.target.checked })}
                    className="rounded"
                  />
                  Customer is inactive
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createCustomer}
                className="bg-blue-600 hover:bg-blue-700"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Job Modal */}
      {showJobModal && selectedCustomerForJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">New Job</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Customer: {selectedCustomerForJob.companyName || selectedCustomerForJob.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowJobModal(false);
                    resetJobForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Job Name and Opening Balance */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JOB NAME *
                  </label>
                  <Input
                    value={newJob.jobName}
                    onChange={(e) => setNewJob({ ...newJob, jobName: e.target.value })}
                    placeholder="Enter job name"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OPENING BALANCE
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newJob.openingBalance}
                      onChange={(e) => setNewJob({ ...newJob, openingBalance: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AS OF
                    </label>
                    <Input
                      type="date"
                      value={newJob.openingBalanceDate}
                      onChange={(e) => setNewJob({ ...newJob, openingBalanceDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex gap-2">
                  {[
                    { id: 'address', label: 'Address Info' },
                    { id: 'payment', label: 'Payment Settings' },
                    { id: 'tax', label: 'Sales Tax Settings' },
                    { id: 'additional', label: 'Additional Info' },
                    { id: 'job', label: 'Job Info' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setJobActiveTab(tab.id as any)}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        jobActiveTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address Info Tab */}
              {jobActiveTab === 'address' && (
                <div className="space-y-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      COMPANY NAME
                    </label>
                    <Input
                      value={newJob.companyName}
                      onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })}
                    />
                  </div>

                  {/* Full Name */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        FULL NAME
                      </label>
                      <select
                        value={newJob.title}
                        onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Mr./Ms./...</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        &nbsp;
                      </label>
                      <Input
                        value={newJob.firstName}
                        onChange={(e) => setNewJob({ ...newJob, firstName: e.target.value })}
                        placeholder="First"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        &nbsp;
                      </label>
                      <Input
                        value={newJob.middleInitial}
                        onChange={(e) => setNewJob({ ...newJob, middleInitial: e.target.value })}
                        placeholder="M.I."
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        &nbsp;
                      </label>
                      <Input
                        value={newJob.lastName}
                        onChange={(e) => setNewJob({ ...newJob, lastName: e.target.value })}
                        placeholder="Last"
                      />
                    </div>
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      JOB TITLE
                    </label>
                    <Input
                      value={newJob.jobTitle}
                      onChange={(e) => setNewJob({ ...newJob, jobTitle: e.target.value })}
                    />
                  </div>

                  {/* Contact Methods */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Main Phone
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newJob.mainPhone}
                            onChange={(e) => setNewJob({ ...newJob, mainPhone: e.target.value })}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Work Phone
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newJob.workPhone}
                            onChange={(e) => setNewJob({ ...newJob, workPhone: e.target.value })}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newJob.mobile}
                            onChange={(e) => setNewJob({ ...newJob, mobile: e.target.value })}
                            placeholder="Mobile number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fax
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newJob.fax}
                            onChange={(e) => setNewJob({ ...newJob, fax: e.target.value })}
                            placeholder="Fax number"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Main Email
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="email"
                            value={newJob.mainEmail}
                            onChange={(e) => setNewJob({ ...newJob, mainEmail: e.target.value })}
                            placeholder="Email address"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CC Email
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="email"
                            value={newJob.ccEmail}
                            onChange={(e) => setNewJob({ ...newJob, ccEmail: e.target.value })}
                            placeholder="CC Email"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Website
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newJob.website}
                            onChange={(e) => setNewJob({ ...newJob, website: e.target.value })}
                            placeholder="Website URL"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Other 1
                          </label>
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={newJob.other1}
                            onChange={(e) => setNewJob({ ...newJob, other1: e.target.value })}
                            placeholder="Other contact"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-sm text-gray-700 mb-3">ADDRESS DETAILS</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          INVOICE/BILL TO
                        </label>
                        <Textarea
                          value={newJob.invoiceBillToAddress}
                          onChange={(e) => setNewJob({ ...newJob, invoiceBillToAddress: e.target.value })}
                          placeholder="Street address&#10;City, State ZIP"
                          rows={4}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            SHIP TO
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={copyJobAddressToShipping}
                          >
                            Copy &gt;&gt;
                          </Button>
                        </div>
                        <Textarea
                          value={newJob.shipToAddress}
                          onChange={(e) => setNewJob({ ...newJob, shipToAddress: e.target.value })}
                          placeholder="Street address&#10;City, State ZIP"
                          rows={4}
                        />
                        <div className="mt-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newJob.defaultShippingAddress}
                              onChange={(e) => setNewJob({ ...newJob, defaultShippingAddress: e.target.checked })}
                              className="rounded"
                            />
                            Default shipping address
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Tabs (Placeholder) */}
              {jobActiveTab === 'payment' && (
                <div className="text-center py-8 text-gray-500">
                  Payment settings coming soon
                </div>
              )}
              {jobActiveTab === 'tax' && (
                <div className="text-center py-8 text-gray-500">
                  Sales tax settings coming soon
                </div>
              )}
              {jobActiveTab === 'additional' && (
                <div className="text-center py-8 text-gray-500">
                  Additional information coming soon
                </div>
              )}
              {jobActiveTab === 'job' && (
                <div className="text-center py-8 text-gray-500">
                  Job information coming soon
                </div>
              )}

              {/* Job Status */}
              <div className="mt-6 pt-4 border-t">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!newJob.isActive}
                    onChange={(e) => setNewJob({ ...newJob, isActive: !e.target.checked })}
                    className="rounded"
                  />
                  Job is inactive
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJobModal(false);
                  resetJobForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createJob}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newJob.jobName}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showJobEditModal && selectedJobForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Edit Job</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedJobForEdit.jobName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowJobEditModal(false);
                    setSelectedJobForEdit(null);
                    resetJobForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Job Name and Opening Balance */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JOB NAME *
                  </label>
                  <Input
                    value={newJob.jobName}
                    onChange={(e) => setNewJob({ ...newJob, jobName: e.target.value })}
                    placeholder="Enter job name"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OPENING BALANCE
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newJob.openingBalance}
                      onChange={(e) => setNewJob({ ...newJob, openingBalance: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AS OF
                    </label>
                    <Input
                      type="date"
                      value={newJob.openingBalanceDate}
                      onChange={(e) => setNewJob({ ...newJob, openingBalanceDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex gap-2">
                  {[
                    { id: 'address', label: 'Address' },
                    { id: 'payment', label: 'Payment and Billing' },
                    { id: 'tax', label: 'Tax Info' },
                    { id: 'additional', label: 'Additional Info' },
                    { id: 'job', label: 'Job Info' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setJobActiveTab(tab.id as any)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        jobActiveTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content - Address */}
              {jobActiveTab === 'address' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">TITLE</label>
                      <select
                        value={newJob.title}
                        onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select</option>
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                        <option value="Dr">Dr</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">FIRST NAME</label>
                      <Input
                        value={newJob.firstName}
                        onChange={(e) => setNewJob({ ...newJob, firstName: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">M.I.</label>
                      <Input
                        value={newJob.middleInitial}
                        onChange={(e) => setNewJob({ ...newJob, middleInitial: e.target.value })}
                        maxLength={1}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">LAST NAME</label>
                      <Input
                        value={newJob.lastName}
                        onChange={(e) => setNewJob({ ...newJob, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">COMPANY</label>
                      <Input
                        value={newJob.companyName}
                        onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">JOB TITLE</label>
                      <Input
                        value={newJob.jobTitle}
                        onChange={(e) => setNewJob({ ...newJob, jobTitle: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice/Bill To
                      </label>
                      <textarea
                        value={newJob.invoiceBillToAddress}
                        onChange={(e) => setNewJob({ ...newJob, invoiceBillToAddress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="Street, City, State ZIP"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={newJob.defaultShippingAddress}
                          onChange={(e) => setNewJob({ ...newJob, defaultShippingAddress: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Default shipping address</span>
                      </label>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ship To
                          </label>
                          <textarea
                            value={newJob.shipToAddress}
                            onChange={(e) => setNewJob({ ...newJob, shipToAddress: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={3}
                            placeholder="Street, City, State ZIP"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={copyJobAddressToShipping}
                          className="mt-7"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content - Payment */}
              {jobActiveTab === 'payment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MAIN PHONE</label>
                      <Input
                        value={newJob.mainPhone}
                        onChange={(e) => setNewJob({ ...newJob, mainPhone: e.target.value })}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">WORK PHONE</label>
                      <Input
                        value={newJob.workPhone}
                        onChange={(e) => setNewJob({ ...newJob, workPhone: e.target.value })}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MOBILE</label>
                      <Input
                        value={newJob.mobile}
                        onChange={(e) => setNewJob({ ...newJob, mobile: e.target.value })}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">FAX</label>
                      <Input
                        value={newJob.fax}
                        onChange={(e) => setNewJob({ ...newJob, fax: e.target.value })}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MAIN EMAIL</label>
                      <Input
                        type="email"
                        value={newJob.mainEmail}
                        onChange={(e) => setNewJob({ ...newJob, mainEmail: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CC EMAIL</label>
                      <Input
                        type="email"
                        value={newJob.ccEmail}
                        onChange={(e) => setNewJob({ ...newJob, ccEmail: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">WEBSITE</label>
                      <Input
                        value={newJob.website}
                        onChange={(e) => setNewJob({ ...newJob, website: e.target.value })}
                        placeholder="www.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">OTHER</label>
                      <Input
                        value={newJob.other1}
                        onChange={(e) => setNewJob({ ...newJob, other1: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content - Tax */}
              {jobActiveTab === 'tax' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Tax information coming soon...</p>
                </div>
              )}

              {/* Tab Content - Additional */}
              {jobActiveTab === 'additional' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Additional information coming soon...</p>
                </div>
              )}

              {/* Tab Content - Job Info */}
              {jobActiveTab === 'job' && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!newJob.isActive}
                      onChange={(e) => setNewJob({ ...newJob, isActive: !e.target.checked })}
                      className="rounded"
                    />
                    Job is inactive
                  </label>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJobEditModal(false);
                  setSelectedJobForEdit(null);
                  resetJobForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={updateJob}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newJob.jobName}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Estimate Modal */}
      {showEstimateModal && selectedJobForEstimate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Create Estimate</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Job: {selectedJobForEstimate.jobName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEstimateModal(false);
                    setSelectedJobForEstimate(null);
                    setAiPrompt('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* AI Quote Generator */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-semibold text-lg mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ✨ AI Estimate Generator
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
                    onClick={generateEstimateWithAI}
                    disabled={!aiPrompt.trim() || generatingQuote}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 whitespace-nowrap self-end"
                  >
                    {generatingQuote ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <p className="text-sm text-gray-500 text-center">Or manually create an estimate below:</p>
              </div>

              {/* Title and Description */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TITLE *
                  </label>
                  <Input
                    value={newEstimate.title}
                    onChange={(e) => setNewEstimate({ ...newEstimate, title: e.target.value })}
                    placeholder="Estimate title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DESCRIPTION
                  </label>
                  <Textarea
                    value={newEstimate.description}
                    onChange={(e) => setNewEstimate({ ...newEstimate, description: e.target.value })}
                    placeholder="Estimate description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    LINE ITEMS
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addEstimateItem}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {newEstimate.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateEstimateItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateEstimateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateEstimateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Total
                          </label>
                          <div className="text-sm font-semibold text-gray-900 py-2">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-end">
                          {newEstimate.items.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => removeEstimateItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax, Discount, Totals */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TAX RATE (%)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newEstimate.taxRate}
                      onChange={(e) => setNewEstimate({ ...newEstimate, taxRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DISCOUNT ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newEstimate.discount}
                      onChange={(e) => setNewEstimate({ ...newEstimate, discount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm font-medium">${calculateEstimateTotal().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tax:</span>
                      <span className="text-sm font-medium">${calculateEstimateTotal().tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium">-${newEstimate.discount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-base font-semibold">Total:</span>
                      <span className="text-base font-bold text-blue-600">${calculateEstimateTotal().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NOTES
                </label>
                <Textarea
                  value={newEstimate.notes}
                  onChange={(e) => setNewEstimate({ ...newEstimate, notes: e.target.value })}
                  placeholder="Additional notes for the estimate"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEstimateModal(false);
                  setSelectedJobForEstimate(null);
                  setAiPrompt('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createEstimate}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newEstimate.title}
              >
                Create Estimate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Estimate Details Modal */}
      {showEstimateViewModal && selectedEstimate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedEstimate.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Quote #{selectedEstimate.quoteNumber}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEstimateViewModal(false);
                    setSelectedEstimate(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Description */}
              {selectedEstimate.description && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <p className="text-gray-900">{selectedEstimate.description}</p>
                </div>
              )}

              {/* Line Items */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Line Items & Progress
                </label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Total</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">Progress %</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedEstimate.items?.map((item: any, index: number) => {
                        const progress = item.progress || 0;
                        const progressAmount = item.total * (progress / 100);
                        const alreadyInvoiced = getInvoicedAmountForQuote(selectedEstimate.id);
                        const totalInvoiced = alreadyInvoiced;
                        // Calculate remaining: total minus what we plan to invoice (based on current progress)
                        const remaining = item.total - progressAmount;
                        return (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.total.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={(e) => updateItemProgress(selectedEstimate.id, item.id, parseInt(e.target.value) || 0)}
                                className="w-16 h-7 text-center text-xs"
                              />
                              <span className="text-xs text-gray-600">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={remaining > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                              ${remaining.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="mb-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${selectedEstimate.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">${selectedEstimate.tax.toFixed(2)}</span>
                  </div>
                  {selectedEstimate.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium">-${selectedEstimate.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-base font-semibold">Total:</span>
                    <span className="text-base font-bold text-blue-600">${selectedEstimate.total.toFixed(2)}</span>
                  </div>
                  {selectedEstimate.status === 'accepted' && (() => {
                    const alreadyInvoiced = getInvoicedAmountForQuote(selectedEstimate.id);
                    const currentProgress = selectedEstimate.items?.reduce((sum: number, item: any) => 
                      sum + (item.total * ((item.progress || 0) / 100)), 0) || 0;
                    const availableToInvoice = currentProgress - alreadyInvoiced;
                    const totalRemaining = selectedEstimate.total - currentProgress;
                    
                    return (
                      <>
                        <div className="border-t-2 border-blue-200 pt-3 mt-3">
                          <div className="bg-blue-50 p-3 rounded-lg mb-2">
                            <div className="text-xs font-semibold text-blue-900 uppercase mb-2">Progress Billing Status</div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">Already Invoiced (Sent):</span>
                              <span className="font-semibold text-green-700">${alreadyInvoiced.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">Current Progress Value:</span>
                              <span className="font-semibold text-blue-700">${currentProgress.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between text-sm">
                              <span className="font-bold text-gray-900">Available to Invoice Now:</span>
                              <span className={`font-bold text-lg ${availableToInvoice > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                                ${availableToInvoice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-600">Remaining Work Not Yet Complete:</span>
                            <span className="font-medium text-gray-700">${totalRemaining.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Notes */}
              {selectedEstimate.notes && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedEstimate.notes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span> {new Date(selectedEstimate.createdAt).toLocaleDateString()}
                </div>
                {selectedEstimate.expiresAt && (
                  <div>
                    <span className="font-medium">Expires:</span> {new Date(selectedEstimate.expiresAt).toLocaleDateString()}
                  </div>
                )}
                {selectedEstimate.sentAt && (
                  <div>
                    <span className="font-medium">Sent:</span> {new Date(selectedEstimate.sentAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-between">
              {(() => {
                const alreadyInvoiced = getInvoicedAmountForQuote(selectedEstimate.id);
                const currentProgress = selectedEstimate.items?.reduce((sum: number, item: any) => 
                  sum + (item.total * ((item.progress || 0) / 100)), 0) || 0;
                const availableToInvoice = currentProgress - alreadyInvoiced;
                const hasProgress = selectedEstimate.items?.some((item: any) => item.progress > 0);
                const canInvoice = hasProgress && availableToInvoice > 0;

                return (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (availableToInvoice <= 0) {
                        showToast('Nothing New to Invoice - You have already invoiced up to the current progress level. Update progress percentages to create another invoice.', 'error', 5000);
                        return;
                      }
                      createProgressInvoice(selectedEstimate.id);
                    }}
                    disabled={!canInvoice}
                    className={`${canInvoice ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    title={!canInvoice ? 'Update progress to enable invoicing' : `Invoice $${availableToInvoice.toFixed(2)} based on new progress`}
                  >
                    {canInvoice ? `Invoice $${availableToInvoice.toFixed(2)} (New Progress)` : 'Create Progress Invoice'}
                  </Button>
                );
              })()}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => downloadEstimatePDF(selectedEstimate)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendEstimate(selectedEstimate.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send via Email
                </Button>
                <Button
                  onClick={() => {
                    setShowEstimateViewModal(false);
                    setSelectedEstimate(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {showInvoiceViewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
                <button
                  onClick={() => {
                    setShowInvoiceViewModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Invoice Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedInvoice.title}</h3>
                    <p className="text-sm text-gray-500">Invoice #{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <Badge className={`text-sm ${
                    selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    selectedInvoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedInvoice.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Issue Date:</span>
                    <span className="ml-2 font-medium">{new Date(selectedInvoice.issueDate || selectedInvoice.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <span className="ml-2 font-medium">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {selectedInvoice.description && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInvoice.description}</p>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Line Items
                </label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedInvoice.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="mb-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">${selectedInvoice.tax.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium">-${selectedInvoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-base font-semibold">Total:</span>
                    <span className="text-base font-bold text-blue-600">${selectedInvoice.total.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount Paid:</span>
                        <span className="font-medium text-green-600">${selectedInvoice.amountPaid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-700">Amount Due:</span>
                        <span className="text-red-600">${selectedInvoice.amountDue.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowInvoiceViewModal(false);
                  setSelectedInvoice(null);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div 
          className="fixed top-4 right-4 z-[99999] transition-all duration-300"
          style={{
            transform: 'translateX(0)',
            opacity: 1
          }}
        >
          <div className={`px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] ${
            toast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium text-base">{toast.message}</span>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
