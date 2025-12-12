'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Shield, Users, TrendingUp, Mail, Loader2, Database } from 'lucide-react';
import { API_URL } from '@/lib/utils';

export default function AdminPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('stats');

  const adminEmails = ['tonymaroughi@gmail.com', 'sarkon.shlemoon@gmail.com', 'sarkonshlemoon@gmail.com', 'gtaconcretemasonryinc@gmail.com'];
  const isAdmin = user?.primaryEmailAddress?.emailAddress && 
    adminEmails.includes(user.primaryEmailAddress.emailAddress.toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      
      const [statsRes, usersRes, leadsRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats?adminEmail=${email}`),
        fetch(`${API_URL}/admin/all-users?adminEmail=${email}`),
        fetch(`${API_URL}/admin/all-leads?adminEmail=${email}`),
      ]);

      const [statsData, usersData, leadsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        leadsRes.json(),
      ]);

      setStats(statsData);
      setUsers(usersData.users || []);
      setLeads(leadsData.leads || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">System overview and user management</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trial Users</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.trialUsers}</p>
              </div>
              <Users className="h-12 w-12 text-yellow-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{stats.totalLeads}</p>
              </div>
              <Database className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gmail Connected</p>
                <p className="text-3xl font-bold">{stats.gmailConnected}</p>
              </div>
              <Mail className="h-12 w-12 text-red-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-3xl font-bold text-red-600">{stats.cancelledUsers}</p>
              </div>
              <Users className="h-12 w-12 text-red-500 opacity-20" />
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'leads'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All Leads ({leads.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Business</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">AI Usage</th>
                <th className="text-left p-3 font-medium">Integrations</th>
                <th className="text-left p-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 text-sm">{u.email}</td>
                  <td className="p-3 text-sm">{u.businessName || '-'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.subscriptionPlan === 'ultimate' ? 'bg-purple-100 text-purple-700' :
                      u.subscriptionPlan === 'pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.subscriptionPlan}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' :
                      u.subscriptionStatus === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {u.subscriptionStatus}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {u.aiConversationsUsed}/{u.aiConversationsLimit || '∞'}
                  </td>
                  <td className="p-3 text-sm">
                    {u.gmailConnected && '📧 '}{u.calendarConnected && '📅'}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'leads' && (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Business Owner</th>
                <th className="text-left p-3 font-medium">Stage</th>
                <th className="text-left p-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 text-sm font-medium">{lead.name}</td>
                  <td className="p-3 text-sm">{lead.email || '-'}</td>
                  <td className="p-3 text-sm">{lead.phone || '-'}</td>
                  <td className="p-3 text-sm">{lead.user?.businessName || lead.user?.email || '-'}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {lead.stage || 'new'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
