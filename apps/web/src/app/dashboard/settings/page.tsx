'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, Calendar, Phone, CheckCircle, XCircle, Loader2, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [emailConnected, setEmailConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessSaved, setBusinessSaved] = useState(false);
  const [aiAutoApprove, setAiAutoApprove] = useState(false);
  const [savingAutoApprove, setSavingAutoApprove] = useState(false);

  useEffect(() => {
    // Check if returning from OAuth callback
    const gmailStatus = searchParams.get('gmail');
    const email = searchParams.get('email');
    
    if (gmailStatus === 'success' && email) {
      setEmailConnected(true);
      setConnectedEmail(email);
      setLoading(false);
    } else if (gmailStatus === 'error') {
      alert('Failed to connect Gmail. Please try again.');
      setLoading(false);
    } else {
      // Load connection status from backend
      loadConnectionStatus();
    }
  }, [searchParams]);

  const loadConnectionStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      // Simple fetch without auth - backend will use user.id from URL or session
      const response = await fetch(`${API_URL}/auth/me?userId=${user.id}`);
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.gmailConnected) {
          setEmailConnected(true);
          setConnectedEmail(userData.gmailEmail || userData.email);
        }
        if (userData.calendarConnected) {
          setCalendarConnected(true);
        }
        if (userData.businessName) {
          setBusinessName(userData.businessName);
        }
        if (userData.aiAutoApprove !== undefined) {
          setAiAutoApprove(userData.aiAutoApprove);
        }
      }
    } catch (error) {
      console.error('Failed to load connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = () => {
    if (!user?.id) {
      alert('Please sign in first');
      return;
    }
    setLoading(true);
    // Redirect to backend OAuth endpoint with calendar permissions
    window.location.href = `${API_URL}/auth/gmail?userId=${user.id}&includeCalendar=true`;
  };

  const connectCalendar = async () => {
    if (!emailConnected) {
      alert('Please connect Gmail first');
      return;
    }
    if (!user?.id) return;

    try {
      const newValue = !calendarConnected;
      const response = await fetch(`${API_URL}/auth/update-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ calendarConnected: newValue }),
      });

      if (response.ok) {
        setCalendarConnected(newValue);
      }
    } catch (error) {
      console.error('Failed to toggle calendar connection:', error);
    }
  };

  const connectPhone = () => {
    setPhoneConnected(!phoneConnected);
  };

  const saveBusinessInfo = async () => {
    if (!user?.id) return;
    setSavingBusiness(true);
    setBusinessSaved(false);

    try {
      const response = await fetch(`${API_URL}/auth/update-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ businessName }),
      });

      if (response.ok) {
        setBusinessSaved(true);
        setTimeout(() => setBusinessSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save business info:', error);
    } finally {
      setSavingBusiness(false);
    }
  };

  const toggleAutoApprove = async () => {
    if (!user?.id) return;
    setSavingAutoApprove(true);

    try {
      const newValue = !aiAutoApprove;
      const response = await fetch(`${API_URL}/auth/update-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ aiAutoApprove: newValue }),
      });

      if (response.ok) {
        setAiAutoApprove(newValue);
      }
    } catch (error) {
      console.error('Failed to toggle auto-approve:', error);
    } finally {
      setSavingAutoApprove(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <SettingsIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure your business and integrations
        </p>
      </div>

      {/* Business Information Card */}
      <Card className="p-6 mb-6 border-2 border-indigo-200 bg-gradient-to-br from-white to-indigo-50">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <span className="text-xl">🏢</span>
          Business Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., Acme Construction Co"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will appear on your quote PDFs and email signatures
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={saveBusinessInfo}
              disabled={savingBusiness || !businessName}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {savingBusiness ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Business Info
                </>
              )}
            </Button>
            {businessSaved && (
              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Saved successfully!
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* AI Auto-Approve Card */}
      <Card className="p-6 mb-6 border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <span className="text-xl">🤖</span>
          AI Auto-Approve
        </h3>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-700 mb-2">
                When enabled, AI-generated email responses will be sent automatically without requiring manual approval.
              </p>
              <p className="text-xs text-gray-500">
                {aiAutoApprove ? (
                  <span className="text-orange-600 font-medium">⚠️ Messages will send automatically - use with caution</span>
                ) : (
                  <span className="text-green-600 font-medium">✓ You'll review each message before sending (recommended)</span>
                )}
              </p>
            </div>
            <Button
              onClick={toggleAutoApprove}
              disabled={savingAutoApprove || !emailConnected}
              className={aiAutoApprove ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {savingAutoApprove ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : aiAutoApprove ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Turn Off
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Turn On
                </>
              )}
            </Button>
          </div>
          {!emailConnected && (
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              Connect Gmail first to enable auto-approve
            </div>
          )}
        </div>
      </Card>

      {/* Integrations Section */}
      <h2 className="text-xl font-semibold mb-4 mt-8">Integrations</h2>

      {/* Setup Progress Banner */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">⚡</span>
          <h3 className="font-semibold text-lg">Quick Setup Progress</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${emailConnected ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'}`}>
            {emailConnected ? (
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-gray-400 flex-shrink-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-400">1</span>
              </div>
            )}
            <span className={`text-sm font-medium ${emailConnected ? 'text-green-700' : 'text-gray-700'}`}>
              Connect Email
            </span>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${calendarConnected ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'}`}>
            {calendarConnected ? (
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-gray-400 flex-shrink-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-400">2</span>
              </div>
            )}
            <span className={`text-sm font-medium ${calendarConnected ? 'text-green-700' : 'text-gray-700'}`}>
              Connect Calendar
            </span>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${phoneConnected ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'}`}>
            {phoneConnected ? (
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-gray-400 flex-shrink-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-400">3</span>
              </div>
            )}
            <span className={`text-sm font-medium ${phoneConnected ? 'text-green-700' : 'text-gray-700'}`}>
              Add Phone (Optional)
            </span>
          </div>
        </div>
      </div>

      {/* Warning if nothing connected */}
      {!emailConnected && !calendarConnected && !phoneConnected && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-900 mb-1">Get Started</h4>
            <p className="text-sm text-orange-700">
              Connect at least your Gmail to start using AI automation. It takes less than 60 seconds!
            </p>
          </div>
        </div>
      )}

      {/* Email Integration */}
      <Card className="p-6 mb-4 hover:shadow-lg transition-all border-2 hover:border-blue-300">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Gmail</h3>
              <p className="text-sm text-gray-600 mb-2">
                Connect your Gmail to automatically read and respond to customer emails
              </p>
              {emailConnected ? (
                <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Connected: {connectedEmail || user?.primaryEmailAddress?.emailAddress || 'your@email.com'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500">
                  <span>✓ Auto-read incoming emails</span>
                  <span>✓ AI-generated responses</span>
                  <span>✓ Smart categorization</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {emailConnected ? (
              <>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setEmailConnected(false)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button 
                onClick={connectGmail}
                disabled={loading}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Connect Gmail
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Calendar Integration */}
      <Card className="p-6 mb-4 hover:shadow-lg transition-all border-2 hover:border-purple-300">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-purple-100 rounded-lg flex-shrink-0">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Google Calendar</h3>
              <p className="text-sm text-gray-600 mb-2">
                Let AI automatically book appointments in your calendar
              </p>
              {!emailConnected ? (
                <p className="text-xs text-orange-600 font-medium mt-2 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Connect Gmail first to enable this
                </p>
              ) : calendarConnected ? (
                <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Calendar access enabled
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500">
                  <span>✓ Check availability automatically</span>
                  <span>✓ Book appointments with AI</span>
                  <span>✓ Send calendar invites</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button 
              onClick={connectCalendar}
              disabled={!emailConnected}
              size="lg"
              variant={calendarConnected ? "outline" : "default"}
              className={calendarConnected ? "border-green-300" : "bg-purple-600 hover:bg-purple-700 shadow-md"}
            >
              {calendarConnected ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Connected
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Connect Calendar
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Phone Integration */}
      <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-green-300">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
              <Phone className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Business Phone Number</h3>
              <p className="text-sm text-gray-600 mb-2">
                Get a dedicated number for SMS automation with customers
              </p>
              {phoneConnected ? (
                <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Your WorkBot number: (555) 123-4567
                  </span>
                </div>
              ) : (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">✓ Instant SMS responses</p>
                  <p className="text-xs text-gray-500">✓ Two-way conversations</p>
                  <p className="text-xs text-gray-500">✓ AI handles texts 24/7</p>
                  <p className="text-xs font-semibold text-orange-600 mt-2">💰 Additional $5/month</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button 
              onClick={connectPhone}
              size="lg"
              variant={phoneConnected ? "outline" : "default"}
              className={phoneConnected ? "border-green-300" : "bg-green-600 hover:bg-green-700 shadow-md"}
            >
              {phoneConnected ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Change Number
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Get Phone Number
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Success message if all connected */}
      {emailConnected && calendarConnected && phoneConnected && (
        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="font-semibold text-lg text-green-900">All Set! 🎉</h3>
          </div>
          <p className="text-sm text-green-700">
            Your AI employee is fully configured and ready to handle customer communications. 
            Check your Inbox to see it in action!
          </p>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-xl">💡</span>
          Need Help?
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• <strong>Gmail:</strong> We only read customer messages and send responses. Your data stays secure with OAuth 2.0.</p>
          <p>• <strong>Calendar:</strong> AI checks availability before booking appointments automatically.</p>
          <p>• <strong>Phone:</strong> Get a new number or forward your existing business line to enable SMS.</p>
        </div>
      </div>
    </div>
  );
}
