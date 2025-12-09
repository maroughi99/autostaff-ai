const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteInvoices() {
  try {
    // Delete the invoices that were created from accepted quotes
    const result = await prisma.invoice.deleteMany({
      where: {
        invoiceNumber: {
          in: ['INV-1765212077801-z40g4xbgb', 'INV-1765212077830-1rh01e352']
        }
      }
    });

    console.log(`Deleted ${result.count} invoices`);
    console.log('Invoices removed - quotes remain as quotes');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteInvoices();
