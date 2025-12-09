const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function markAllInvoicesPaid() {
  try {
    // Get all invoices that are not paid
    const invoices = await prisma.invoice.findMany({
      where: {
        status: {
          not: 'paid'
        }
      }
    });

    console.log(`Found ${invoices.length} unpaid invoices`);

    // Mark each as paid
    for (const invoice of invoices) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'paid',
          amountPaid: invoice.total,
          amountDue: 0,
          paidAt: new Date()
        }
      });
      console.log(`Marked invoice ${invoice.invoiceNumber} as paid`);
    }

    console.log('All invoices marked as paid!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

markAllInvoicesPaid();
