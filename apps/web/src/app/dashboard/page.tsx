"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Users, FileText, TrendingUp, Bot, CheckCircle } from 'lucide-react';
import { API_URL } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalMessages: 0,
    newLeads: 0,
    contactedLeads: 0,
    qualifiedLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
  });
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [leadsRes, messagesRes] = await Promise.all([
        fetch(`${API_URL}/leads?userId=${user?.id}`),
        fetch(`${API_URL}/messages?userId=${user?.id}`),
      ]);

      const leads = await leadsRes.json();
      const messages = await messagesRes.json();

      setStats({
        totalLeads: leads.length,
        totalMessages: messages.length,
        newLeads: leads.filter((l: any) => l.stage === "new").length,
        contactedLeads: leads.filter((l: any) => l.stage === "contacted").length,
        qualifiedLeads: leads.filter((l: any) => l.stage === "qualified").length,
        wonLeads: leads.filter((l: any) => l.stage === "won").length,
        lostLeads: leads.filter((l: any) => l.stage === "lost").length,
      });

      // Get recent 5 messages
      setRecentMessages(messages.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - then.getTime()) / 60000);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads.toString()}
          change={`${stats.newLeads} new`}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages.toString()}
          change={`${stats.contactedLeads} contacted`}
          icon={<Mail className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Won Deals"
          value={stats.wonLeads.toString()}
          change={`${stats.qualifiedLeads} qualified`}
          icon={<CheckCircle className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Conversion"
          value={stats.totalLeads > 0 ? `${Math.round((stats.wonLeads / stats.totalLeads) * 100)}%` : "0%"}
          change={`${stats.lostLeads} lost`}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.length > 0 ? (
                recentMessages.map((message) => (
                  <ActivityItem
                    key={message.id}
                    icon={
                      message.direction === "inbound" ? (
                        <Mail className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Mail className="h-5 w-5 text-purple-500" />
                      )
                    }
                    title={
                      message.subject || 
                      `${message.direction === "inbound" ? "Received from" : "Sent to"} ${message.fromEmail || message.toEmail}`
                    }
                    time={getTimeAgo(message.createdAt)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent messages
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <PipelineItem stage="New" count={stats.newLeads} color="bg-blue-500" total={stats.totalLeads} />
              <PipelineItem stage="Contacted" count={stats.contactedLeads} color="bg-purple-500" total={stats.totalLeads} />
              <PipelineItem stage="Qualified" count={stats.qualifiedLeads} color="bg-green-500" total={stats.totalLeads} />
              <PipelineItem stage="Won" count={stats.wonLeads} color="bg-emerald-500" total={stats.totalLeads} />
              <PipelineItem stage="Lost" count={stats.lostLeads} color="bg-gray-500" total={stats.totalLeads} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>AI Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <AgentStatus
              name="Inbox Agent"
              status="Active"
              processed="45 messages"
              statusColor="text-green-500"
            />
            <AgentStatus
              name="Lead Handler"
              status="Active"
              processed="12 leads"
              statusColor="text-green-500"
            />
            <AgentStatus
              name="Follow-Up Agent"
              status="Scheduled"
              processed="Next run: 2:00 PM"
              statusColor="text-blue-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-green-500 mt-1">{change} from last week</div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  icon,
  title,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

function PipelineItem({
  stage,
  count,
  color,
  total,
}: {
  stage: string;
  count: number;
  color: string;
  total: number;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{stage}</span>
        <span className="text-sm font-bold">{count} ({Math.round(percentage)}%)</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function AgentStatus({
  name,
  status,
  processed,
  statusColor,
}: {
  name: string;
  status: string;
  processed: string;
  statusColor: string;
}) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{name}</h4>
        <span className={`text-sm font-medium ${statusColor}`}>{status}</span>
      </div>
      <p className="text-sm text-muted-foreground">{processed}</p>
    </div>
  );
}
