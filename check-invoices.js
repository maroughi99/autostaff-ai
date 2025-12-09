const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoices() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        lead: {
          include: {
            user: true
          }
        }
      }
    });

    console.log(`Found ${invoices.length} invoices:`);
    invoices.forEach(inv => {
      console.log(`\nInvoice: ${inv.invoiceNumber}`);
      console.log(`  Status: ${inv.status}`);
      console.log(`  Lead: ${inv.lead.name}`);
      console.log(`  User ID (DB): ${inv.lead.userId}`);
      console.log(`  User Clerk ID: ${inv.lead.user.clerkId}`);
      console.log(`  Total: $${inv.total}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoices();
