const path = require('path');
process.env.DATABASE_URL = `file:${path.join(__dirname, 'packages', 'database', 'dev.db')}`;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      subject: true,
      isAiGenerated: true,
      aiApprovalNeeded: true,
      direction: true,
      createdAt: true
    }
  });
  
  console.log('Recent messages:');
  messages.forEach(m => {
    console.log(`\n${m.subject}`);
    console.log(`  Direction: ${m.direction}`);
    console.log(`  AI Generated: ${m.isAiGenerated}`);
    console.log(`  Needs Approval: ${m.aiApprovalNeeded}`);
    console.log(`  Created: ${m.createdAt}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
