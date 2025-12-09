import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GmailService } from '../gmail/gmail.service';
import { StripeService } from '../stripe/stripe.service';
import { generateInvoicePDF } from './pdf-generator';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private gmailService: GmailService,
    private stripeService: StripeService,
  ) {}

  async findAll(userId: string, status?: string) {
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

    const where: any = {
      lead: { userId: dbUserId },
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        lead: true,
        items: true,
        payments: true,
        quote: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lead: true,
        items: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        quote: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async create(userId: string, createDto: any) {
    // Verify lead belongs to user
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: createDto.leadId,
        userId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate totals
    const subtotal = createDto.items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxAmount = subtotal * (createDto.taxRate / 100);
    const discount = createDto.discount || 0;
    const total = subtotal + taxAmount - discount;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        leadId: createDto.leadId,
        jobId: createDto.jobId,
        quoteId: createDto.quoteId,
        title: createDto.title,
        description: createDto.description,
        notes: createDto.notes,
        subtotal,
        tax: taxAmount,
        discount,
        total,
        amountPaid: 0,
        amountDue: total,
        status: 'draft',
        issueDate: new Date(),
        dueDate: createDto.dueDate
          ? new Date(createDto.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        items: {
          create: createDto.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        lead: true,
        items: true,
        payments: true,
      },
    });

    console.log(`✅ Created invoice ${invoiceNumber} for ${lead.email}`);
    return invoice;
  }

  async convertQuoteToInvoice(quoteId: string, userId: string) {
    // Get quote with items
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        lead: { userId },
      },
      include: {
        lead: true,
        items: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'accepted') {
      throw new Error('Only accepted quotes can be converted to invoices');
    }

    // Check if invoice already exists for this quote
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { quoteId: quote.id },
    });

    if (existingInvoice) {
      return existingInvoice;
    }

    // Create invoice from quote
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        leadId: quote.leadId,
        jobId: quote.jobId,
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
        status: 'draft',
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
      include: {
        lead: true,
        items: true,
        payments: true,
      },
    });

    console.log(
      `✅ Converted quote ${quote.quoteNumber} to invoice ${invoiceNumber}`,
    );
    return invoice;
  }

  async createProgressInvoice(quoteId: string, userId: string) {
    // Get quote with items - userId can be either database ID or Clerk ID
    const quote = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        lead: {
          OR: [
            { userId },
            { user: { clerkId: userId } },
          ],
        },
      },
      include: {
        lead: true,
        items: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Check if any items have progress
    const itemsWithProgress = quote.items.filter(item => item.progress > 0);
    if (itemsWithProgress.length === 0) {
      throw new Error('No items have progress set');
    }

    // Calculate invoice amounts based on progress
    const progressItems = quote.items.map(item => ({
      description: `${item.description} (${item.progress}% complete)`,
      quantity: item.quantity,
      unitPrice: item.unitPrice * (item.progress / 100),
      total: item.total * (item.progress / 100),
    }));

    const subtotal = progressItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = quote.subtotal > 0 ? quote.tax / quote.subtotal : 0;
    const tax = subtotal * taxRate;
    const discountRate = quote.subtotal > 0 ? quote.discount / quote.subtotal : 0;
    const discount = subtotal * discountRate;
    const total = subtotal + tax - discount;

    if (total <= 0) {
      throw new Error('Invoice total is $0');
    }

    // Get all previous invoices for this quote to calculate what's been invoiced per item
    const previousInvoices = await this.prisma.invoice.findMany({
      where: { quoteId: quote.id },
      include: { 
        items: true,
        payments: true,
      },
    });

    // Build a breakdown for each job/line item
    let itemBreakdowns = '\n\n=== JOB BREAKDOWN ===\n\n';
    
    quote.items.forEach((quoteItem, index) => {
      const itemNumber = index + 1;
      const originalEstimate = quoteItem.total;
      const currentInvoiceAmount = quoteItem.total * (quoteItem.progress / 100);
      
      // Calculate previously invoiced for this specific item
      // Match by description since we don't have quoteItemId reference
      const previouslyInvoicedForItem = previousInvoices.reduce((sum, inv) => {
        const matchingItems = inv.items.filter(invItem => 
          invItem.description.includes(quoteItem.description)
        );
        return sum + matchingItems.reduce((itemSum, item) => itemSum + item.total, 0);
      }, 0);

      // Calculate payments allocated to this item (proportional to invoice amounts)
      const totalPaidForItem = previousInvoices.reduce((sum, inv) => {
        const matchingItems = inv.items.filter(invItem => 
          invItem.description.includes(quoteItem.description)
        );
        const invoiceItemTotal = matchingItems.reduce((itemSum, item) => itemSum + item.total, 0);
        
        // Calculate proportional payment for this item
        if (inv.total > 0) {
          const itemProportion = invoiceItemTotal / inv.total;
          return sum + (inv.amountPaid * itemProportion);
        }
        return sum;
      }, 0);

      const totalInvoicedForItem = previouslyInvoicedForItem + currentInvoiceAmount;
      const remainingForItem = originalEstimate - totalInvoicedForItem;

      itemBreakdowns += `Job ${itemNumber}: ${quoteItem.description}\n`;
      itemBreakdowns += `  Original Estimate:     $${originalEstimate.toFixed(2)}\n`;
      itemBreakdowns += `  Previously Invoiced:   $${previouslyInvoicedForItem.toFixed(2)}\n`;
      itemBreakdowns += `  This Invoice:          $${currentInvoiceAmount.toFixed(2)} (${quoteItem.progress}% complete)\n`;
      itemBreakdowns += `  Payments Received:     $${totalPaidForItem.toFixed(2)}\n`;
      itemBreakdowns += `  Remaining to Invoice:  $${remainingForItem.toFixed(2)}\n`;
      itemBreakdowns += `  Balance Owed:          $${(totalInvoicedForItem - totalPaidForItem).toFixed(2)}\n\n`;
    });

    // Calculate overall totals
    const totalQuoteAmount = quote.total;
    const totalPreviouslyInvoiced = previousInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = previousInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalInvoicedIncludingThis = totalPreviouslyInvoiced + total;
    const totalRemaining = totalQuoteAmount - totalInvoicedIncludingThis;
    const totalBalanceOwed = totalInvoicedIncludingThis - totalPaid;
    const completionPercentage = ((totalInvoicedIncludingThis / totalQuoteAmount) * 100).toFixed(1);

    // Create progress invoice
    const invoiceNumber = await this.generateInvoiceNumber();

    const progressDescription = `Progress Invoice - ${completionPercentage}% of work completed\n\n` +
      `=== OVERALL SUMMARY ===\n\n` +
      `Original Quote Total:    $${totalQuoteAmount.toFixed(2)}\n` +
      `Previously Invoiced:     $${totalPreviouslyInvoiced.toFixed(2)}\n` +
      `This Invoice:            $${total.toFixed(2)}\n` +
      `Total Invoiced to Date:  $${totalInvoicedIncludingThis.toFixed(2)}\n` +
      `Payments Received:       $${totalPaid.toFixed(2)}\n` +
      `Remaining to Invoice:    $${totalRemaining.toFixed(2)}\n` +
      `Balance Owed:            $${totalBalanceOwed.toFixed(2)}` +
      itemBreakdowns;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        leadId: quote.leadId,
        jobId: quote.jobId,
        quoteId: quote.id,
        title: `${quote.title} - Progress Invoice`,
        description: progressDescription,
        notes: quote.notes,
        subtotal,
        tax,
        discount,
        total,
        amountPaid: 0,
        amountDue: total,
        status: 'draft',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        items: {
          create: progressItems,
        },
      },
      include: {
        lead: true,
        items: true,
        payments: true,
      },
    });

    console.log(
      `✅ Created progress invoice ${invoiceNumber} from quote ${quote.quoteNumber}`,
    );
    return invoice;
  }

  async update(id: string, updateDto: any) {
    const invoice = await this.findOne(id);

    // Recalculate totals if items changed
    let updateData: any = { ...updateDto };

    if (updateDto.items) {
      const subtotal = updateDto.items.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unitPrice,
        0,
      );
      const taxRate = (invoice.tax / invoice.subtotal) * 100;
      const taxAmount = subtotal * (taxRate / 100);
      const discount = updateDto.discount || invoice.discount;
      const total = subtotal + taxAmount - discount;

      updateData = {
        ...updateData,
        subtotal,
        tax: taxAmount,
        total,
        amountDue: total - invoice.amountPaid,
      };

      // Delete old items and create new ones
      await this.prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...updateData,
        items: updateDto.items
          ? {
              create: updateDto.items.map((item: any) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
              })),
            }
          : undefined,
      },
      include: {
        lead: true,
        items: true,
        payments: true,
      },
    });

    console.log(`✅ Updated invoice ${updated.invoiceNumber}`);
    return updated;
  }

  async updateStatus(id: string, status: string) {
    const invoice = await this.findOne(id);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        ...(status === 'paid' ? { paidAt: new Date() } : {}),
      },
      include: {
        lead: true,
        items: true,
        payments: true,
      },
    });

    console.log(
      `✅ Updated invoice ${updated.invoiceNumber} status to ${status}`,
    );
    return updated;
  }

  async recordPayment(
    invoiceId: string,
    paymentData: {
      amount: number;
      method: string;
      reference?: string;
      notes?: string;
    },
  ) {
    const invoice = await this.findOne(invoiceId);

    // Generate payment number
    const paymentNumber = await this.generatePaymentNumber();

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId,
        leadId: invoice.leadId,
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference,
        notes: paymentData.notes,
        status: 'completed',
        paymentDate: new Date(),
      },
    });

    // Update invoice amounts
    const newAmountPaid = invoice.amountPaid + paymentData.amount;
    const newAmountDue = invoice.total - newAmountPaid;

    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : undefined,
      },
      include: {
        lead: true,
        items: true,
        payments: true,
      },
    });

    console.log(
      `💰 Recorded payment of $${paymentData.amount} for invoice ${invoice.invoiceNumber}`,
    );

    // Send payment confirmation email if fully paid
    if (newStatus === 'paid') {
      await this.sendPaymentConfirmation(invoiceId);
    }

    return { payment, invoice: updatedInvoice };
  }

  async sendInvoice(id: string) {
    try {
      const invoice = await this.findOne(id);
      this.logger.log(`📤 Sending invoice ${invoice.invoiceNumber} (${id})`);

      // Get user settings for sender info (invoice.lead.userId is database ID, not clerkId)
      const user = await this.prisma.user.findUnique({
        where: { id: invoice.lead.userId },
      });

      if (!user) {
        this.logger.error(`User not found for invoice ${id} with userId ${invoice.lead.userId}`);
        throw new Error('User not found');
      }

      if (!user.gmailConnected) {
        this.logger.error(`Gmail not connected for user ${user.id}`);
        throw new Error('Gmail not connected. Please connect Gmail in settings.');
      }

      if (!invoice.lead.email) {
        this.logger.error(`No email address for lead ${invoice.lead.id}`);
        throw new Error('Customer has no email address');
      }

      // Generate Stripe payment link if amount is due
      let paymentLink = '';
      if (invoice.amountDue > 0) {
        try {
          paymentLink = await this.stripeService.createPaymentLink(id);
          this.logger.log(`💳 Created Stripe payment link for invoice ${invoice.invoiceNumber}`);
        } catch (error) {
          this.logger.warn(`Failed to create payment link (continuing without it): ${error.message}`);
          // Continue without payment link if Stripe isn't configured
        }
      }

    // Generate PDF
    const pdfBuffer = await this.generatePdf(id);

    // Create email body with payment button if we have a link
    const paymentButton = paymentLink ? `
      <div style="margin: 30px 0; text-align: center;">
        <a href="${paymentLink}" 
           style="display: inline-block; padding: 15px 40px; background-color: #5469d4; color: white; 
                  text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          💳 Pay Now with Credit Card
        </a>
        <p style="margin-top: 10px; font-size: 14px; color: #666;">
          Secure payment powered by Stripe
        </p>
      </div>
    ` : '';

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Invoice ${invoice.invoiceNumber}</h2>
          <p style="font-size: 16px;">Dear ${invoice.lead.name || 'Customer'},</p>
          <p style="font-size: 16px;">Please find attached invoice ${invoice.invoiceNumber}.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">${invoice.title}</h3>
            ${invoice.description ? `<p style="white-space: pre-wrap; color: #555;">${invoice.description}</p>` : ''}
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h4 style="color: #2c3e50; margin-top: 0;">Invoice Details:</h4>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <thead>
                <tr style="background-color: #3498db; color: white;">
                  <th style="text-align: left; padding: 12px; border: none;">Item</th>
                  <th style="text-align: center; padding: 12px; border: none;">Qty</th>
                  <th style="text-align: right; padding: 12px; border: none;">Price</th>
                  <th style="text-align: right; padding: 12px; border: none;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item, index) => `
                  <tr style="background-color: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                    <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.description}</td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.quantity}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e0e0e0;">$${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
              <table style="width: 100%; max-width: 300px; margin-left: auto;">
                <tr>
                  <td style="padding: 8px 0; font-size: 15px;">Subtotal:</td>
                  <td style="text-align: right; padding: 8px 0; font-size: 15px;">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 15px;">Tax:</td>
                  <td style="text-align: right; padding: 8px 0; font-size: 15px;">$${invoice.tax.toFixed(2)}</td>
                </tr>
                ${invoice.discount > 0 ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #27ae60;">Discount:</td>
                  <td style="text-align: right; padding: 8px 0; font-size: 15px; color: #27ae60;">-$${invoice.discount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #3498db;">
                  <td style="padding: 12px 0; font-size: 18px; font-weight: bold; color: #2c3e50;">Total Amount:</td>
                  <td style="text-align: right; padding: 12px 0; font-size: 18px; font-weight: bold; color: #2c3e50;">$${invoice.total.toFixed(2)}</td>
                </tr>
                ${invoice.amountPaid > 0 ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #27ae60;">Amount Paid:</td>
                  <td style="text-align: right; padding: 8px 0; font-size: 15px; color: #27ae60;">$${invoice.amountPaid.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #e74c3c;">Amount Due:</td>
                  <td style="text-align: right; padding: 8px 0; font-size: 16px; font-weight: bold; color: #e74c3c;">$${invoice.amountDue.toFixed(2)}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="margin-top: 20px; padding: 12px; background-color: #fff3cd; border-left: 4px solid #ffc107; font-size: 15px;">
              <strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          ${paymentButton}
          
          ${invoice.notes ? `
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #555;"><strong style="color: #2c3e50;">Notes:</strong></p>
            <p style="white-space: pre-wrap; color: #555; margin: 10px 0 0 0;">${invoice.notes}</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding: 20px; background-color: white; border-radius: 6px; border-top: 3px solid #3498db;">
            <p style="margin: 0 0 10px 0; font-size: 15px;">Please remit payment by the due date. If you have any questions about this invoice, please don't hesitate to contact us.</p>
            <p style="margin: 20px 0 0 0; font-size: 15px;">
              <strong>Best regards,</strong><br>
              <span style="color: #3498db; font-size: 16px;">${user.businessName || 'AutoStaff AI'} Team</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with attachment (convert buffer to base64)
    const pdfBase64 = pdfBuffer.toString('base64');
    await this.gmailService.sendMessageWithAttachment(
      user.clerkId,
      invoice.lead.email,
      `Invoice ${invoice.invoiceNumber} from ${user.businessName || 'AutoStaff AI'}`,
      emailBody,
      `invoice-${invoice.invoiceNumber}.pdf`,
      pdfBase64,
    );

      // Update invoice status
      if (invoice.status === 'draft') {
        await this.prisma.invoice.update({
          where: { id },
          data: { status: 'sent' },
        });
      }

      this.logger.log(`📧 Sent invoice ${invoice.invoiceNumber} to ${invoice.lead.email}`);
      return invoice;
    } catch (error) {
      this.logger.error(`Failed to send invoice ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendPaymentConfirmation(id: string) {
    const invoice = await this.findOne(id);

    const user = await this.prisma.user.findUnique({
      where: { clerkId: invoice.lead.userId },
    });

    if (!user?.gmailConnected) {
      return;
    }

    const emailBody = `
      <h2>Payment Received - Invoice ${invoice.invoiceNumber}</h2>
      <p>Dear ${invoice.lead.name || 'Customer'},</p>
      <p>Thank you! We have received your payment for invoice ${invoice.invoiceNumber}.</p>
      
      <h4>Payment Details:</h4>
      <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Total Amount:</strong> $${invoice.total.toFixed(2)}</p>
      <p><strong>Amount Paid:</strong> $${invoice.amountPaid.toFixed(2)}</p>
      <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
      
      ${invoice.payments.length > 0 ? `
        <h4>Payment History:</h4>
        <ul>
          ${invoice.payments.map((payment) => `
            <li>$${payment.amount.toFixed(2)} - ${payment.method} - ${payment.paymentDate.toLocaleDateString()} ${payment.reference ? `(Ref: ${payment.reference})` : ''}</li>
          `).join('')}
        </ul>
      ` : ''}
      
      <p style="margin-top: 20px;">If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>${user.businessName || 'AutoStaff AI'} Team</p>
    `.replace(/\n\s+/g, '\n');

    await this.gmailService.sendMessage(
      user.clerkId,
      invoice.lead.email,
      `Payment Confirmation - Invoice ${invoice.invoiceNumber}`,
      emailBody,
    );

    console.log(`✅ Sent payment confirmation for invoice ${invoice.invoiceNumber}`);
  }

  async generatePdf(id: string): Promise<Buffer> {
    const invoice = await this.findOne(id);

    const user = await this.prisma.user.findUnique({
      where: { clerkId: invoice.lead.userId },
    });

    return generateInvoicePDF({
      ...invoice,
      businessName: user?.businessName || 'AutoStaff AI',
      businessEmail: user?.email || '',
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verify the invoice belongs to the user
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        lead: {
          OR: [
            { userId },
            { user: { clerkId: userId } },
          ],
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    // Delete associated payments first
    await this.prisma.payment.deleteMany({
      where: { invoiceId: id },
    });

    // Delete invoice items
    await this.prisma.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    // Delete the invoice
    await this.prisma.invoice.delete({
      where: { id },
    });

    this.logger.log(`🗑️ Deleted invoice ${invoice.invoiceNumber} (${id})`);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const timestamp = Date.now();
    return `INV-${timestamp}`;
  }

  private async generatePaymentNumber(): Promise<string> {
    const timestamp = Date.now();
    return `PAY-${timestamp}`;
  }
}
