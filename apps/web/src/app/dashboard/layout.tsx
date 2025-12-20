'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Bot, LayoutDashboard, Mail, Users, FileText, Settings, Zap, Calendar, DollarSign, CreditCard, PieChart, Briefcase, Menu, X, Shield, Lock } from 'lucide-react';
import { UserSync } from '@/components/UserSync';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { API_URL } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`${API_URL}/auth/me?userId=${user.id}`);
        const userData = await response.json();
        setUserPlan(userData.subscriptionTier || 'starter');
      } catch (error) {
        console.error('Failed to fetch user plan:', error);
      }
    };

    fetchUserPlan();
  }, [user]);

  const isFeatureLocked = (feature: string) => {
    if (feature === 'calendar' || feature === 'automation') {
      return userPlan === 'starter';
    }
    return false;
  };

  const navItems = [
    { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', locked: false },
    { href: '/dashboard/overview', icon: <PieChart className="h-5 w-5" />, label: 'Overview', locked: false },
    { href: '/dashboard/inbox', icon: <Mail className="h-5 w-5" />, label: 'Inbox', locked: false },
    { href: '/dashboard/leads', icon: <Users className="h-5 w-5" />, label: 'Leads', locked: false },
    { href: '/dashboard/customers', icon: <Briefcase className="h-5 w-5" />, label: 'Customers', locked: false },
    { href: '/dashboard/quotes', icon: <FileText className="h-5 w-5" />, label: 'Quotes', locked: false },
    { href: '/dashboard/calendar', icon: <Calendar className="h-5 w-5" />, label: 'Calendar', locked: isFeatureLocked('calendar') },
    { href: '/dashboard/billing', icon: <DollarSign className="h-5 w-5" />, label: 'Billing', locked: false },
    { href: '/dashboard/subscription', icon: <CreditCard className="h-5 w-5" />, label: 'Subscription', locked: false },
    { href: '/dashboard/automation', icon: <Zap className="h-5 w-5" />, label: 'Automation', locked: isFeatureLocked('automation') },
    { href: '/dashboard/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings', locked: false },
  ];

  const adminEmails = ['tonymaroughi@gmail.com', 'sarkon.shlemoon@gmail.com', 'sarkonshlemoon@gmail.com', 'gtaconcretemasonryinc@gmail.com'];
  const isAdmin = user?.primaryEmailAddress?.emailAddress && 
    adminEmails.includes(user.primaryEmailAddress.emailAddress.toLowerCase());

  // Add admin link for admin users
  if (isAdmin) {
    navItems.push({ href: '/dashboard/admin', icon: <Shield className="h-5 w-5" />, label: 'Admin' });
  }

  return (
    <SubscriptionGuard>
      <div className="min-h-screen flex flex-col md:flex-row">
        <UserSync />
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">AutoStaff AI</span>
            </Link>
          </div>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8"
              }
            }}
          />
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div className="bg-white w-64 h-full p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <nav className="space-y-2 mt-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.locked && <Lock className="ml-auto h-4 w-4 text-gray-400" />}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Sidebar - Hidden on mobile by default */}
        <aside className="hidden md:block w-64 border-r bg-muted/30 sticky top-0 h-screen overflow-y-auto">
          <div className="p-4">
            <Link href="/dashboard" className="flex items-center gap-2 mb-8">
              <Bot className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">AutoStaff AI</span>
            </Link>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} locked={item.locked}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Desktop Header - Hidden on mobile */}
        <header className="hidden md:flex border-b h-16 items-center justify-between px-4 md:px-6">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonPopoverActionButton__signOut: {
                  display: 'block'
                }
              }
            }}
          />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
    </SubscriptionGuard>
  );
}

function NavLink({
  href,
  icon,
  children,
  locked = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm md:text-base"
    >
      {icon}
      <span>{children}</span>
      {locked && <Lock className="ml-auto h-4 w-4 text-gray-400" />}
    </Link>
  );
}
