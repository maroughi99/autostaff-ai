import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverviewStats(userId: string) {
    // Convert Clerk ID to database ID if needed
    let dbUserId = userId;
    if (userId?.startsWith('user_')) {
      const user = await this.prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
      if (user) {
        dbUserId = user.id;
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get all invoices for the user
    const invoices = await this.prisma.invoice.findMany({
      where: {
        lead: {
          userId: dbUserId,
        },
      },
      include: {
        lead: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get all quotes for the user
    const quotes = await this.prisma.quote.findMany({
      where: {
        lead: {
          userId: dbUserId,
        },
      },
      include: {
        lead: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Calculate overdue invoices
    const overdueInvoices = invoices.filter(
      (inv) => inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < now
    );

    // Calculate unpaid invoices (not overdue)
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status !== 'paid' && (!inv.dueDate || new Date(inv.dueDate) >= now)
    );

    // Calculate unsent invoices
    const unsentInvoices = invoices.filter((inv) => inv.status === 'draft');

    // Calculate month sales (paid invoices this month)
    const monthSales = invoices.filter(
      (inv) => inv.status === 'paid' && new Date(inv.paidAt || inv.createdAt) >= startOfMonth
    );

    // Calculate year sales by month
    const yearInvoices = invoices.filter(
      (inv) => inv.status === 'paid' && new Date(inv.paidAt || inv.createdAt) >= startOfYear
    );

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), i, 1);
      const monthEnd = new Date(now.getFullYear(), i + 1, 0);
      const monthName = monthStart.toLocaleString('en-US', { month: 'short' });
      
      const monthInvoices = yearInvoices.filter((inv) => {
        const date = new Date(inv.paidAt || inv.createdAt);
        return date >= monthStart && date <= monthEnd;
      });

      return {
        month: monthName,
        amount: monthInvoices.reduce((sum, inv) => sum + inv.total, 0),
      };
    });

    // Get pending quotes (draft or sent, not accepted)
    // Note: Accepted quotes are automatically converted to invoices
    const pendingQuotes = quotes.filter(
      (quote) => quote.status === 'draft' || quote.status === 'sent'
    );

    // Get recent activity (last 10 items)
    const recentActivity = [
      ...invoices.slice(0, 5).map((inv) => ({
        id: inv.id,
        type: 'invoice',
        description: `Invoice #${inv.invoiceNumber} for ${inv.lead.name}`,
        status: inv.status,
        date: inv.updatedAt.toISOString(),
      })),
      ...quotes.slice(0, 5).map((quote) => ({
        id: quote.id,
        type: 'quote',
        description: `Quote #${quote.quoteNumber} for ${quote.lead.name}`,
        status: quote.status,
        date: quote.updatedAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      overdueInvoices: {
        count: overdueInvoices.length,
        total: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      unpaidInvoices: {
        count: unpaidInvoices.length,
        total: unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      unsentInvoices: {
        count: unsentInvoices.length,
        total: unsentInvoices.reduce((sum, inv) => sum + inv.total, 0),
      },
      monthSales: {
        count: monthSales.length,
        total: monthSales.reduce((sum, inv) => sum + inv.total, 0),
      },
      yearSales: {
        count: yearInvoices.length,
        total: yearInvoices.reduce((sum, inv) => sum + inv.total, 0),
        monthly: monthlyData,
      },
      pendingQuotes: {
        count: pendingQuotes.length,
        total: pendingQuotes.reduce((sum, quote) => sum + quote.total, 0),
        items: pendingQuotes.slice(0, 5).map((quote) => ({
          id: quote.id,
          leadName: quote.lead.name,
          total: quote.total,
        })),
      },
      recentActivity,
    };
  }
}
