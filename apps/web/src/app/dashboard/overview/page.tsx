'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/utils';

interface OverviewStats {
  overdueInvoices: { count: number; total: number };
  unpaidInvoices: { count: number; total: number };
  unsentInvoices: { count: number; total: number };
  monthSales: { count: number; total: number };
  yearSales: { count: number; total: number; monthly: Array<{ month: string; amount: number }> };
  pendingQuotes: { count: number; total: number; items: Array<{ id: string; leadName: string; total: number }> };
  recentActivity: Array<{ id: string; type: string; description: string; status: string; date: string }>;
}

export default function OverviewPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOverviewData();
    }
  }, [user]);

  const fetchOverviewData = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/overview?userId=${user?.id}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading overview...</div>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-gray-500 mt-2">Your business at a glance</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/billing">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-red-500">
            <div className="text-sm text-gray-500 uppercase mb-1">Overdue Invoices ({stats?.overdueInvoices?.count || 0})</div>
            <div className="text-3xl font-bold text-red-600">
              CA${stats?.overdueInvoices?.total?.toFixed(2) || '0.00'}
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/billing">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-yellow-500">
            <div className="text-sm text-gray-500 uppercase mb-1">Unpaid Invoices ({stats?.unpaidInvoices?.count || 0})</div>
            <div className="text-3xl font-bold text-yellow-600">
              CA${stats?.unpaidInvoices?.total?.toFixed(2) || '0.00'}
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/billing">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-gray-400">
            <div className="text-sm text-gray-500 uppercase mb-1">Unsent Invoices ({stats?.unsentInvoices?.count || 0})</div>
            <div className="text-3xl font-bold">
              CA${stats?.unsentInvoices?.total?.toFixed(2) || '0.00'}
            </div>
          </Card>
        </Link>

        <Card className="p-6 border-l-4 border-green-500">
          <div className="text-sm text-gray-500 uppercase mb-1">{currentMonth} Sales</div>
          <div className="text-3xl font-bold text-green-600">
            CA${stats?.monthSales?.total?.toFixed(2) || '0.00'}
          </div>
        </Card>
      </div>

      {/* Year Sales and Pending Quotes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Year Sales Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm text-gray-500 uppercase">Tax Year Sales {currentYear} ({stats?.yearSales?.count || 0})</div>
              <div className="text-3xl font-bold mt-2">
                CA${stats?.yearSales?.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
            <Link href="/dashboard/billing" className="text-blue-600 hover:text-blue-700 text-sm">
              See more
            </Link>
          </div>

          {/* Simple Bar Chart */}
          <div className="mt-4">
            <div className="text-sm text-gray-500 mt-1">
              CA${((stats?.yearSales?.total || 0) / 12).toLocaleString('en-US', { minimumFractionDigits: 2 })} monthly average
            </div>
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-48">
              {stats?.yearSales?.monthly?.map((month) => {
                const maxAmount = Math.max(...(stats?.yearSales?.monthly?.map(m => m.amount) || [1]));
                const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                return (
                  <div key={month.month} className="flex-1 flex flex-col items-center min-w-0">
                    <div 
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '8px' : '0' }}
                      title={`${month.month}: CA$${month.amount.toFixed(2)}`}
                    />
                    <div className="text-[8px] sm:text-xs text-gray-500 mt-1 sm:mt-2 truncate w-full text-center">{month.month}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Pending Quotes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm text-gray-500 uppercase flex items-center gap-2">
                Pending Estimates ({stats?.pendingQuotes?.count || 0})
                <span className="text-xs text-gray-400" title="Accepted quotes are automatically converted to invoices">ℹ️</span>
              </div>
              <div className="text-3xl font-bold mt-2">
                CA${stats?.pendingQuotes?.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Draft & sent quotes (accepted quotes become invoices)
              </div>
            </div>
            <Link href="/dashboard/customers" className="text-blue-600 hover:text-blue-700 text-sm">
              See more
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.pendingQuotes?.items?.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No pending quotes
              </div>
            ) : (
              stats?.pendingQuotes?.items?.map((quote) => (
                <Link key={quote.id} href={`/dashboard/customers`}>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{quote.leadName}</span>
                      <span className="text-xs text-gray-500">(1)</span>
                    </div>
                    <span className="font-semibold">CA${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <div className="text-sm text-gray-500 uppercase mt-1">Recently Edited</div>
        </div>

        <div className="space-y-3">
          {stats?.recentActivity?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No recent activity
            </div>
          ) : (
            stats?.recentActivity?.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded transition-colors">
                <div className="p-2 bg-blue-100 rounded">
                  {activity.type === 'invoice' ? (
                    <FileText className="h-4 w-4 text-blue-600" />
                  ) : (
                    <FileText className="h-4 w-4 text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <Link 
                    href={activity.type === 'invoice' ? '/dashboard/billing' : '/dashboard/customers'} 
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {activity.description}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={
                        activity.status === 'paid' ? 'default' : 
                        activity.status === 'sent' ? 'secondary' : 
                        activity.status === 'draft' ? 'outline' : 
                        'destructive'
                      }
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
