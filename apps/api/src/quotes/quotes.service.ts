import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GmailService } from '../gmail/gmail.service';
import { generateQuotePDF } from './pdf-generator';

interface QuoteItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateQuoteInput {
  leadId: string;
  jobId?: string;
  title?: string;
  description?: string;
  notes?: string;
  items: QuoteItemInput[];
  taxRate?: number;
  discount?: number;
  expiresAt?: Date;
}

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private gmailService: GmailService,
  ) {}

  async findAll(userId: string) {
    // Handle Clerk user IDs
    let dbUserId = userId;
    if (userId?.startsWith('user_')) {
      const user = await this.prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (!user) throw new Error('User not found');
      dbUserId = user.id;
    }

    return this.prisma.quote.findMany({
      where: {
        lead: {
          userId: dbUserId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: true,
        items: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.quote.findUnique({
      where: { id },
      include: {
        lead: true,
        items: true,
      },
    });
  }

  async create(input: CreateQuoteInput) {
    const { leadId, jobId, title, description, notes, items, taxRate = 0, discount = 0, expiresAt } = input;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;

    // Generate unique quote number
    const quoteNumber = `QT-${Date.now()}`;

    // Create quote with items
    return this.prisma.quote.create({
      data: {
        quoteNumber,
        leadId,
        jobId,
        title,
        description,
        notes,
        subtotal,
        tax: taxAmount,
        discount,
        total,
        status: 'draft',
        expiresAt,
        items: {
          create: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
        lead: true,
      },
    });
  }

  async update(id: string, data: Partial<CreateQuoteInput>) {
    const { items, taxRate, discount, ...quoteData } = data;

    // If items are updated, recalculate totals
    if (items) {
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);

      const taxAmount = subtotal * ((taxRate || 0) / 100);
      const total = subtotal + taxAmount - (discount || 0);

      // Delete existing items and create new ones
      await this.prisma.quoteItem.deleteMany({
        where: { quoteId: id },
      });

      return this.prisma.quote.update({
        where: { id },
        data: {
          ...quoteData,
          subtotal,
          tax: taxAmount,
          discount: discount || 0,
          total,
          items: {
            create: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
          lead: true,
        },
      });
    }

    // Simple update without items
    return this.prisma.quote.update({
      where: { id },
      data: quoteData,
      include: {
        items: true,
        lead: true,
      },
    });
  }

  async sendQuote(id: string) {
    // Get quote with full details
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            user: true,
          },
        },
        items: true,
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (!quote.lead.email) {
      throw new Error('Lead has no email address');
    }

    // Check if user has Gmail connected
    if (!quote.lead.user.gmailConnected || !quote.lead.user.gmailRefreshToken) {
      throw new Error('Gmail not connected. Please connect your Gmail account in Settings to send quotes.');
    }

    // Load automation settings to check if we should include terms
    const user = quote.lead.user;
    let automationSettings: any = {};
    try {
      automationSettings = user.automationSettings 
        ? JSON.parse(user.automationSettings as string) 
        : {};
    } catch (error) {
      console.error('Failed to parse automation settings:', error);
    }

    const includeTerms = automationSettings.includeTermsInQuotes !== false; // Default true

    // Generate PDF on backend (we'll need to add jsPDF to API)
    // For now, we'll send a simple text email and let frontend handle PDF
    // In production, you'd generate PDF server-side
    
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Quote ${quote.quoteNumber}</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p>Hi ${quote.lead.name},</p>
            <p>Thank you for your inquiry! Please find your quote details below:</p>
            
            ${quote.title ? `<h2 style="color: #1f2937;">${quote.title}</h2>` : ''}
            ${quote.description ? `<p style="color: #6b7280;">${quote.description}</p>` : ''}
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Line Items</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e5e7eb;">
                    <th style="text-align: left; padding: 10px;">Description</th>
                    <th style="text-align: right; padding: 10px;">Qty</th>
                    <th style="text-align: right; padding: 10px;">Price</th>
                    <th style="text-align: right; padding: 10px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${quote.items.map((item) => `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 10px;">${item.description}</td>
                      <td style="text-align: right; padding: 10px;">${item.quantity}</td>
                      <td style="text-align: right; padding: 10px;">$${item.unitPrice.toFixed(2)}</td>
                      <td style="text-align: right; padding: 10px;">$${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <table style="width: 100%; max-width: 300px; margin-left: auto;">
                  <tr>
                    <td style="padding: 5px; text-align: right;">Subtotal:</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold;">$${quote.subtotal.toFixed(2)}</td>
                  </tr>
                  ${quote.tax > 0 ? `
                  <tr>
                    <td style="padding: 5px; text-align: right;">Tax:</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold;">$${quote.tax.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  ${quote.discount > 0 ? `
                  <tr>
                    <td style="padding: 5px; text-align: right; color: #10b981;">Discount:</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold; color: #10b981;">-$${quote.discount.toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr style="border-top: 2px solid #e5e7eb;">
                    <td style="padding: 10px; text-align: right; font-size: 18px; font-weight: bold;">Total:</td>
                    <td style="padding: 10px; text-align: right; font-size: 18px; font-weight: bold; color: #8b5cf6;">$${quote.total.toFixed(2)}</td>
                  </tr>
                </table>
              </div>
            </div>
            
            ${includeTerms && quote.notes ? `
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Notes & Terms</h3>
                <p style="color: #6b7280; white-space: pre-line;">${quote.notes}</p>
              </div>
            ` : ''}
            
            ${quote.expiresAt ? `
              <p style="color: #ef4444; font-weight: bold;">
                This quote is valid until ${new Date(quote.expiresAt).toLocaleDateString()}
              </p>
            ` : ''}
            
            <!-- Accept/Reject Buttons -->
            <div style="margin: 30px 0; text-align: center;">
              <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">Ready to move forward?</p>
              <a href="${process.env.API_URL || 'http://localhost:3001'}/quotes/${quote.id}/accept" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
                ✓ Accept Quote
              </a>
              <a href="${process.env.API_URL || 'http://localhost:3001'}/quotes/${quote.id}/reject" 
                 style="display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">
                ✗ Decline Quote
              </a>
            </div>
            
            <p>If you have any questions, please don't hesitate to reach out!</p>
            <p>Best regards,<br>${quote.lead.user.businessName || 'AutoStaff AI'}</p>
          </div>
          
          <div style="background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>Powered by AutoStaff AI - Your AI Business Assistant</p>
          </div>
        </body>
      </html>
    `;

    try {
      // Generate PDF on server
      const pdfBuffer = generateQuotePDF(
        {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          title: quote.title || 'Quote',
          description: quote.description,
          subtotal: quote.subtotal,
          taxRate: quote.tax / quote.subtotal,
          taxAmount: quote.tax,
          discount: quote.discount,
          total: quote.total,
          validUntil: quote.expiresAt,
          notes: quote.notes,
          items: quote.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.total,
          })),
          lead: {
            name: quote.lead.name,
            email: quote.lead.email,
          },
        },
        quote.lead.user.businessName || quote.lead.user.email?.split('@')[0] || 'AutoStaff AI'
      );

      // Convert buffer to base64
      const pdfBase64 = pdfBuffer.toString('base64');
      const fileName = `Quote-${quote.quoteNumber}.pdf`;

      // Send email with PDF attachment
      await this.gmailService.sendMessageWithAttachment(
        quote.lead.user.clerkId,
        quote.lead.email,
        `Quote ${quote.quoteNumber} - ${quote.title || 'Your Quote'}`,
        emailBody,
        fileName,
        pdfBase64,
        'application/pdf'
      );

      // Update quote status to sent
      await this.prisma.quote.update({
        where: { id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      return quote;
    } catch (error) {
      console.error('Failed to send quote email:', error);
      throw new Error('Failed to send quote email');
    }
  }

  async generateQuote(data: any) {
    // AI-powered quote generation placeholder
    const { leadId, items, notes } = data;

    // Generate a unique quote number
    const quoteNumber = `QT-${Date.now()}`;

    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    return this.prisma.quote.create({
      data: {
        quoteNumber,
        leadId,
        notes,
        status: 'draft',
        subtotal,
        total: subtotal,
        isAiGenerated: true,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
        lead: true,
      },
    });
  }

  async delete(id: string) {
    // Delete quote items first (cascade should handle this, but being explicit)
    await this.prisma.quoteItem.deleteMany({
      where: { quoteId: id },
    });

    // Delete the quote
    return this.prisma.quote.delete({
      where: { id },
    });
  }

  async updateItemProgress(itemId: string, progress: number) {
    // Ensure progress is between 0 and 100
    const validProgress = Math.max(0, Math.min(100, progress));

    return this.prisma.quoteItem.update({
      where: { id: itemId },
      data: { progress: validProgress },
    });
  }

  async convertAcceptedQuotesToInvoices(userId: string) {
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

    // Find all accepted quotes without invoices
    const acceptedQuotes = await this.prisma.quote.findMany({
      where: {
        lead: {
          userId: dbUserId,
        },
        status: 'accepted',
      },
      include: {
        lead: true,
        items: true,
        invoices: true,
      },
    });

    const results = [];

    for (const quote of acceptedQuotes) {
      // Check if invoice already exists for this quote
      if (quote.invoices.length > 0) {
        results.push({
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          status: 'already_has_invoice',
          invoiceNumber: quote.invoices[0].invoiceNumber,
        });
        continue;
      }

      // Create invoice
      try {
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const invoice = await this.prisma.invoice.create({
          data: {
            invoiceNumber,
            leadId: quote.leadId,
            quoteId: quote.id,
            title: quote.title || `Invoice for ${quote.lead.name}`,
            description: quote.description,
            notes: quote.notes,
            subtotal: quote.subtotal,
            tax: quote.tax,
            discount: quote.discount,
            total: quote.total,
            amountPaid: 0,
            amountDue: quote.total,
            status: 'sent',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: {
              create: quote.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
            },
          },
        });

        results.push({
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          status: 'invoice_created',
          invoiceNumber: invoice.invoiceNumber,
        });
      } catch (error) {
        results.push({
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          status: 'error',
          error: error.message,
        });
      }
    }

    return {
      message: `Processed ${acceptedQuotes.length} accepted quotes`,
      results,
    };
  }

  async acceptQuote(id: string) {
    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
      include: {
        lead: true,
        items: true,
      },
    });

    // Create invoice from accepted quote
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          leadId: quote.leadId,
          quoteId: quote.id,
          title: quote.title,
          description: quote.description,
          notes: quote.notes,
          subtotal: quote.subtotal,
          tax: quote.tax,
          discount: quote.discount,
          total: quote.total,
          amountPaid: 0,
          amountDue: quote.total,
          status: 'sent', // Mark as sent since quote was accepted
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          items: {
            create: quote.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
      });

      console.log(
        `✅ Automatically created invoice ${invoiceNumber} from accepted quote ${quote.quoteNumber}`,
      );
    } catch (error) {
      console.error('Failed to create invoice from quote:', error);
      // Don't fail the quote acceptance if invoice creation fails
    }

    // Return HTML confirmation page
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quote Accepted</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card {
              background: white;
              padding: 3rem;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            .icon {
              font-size: 72px;
              margin-bottom: 1rem;
            }
            h1 {
              color: #10b981;
              margin: 0 0 1rem 0;
              font-size: 32px;
            }
            p {
              color: #6b7280;
              font-size: 18px;
              line-height: 1.6;
              margin: 0;
            }
            .quote-number {
              background: #f3f4f6;
              padding: 1rem;
              border-radius: 8px;
              margin-top: 1.5rem;
              font-family: monospace;
              font-size: 16px;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h1>Quote Accepted!</h1>
            <p>Thank you for accepting our quote. We'll be in touch shortly to begin the next steps.</p>
            <div class="quote-number">
              Quote #${quote.quoteNumber}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async rejectQuote(id: string) {
    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
      },
      include: {
        lead: true,
      },
    });

    // Return HTML confirmation page
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quote Declined</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .card {
              background: white;
              padding: 3rem;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            .icon {
              font-size: 72px;
              margin-bottom: 1rem;
            }
            h1 {
              color: #ef4444;
              margin: 0 0 1rem 0;
              font-size: 32px;
            }
            p {
              color: #6b7280;
              font-size: 18px;
              line-height: 1.6;
              margin: 0;
            }
            .quote-number {
              background: #f3f4f6;
              padding: 1rem;
              border-radius: 8px;
              margin-top: 1.5rem;
              font-family: monospace;
              font-size: 16px;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✗</div>
            <h1>Quote Declined</h1>
            <p>Thank you for your response. We appreciate you taking the time to review our quote. If you'd like to discuss alternative options, feel free to contact us.</p>
            <div class="quote-number">
              Quote #${quote.quoteNumber}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async generateAndSendQuote(params: {
    leadId: string;
    quoteData: {
      description: string;
      lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
      subtotal: number;
      tax: number;
      total: number;
      notes: string;
      validUntil: string;
    };
    clerkId: string;
  }) {
    const { leadId, quoteData, clerkId } = params;

    // Get lead and business info
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, businessName: true },
    });

    if (!lead || !user) {
      throw new Error('Lead or user not found');
    }

    // Calculate expiration date
    const expiresAt = new Date(quoteData.validUntil);

    // Create quote in database
    const quote = await this.create({
      leadId,
      title: `Quote for ${lead.serviceType || 'Service'}`,
      description: quoteData.description,
      notes: quoteData.notes,
      items: quoteData.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      taxRate: (quoteData.tax / quoteData.subtotal) * 100,
      discount: 0,
      expiresAt,
    });

    // Send email with quote details
    await this.sendQuote(quote.id);

    return quote;
  }

  async getFinancialBreakdown(quoteId: string, userId: string) {
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

    // Get the quote with all items
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        lead: {
          OR: [
            { userId: dbUserId },
            { user: { clerkId: userId } },
          ],
        },
      },
      include: {
        items: true,
        invoices: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    // Calculate breakdown for each item
    const itemBreakdowns = quote.items.map(quoteItem => {
      const originalEstimate = quoteItem.total;
      
      // Find all invoice items that match this quote item (exclude drafts)
      const relatedInvoiceItems = quote.invoices
        .filter(invoice => invoice.status !== 'draft') // Only count sent/paid invoices
        .flatMap(invoice => 
          invoice.items.filter(invItem => 
            invItem.description.includes(quoteItem.description)
          ).map(invItem => ({
            ...invItem,
            invoice,
          }))
        );

      // Calculate total invoiced for this item (excluding drafts)
      const totalInvoiced = relatedInvoiceItems.reduce((sum, item) => sum + item.total, 0);

      // Calculate payments allocated to this item (proportional)
      const totalPaid = relatedInvoiceItems.reduce((sum, item) => {
        if (item.invoice.total > 0) {
          const itemProportion = item.total / item.invoice.total;
          return sum + (item.invoice.amountPaid * itemProportion);
        }
        return sum;
      }, 0);

      const remainingToInvoice = originalEstimate - totalInvoiced;
      const balanceOwed = totalInvoiced - totalPaid;

      return {
        itemId: quoteItem.id,
        description: quoteItem.description,
        quantity: quoteItem.quantity,
        unitPrice: quoteItem.unitPrice,
        progress: quoteItem.progress,
        originalEstimate,
        totalInvoiced,
        totalPaid,
        remainingToInvoice,
        balanceOwed,
        percentageInvoiced: originalEstimate > 0 ? (totalInvoiced / originalEstimate) * 100 : 0,
        percentagePaid: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
      };
    });

    // Calculate overall totals (only count sent/paid invoices, exclude drafts)
    const totalEstimate = quote.total;
    const totalInvoiced = quote.invoices
      .filter(inv => inv.status !== 'draft') // Exclude draft invoices
      .reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = quote.invoices
      .filter(inv => inv.status !== 'draft') // Exclude draft invoices
      .reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalRemainingToInvoice = totalEstimate - totalInvoiced;
    const totalBalanceOwed = totalInvoiced - totalPaid;

    return {
      quoteId: quote.id,
      quoteTitle: quote.title,
      quoteStatus: quote.status,
      overall: {
        totalEstimate,
        totalInvoiced,
        totalPaid,
        totalRemainingToInvoice,
        totalBalanceOwed,
        percentageInvoiced: totalEstimate > 0 ? (totalInvoiced / totalEstimate) * 100 : 0,
        percentagePaid: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
      },
      items: itemBreakdowns,
    };
  }
}
