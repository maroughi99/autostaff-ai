'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bot, CheckCircle, Zap, MessageSquare, Mail, Users, Clock, Save, Loader2, Calendar, DollarSign, Globe, Briefcase } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureLocked } from "@/components/FeatureLocked";
import { API_URL } from '@/lib/utils';
import { toast } from 'sonner';

export default function AutomationPage() {
  const { user } = useUser();
  const { hasFeature, plan, loading: subscriptionLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI Behavior Settings
  const [aiAutoApprove, setAiAutoApprove] = useState(false);
  const [autoRespondEmails, setAutoRespondEmails] = useState(true);
  const [autoCategorizeleads, setAutoCategorizeleads] = useState(true);
  const [autoFollowUp, setAutoFollowUp] = useState(false);
  
  // Response Settings
  const [responseTone, setResponseTone] = useState('professional');
  const [responseLength, setResponseLength] = useState('medium');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [signature, setSignature] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [responseLanguage, setResponseLanguage] = useState('en');
  
  // Working Hours
  const [respectWorkingHours, setRespectWorkingHours] = useState(true);
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  const [workingDays, setWorkingDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [autoResponseOutsideHours, setAutoResponseOutsideHours] = useState(true);
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState('');
  
  // Lead Automation
  const [autoQualifyLeads, setAutoQualifyLeads] = useState(true);
  const [autoAssignPriority, setAutoAssignPriority] = useState(true);
  const [autoScheduleFollowUp, setAutoScheduleFollowUp] = useState(false);
  const [followUpDelayDays, setFollowUpDelayDays] = useState(3);
  const [autoCreateLeadsFromEmails, setAutoCreateLeadsFromEmails] = useState(true);
  const [leadScoreThreshold, setLeadScoreThreshold] = useState(7);
  
  // Quote/Estimate Settings
  const [autoGenerateQuotes, setAutoGenerateQuotes] = useState(true);
  const [requireQuoteApproval, setRequireQuoteApproval] = useState(true);
  const [minQuoteAmount, setMinQuoteAmount] = useState(100);
  const [maxQuoteAmount, setMaxQuoteAmount] = useState(10000);
  const [includeTermsInQuotes, setIncludeTermsInQuotes] = useState(true);
  const [quoteValidityDays, setQuoteValidityDays] = useState(30);
  
  // Email Filters
  const [spamFilter, setSpamFilter] = useState(true);
  const [autoArchiveMarketing, setAutoArchiveMarketing] = useState(false);
  const [requireApprovalForNew, setRequireApprovalForNew] = useState(true);
  
  // Calendar & Booking
  const [autoBookAppointments, setAutoBookAppointments] = useState(false);
  const [bufferTimeBetweenBookings, setBufferTimeBetweenBookings] = useState(30);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState(5);
  const [sendBookingReminders, setSendBookingReminders] = useState(true);
  const [reminderHoursBefore, setReminderHoursBefore] = useState(24);

  // Pricing Guide
  const [usePricingGuide, setUsePricingGuide] = useState(false);
  const [uploadingPricing, setUploadingPricing] = useState(false);
  const [pricingItems, setPricingItems] = useState<any[]>([]);
  const [showPricingItems, setShowPricingItems] = useState(false);

  useEffect(() => {
    loadAutomationSettings();
    loadPricingSettings();
    loadPricingItems();
  }, [user?.id]);

  const loadAutomationSettings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/ai/automation-settings?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        
        // AI Behavior
        setAiAutoApprove(data.aiAutoApprove ?? false);
        setAutoRespondEmails(data.autoRespondEmails ?? true);
        setAutoCategorizeleads(data.autoCategorizeleads ?? true);
        setAutoFollowUp(data.autoFollowUp ?? false);
        
        // Response Settings
        setResponseTone(data.responseTone ?? 'professional');
        setResponseLength(data.responseLength ?? 'medium');
        setIncludeSignature(data.includeSignature ?? true);
        setSignature(data.signature ?? '');
        setCustomInstructions(data.customInstructions ?? '');
        setResponseLanguage(data.responseLanguage ?? 'en');
        
        // Working Hours
        setRespectWorkingHours(data.respectWorkingHours ?? true);
        setWorkingHoursStart(data.workingHoursStart ?? '09:00');
        setWorkingHoursEnd(data.workingHoursEnd ?? '17:00');
        setWorkingDays(data.workingDays ?? ['mon', 'tue', 'wed', 'thu', 'fri']);
        setAutoResponseOutsideHours(data.autoResponseOutsideHours ?? true);
        setOutOfOfficeMessage(data.outOfOfficeMessage ?? '');
        
        // Lead Automation
        setAutoQualifyLeads(data.autoQualifyLeads ?? true);
        setAutoAssignPriority(data.autoAssignPriority ?? true);
        setAutoScheduleFollowUp(data.autoScheduleFollowUp ?? false);
        setFollowUpDelayDays(data.followUpDelayDays ?? 3);
        setAutoCreateLeadsFromEmails(data.autoCreateLeadsFromEmails ?? true);
        setLeadScoreThreshold(data.leadScoreThreshold ?? 7);
        
        // Quote/Estimate Settings
        setAutoGenerateQuotes(data.autoGenerateQuotes ?? true);
        setRequireQuoteApproval(data.requireQuoteApproval ?? true);
        setMinQuoteAmount(data.minQuoteAmount ?? 100);
        setMaxQuoteAmount(data.maxQuoteAmount ?? 10000);
        setIncludeTermsInQuotes(data.includeTermsInQuotes ?? true);
        setQuoteValidityDays(data.quoteValidityDays ?? 30);
        
        // Email Filters
        setSpamFilter(data.spamFilter ?? true);
        setAutoArchiveMarketing(data.autoArchiveMarketing ?? false);
        setRequireApprovalForNew(data.requireApprovalForNew ?? true);
        
        // Calendar & Booking
        setAutoBookAppointments(data.autoBookAppointments ?? false);
        setBufferTimeBetweenBookings(data.bufferTimeBetweenBookings ?? 30);
        setMaxBookingsPerDay(data.maxBookingsPerDay ?? 5);
        setSendBookingReminders(data.sendBookingReminders ?? true);
        setReminderHoursBefore(data.reminderHoursBefore ?? 24);
      }
    } catch (error) {
      console.error('Failed to load automation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const settings = {
        userId: user.id,
        // AI Behavior
        aiAutoApprove,
        autoRespondEmails,
        autoCategorizeleads,
        autoFollowUp,
        // Response Settings
        responseTone,
        responseLength,
        includeSignature,
        signature,
        customInstructions,
        responseLanguage,
        // Working Hours
        respectWorkingHours,
        workingHoursStart,
        workingHoursEnd,
        workingDays,
        autoResponseOutsideHours,
        outOfOfficeMessage,
        // Lead Automation
        autoQualifyLeads,
        autoAssignPriority,
        autoScheduleFollowUp,
        followUpDelayDays,
        autoCreateLeadsFromEmails,
        leadScoreThreshold,
        // Quote/Estimate Settings
        autoGenerateQuotes,
        requireQuoteApproval,
        minQuoteAmount,
        maxQuoteAmount,
        includeTermsInQuotes,
        quoteValidityDays,
        // Email Filters
        spamFilter,
        autoArchiveMarketing,
        requireApprovalForNew,
        // Calendar & Booking
        autoBookAppointments,
        bufferTimeBetweenBookings,
        maxBookingsPerDay,
        sendBookingReminders,
        reminderHoursBefore,
      };

      const response = await fetch(`${API_URL}/ai/automation-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Automation settings saved successfully! ⚙️');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save automation settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePricingGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingPricing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const response = await fetch(`${API_URL}/pricing/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`🎉 Parsed ${result.itemsCreated} pricing items!`);
        if (result.needsReview > 0) {
          toast.warning(`⚠️ ${result.needsReview} items need review`);
        }
        loadPricingItems();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Failed to upload pricing guide:', error);
      toast.error('Failed to upload pricing guide');
    } finally {
      setUploadingPricing(false);
      e.target.value = '';
    }
  };

  const loadPricingItems = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_URL}/pricing?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPricingItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load pricing items:', error);
    }
  };

  const loadPricingSettings = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_URL}/pricing/settings?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUsePricingGuide(data.usePricingGuide || false);
      }
    } catch (error) {
      console.error('Failed to load pricing settings:', error);
    }
  };

  const togglePricingGuide = async (enabled: boolean) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_URL}/pricing/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, usePricingGuide: enabled }),
      });

      if (response.ok) {
        setUsePricingGuide(enabled);
        toast.success(enabled ? 'Pricing guide enabled ✅' : 'Pricing guide disabled');
      }
    } catch (error) {
      console.error('Failed to toggle pricing guide:', error);
      toast.error('Failed to update settings');
    }
  };

  const deletePricingItem = async (itemId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_URL}/pricing/${itemId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Item deleted');
        loadPricingItems();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item');
    }
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has Pro or Ultimate plan - Automation requires Pro+
  if (plan === 'starter') {
    return (
      <FeatureLocked
        feature="AI Automation & Custom Training"
        requiredPlan="Pro"
        description="Configure advanced AI automation settings and custom training. Upgrade to Pro or Ultimate to unlock."
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            AI Automation
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure how AutoStaff AI handles your business operations
          </p>
        </div>
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* AI Behavior Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">AI Behavior</h2>
        </div>
        <div className="space-y-4">
          <SettingToggle
            label="Auto-Approve AI Responses"
            description="Allow AI to send responses without your approval (you can review them after)"
            checked={aiAutoApprove}
            onChange={setAiAutoApprove}
          />
          <SettingToggle
            label="Auto-Respond to Emails"
            description="AI will automatically draft responses to customer emails"
            checked={autoRespondEmails}
            onChange={setAutoRespondEmails}
          />
          <SettingToggle
            label="Auto-Categorize Messages"
            description="Automatically sort incoming messages into categories (quotes, questions, bookings, etc.)"
            checked={autoCategorizeleads}
            onChange={setAutoCategorizeleads}
          />
          <SettingToggle
            label="Auto Follow-Up"
            description="Automatically send follow-up messages to customers who haven't responded"
            checked={autoFollowUp}
            onChange={setAutoFollowUp}
          />
          {autoFollowUp && (
            <div className="ml-6 mt-2">
              <label className="text-sm font-medium">Follow-up delay (days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={followUpDelayDays}
                onChange={(e) => setFollowUpDelayDays(parseInt(e.target.value))}
                className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Response Settings Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Response Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Response Tone</label>
            <select
              value={responseTone}
              onChange={(e) => setResponseTone(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Response Length</label>
            <select
              value={responseLength}
              onChange={(e) => setResponseLength(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="brief">Brief (1-2 sentences)</option>
              <option value="medium">Medium (2-4 sentences)</option>
              <option value="detailed">Detailed (Full paragraph)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Response Language</label>
            <select
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Custom AI Instructions</label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Always mention our 10% discount for first-time customers, emphasize our 24/7 availability, use a warm and welcoming tone..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Give specific instructions to personalize how the AI represents your business
            </p>
          </div>

          <SettingToggle
            label="Include Email Signature"
            description="Add your signature to all AI-generated responses"
            checked={includeSignature}
            onChange={setIncludeSignature}
          />
          
          {includeSignature && (
            <div className="mt-2">
              <label className="text-sm font-medium mb-2 block">Email Signature</label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Best regards,&#10;Your Name&#10;Your Company&#10;(555) 123-4567"
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Working Hours Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Working Hours</h2>
        </div>
        <div className="space-y-4">
          <SettingToggle
            label="Respect Working Hours"
            description="Only send AI responses during business hours"
            checked={respectWorkingHours}
            onChange={setRespectWorkingHours}
          />
          
          {respectWorkingHours && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Time</label>
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Time</label>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'mon', label: 'Mon' },
                    { value: 'tue', label: 'Tue' },
                    { value: 'wed', label: 'Wed' },
                    { value: 'thu', label: 'Thu' },
                    { value: 'fri', label: 'Fri' },
                    { value: 'sat', label: 'Sat' },
                    { value: 'sun', label: 'Sun' },
                  ].map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        setWorkingDays(prev => 
                          prev.includes(day.value)
                            ? prev.filter(d => d !== day.value)
                            : [...prev, day.value]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        workingDays.includes(day.value)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <SettingToggle
                label="Auto-Response Outside Hours"
                description="Send an automatic out-of-office message when contacted outside working hours"
                checked={autoResponseOutsideHours}
                onChange={setAutoResponseOutsideHours}
              />

              {autoResponseOutsideHours && (
                <div className="mt-2">
                  <label className="text-sm font-medium mb-2 block">Out-of-Office Message</label>
                  <textarea
                    value={outOfOfficeMessage}
                    onChange={(e) => setOutOfOfficeMessage(e.target.value)}
                    placeholder="Thanks for reaching out! Our office is currently closed. We'll get back to you during business hours (9 AM - 5 PM, Mon-Fri)."
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Lead Automation Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Lead Automation</h2>
        </div>
        <div className="space-y-4">
          <SettingToggle
            label="Auto-Create Leads from Emails"
            description="Automatically create lead records when new potential customers email you"
            checked={autoCreateLeadsFromEmails}
            onChange={setAutoCreateLeadsFromEmails}
          />
          <SettingToggle
            label="Auto-Qualify Leads"
            description="AI will analyze incoming leads and move them to appropriate pipeline stages"
            checked={autoQualifyLeads}
            onChange={setAutoQualifyLeads}
          />
          <SettingToggle
            label="Auto-Assign Priority"
            description="Automatically set priority levels (High/Medium/Low) based on lead quality"
            checked={autoAssignPriority}
            onChange={setAutoAssignPriority}
          />
          {autoAssignPriority && (
            <div className="ml-6 mt-2">
              <label className="text-sm font-medium">Lead Score Threshold (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={leadScoreThreshold}
                onChange={(e) => setLeadScoreThreshold(parseInt(e.target.value))}
                className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leads scoring {leadScoreThreshold}+ will be marked as high priority
              </p>
            </div>
          )}
          <SettingToggle
            label="Auto-Schedule Follow-Up"
            description="Automatically create follow-up tasks for new leads"
            checked={autoScheduleFollowUp}
            onChange={setAutoScheduleFollowUp}
          />
        </div>
      </Card>

      {/* Quote/Estimate Automation Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Quote & Estimate Automation</h2>
        </div>
        <div className="space-y-4">
          <SettingToggle
            label="Auto-Generate Quotes"
            description="AI will automatically create quotes based on customer requests"
            checked={autoGenerateQuotes}
            onChange={setAutoGenerateQuotes}
          />
          {autoGenerateQuotes && (
            <>
              <SettingToggle
                label="Require Approval Before Sending"
                description="Review AI-generated quotes before they're sent to customers"
                checked={requireQuoteApproval}
                onChange={setRequireQuoteApproval}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Quote Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={minQuoteAmount}
                    onChange={(e) => setMinQuoteAmount(parseInt(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Quote Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxQuoteAmount}
                    onChange={(e) => setMaxQuoteAmount(parseInt(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                AI will only generate quotes within this price range
              </p>

              <div>
                <label className="text-sm font-medium mb-2 block">Quote Validity Period (days)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={quoteValidityDays}
                  onChange={(e) => setQuoteValidityDays(parseInt(e.target.value))}
                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <SettingToggle
                label="Include Terms & Conditions"
                description="Automatically add your standard terms to all quotes"
                checked={includeTermsInQuotes}
                onChange={setIncludeTermsInQuotes}
              />
            </>
          )}
        </div>
      </Card>

      {/* Pricing Guide Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Pricing Guide</h2>
        </div>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-2">
              Upload your pricing list and AI will use it to generate accurate quotes based on your actual prices.
            </p>
            <p className="text-xs text-blue-700">
              Supported formats: PDF, CSV, Excel, Text - AI will parse any format automatically
            </p>
          </div>

          <SettingToggle
            label="Use Pricing Guide for Quotes"
            description="Enable AI to reference your uploaded pricing when generating quotes"
            checked={usePricingGuide}
            onChange={togglePricingGuide}
          />

          <div>
            <label htmlFor="pricing-upload" className="block text-sm font-medium mb-2">
              Upload Pricing Guide
            </label>
            <input
              id="pricing-upload"
              type="file"
              accept=".pdf,.csv,.xls,.xlsx,.txt"
              onChange={handlePricingGuideUpload}
              disabled={uploadingPricing}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-white
                hover:file:bg-primary/90
                file:cursor-pointer cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploadingPricing && (
              <p className="text-sm text-muted-foreground mt-2">
                ⏳ Parsing pricing guide with AI...
              </p>
            )}
          </div>

          {pricingItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  {pricingItems.length} pricing items loaded
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPricingItems(!showPricingItems)}
                >
                  {showPricingItems ? 'Hide' : 'Show'} Items
                </Button>
              </div>

              {showPricingItems && (
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {pricingItems.map((item) => (
                      <div key={item.id} className="p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              {item.needsReview && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                  Needs Review
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ${(item.pricing as any).price} per {(item.pricing as any).unit}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePricingItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Calendar & Booking Automation Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Calendar & Booking Automation</h2>
        </div>
        <div className="space-y-4">
          <SettingToggle
            label="Auto-Book Appointments"
            description="Allow AI to automatically schedule appointments based on your availability"
            checked={autoBookAppointments}
            onChange={setAutoBookAppointments}
          />
          {autoBookAppointments && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Buffer Time Between Bookings (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="15"
                  value={bufferTimeBetweenBookings}
                  onChange={(e) => setBufferTimeBetweenBookings(parseInt(e.target.value))}
                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Travel and prep time between appointments
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Max Bookings Per Day</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxBookingsPerDay}
                  onChange={(e) => setMaxBookingsPerDay(parseInt(e.target.value))}
                  className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <SettingToggle
            label="Send Booking Reminders"
            description="Automatically send reminder emails/SMS before appointments"
            checked={sendBookingReminders}
            onChange={setSendBookingReminders}
          />
          {sendBookingReminders && (
            <div className="ml-6 mt-2">
              <label className="text-sm font-medium">Send Reminder (hours before)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={reminderHoursBefore}
                onChange={(e) => setReminderHoursBefore(parseInt(e.target.value))}
                className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Email Filters Section */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-semibold">Email Filters</h2>
        </div>
        <div className="space-y-4">
          <SettingToggle
            label="Spam Filter"
            description="Automatically filter out spam and promotional emails"
            checked={spamFilter}
            onChange={setSpamFilter}
          />
          <SettingToggle
            label="Auto-Archive Marketing Emails"
            description="Automatically archive marketing and newsletter emails"
            checked={autoArchiveMarketing}
            onChange={setAutoArchiveMarketing}
          />
          <SettingToggle
            label="Require Approval for New Contacts"
            description="Request approval before AI responds to first-time senders"
            checked={requireApprovalForNew}
            onChange={setRequireApprovalForNew}
          />
        </div>
      </Card>

      {/* Save Button (Mobile) */}
      <div className="sm:hidden">
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SettingToggle({ 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium leading-none block mb-1">
          {label}
        </label>
        <p className="text-xs sm:text-sm text-muted-foreground break-words">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${checked ? 'bg-primary' : 'bg-gray-200'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
