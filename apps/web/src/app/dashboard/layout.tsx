import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Bot, LayoutDashboard, Mail, Users, FileText, Settings, Zap, Calendar, DollarSign, CreditCard, PieChart, Briefcase, Menu, X } from 'lucide-react';
import { UserSync } from '@/components/UserSync';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionGuard>
      <div className="min-h-screen flex flex-col md:flex-row">
        <UserSync />
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">AutoStaff AI</span>
          </Link>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8"
              }
            }}
          />
        </div>

        {/* Sidebar - Hidden on mobile by default */}
        <aside className="hidden md:block w-64 border-r bg-muted/30 sticky top-0 h-screen overflow-y-auto">
          <div className="p-4">
            <Link href="/dashboard" className="flex items-center gap-2 mb-8">
              <Bot className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">AutoStaff AI</span>
            </Link>
          
          <nav className="space-y-2">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />}>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/overview" icon={<PieChart className="h-5 w-5" />}>
              Overview
            </NavLink>
            <NavLink href="/dashboard/inbox" icon={<Mail className="h-5 w-5" />}>
              Inbox
            </NavLink>
            <NavLink href="/dashboard/leads" icon={<Users className="h-5 w-5" />}>
              Leads
            </NavLink>
            <NavLink href="/dashboard/customers" icon={<Briefcase className="h-5 w-5" />}>
              Customers
            </NavLink>
            <NavLink href="/dashboard/calendar" icon={<Calendar className="h-5 w-5" />}>
              Calendar
            </NavLink>
            <NavLink href="/dashboard/billing" icon={<DollarSign className="h-5 w-5" />}>
              Billing
            </NavLink>
            <NavLink href="/dashboard/subscription" icon={<CreditCard className="h-5 w-5" />}>
              Subscription
            </NavLink>
            <NavLink href="/dashboard/automation" icon={<Zap className="h-5 w-5" />}>
              Automation
            </NavLink>
            <NavLink href="/dashboard/settings" icon={<Settings className="h-5 w-5" />}>
              Settings
            </NavLink>
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
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm md:text-base"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
