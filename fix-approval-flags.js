const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update all AI-generated messages to require approval if not yet sent
  const result = await prisma.message.updateMany({
    where: {
      isAiGenerated: true,
      aiApprovalNeeded: false,
      sentAt: null,
    },
    data: {
      aiApprovalNeeded: true,
    },
  });

  console.log(`✅ Updated ${result.count} messages to require approval`);
  
  // Show current state
  const aiMessages = await prisma.message.findMany({
    where: {
      isAiGenerated: true,
    },
    select: {
      id: true,
      subject: true,
      isAiGenerated: true,
      aiApprovalNeeded: true,
      sentAt: true,
      direction: true,
    },
  });

  console.log(`\n📊 AI-generated messages (${aiMessages.length} total):`);
  aiMessages.forEach(m => {
    console.log(`\n  ${m.subject}`);
    console.log(`    Direction: ${m.direction}`);
    console.log(`    Needs Approval: ${m.aiApprovalNeeded}`);
    console.log(`    Sent: ${m.sentAt ? 'Yes' : 'No'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
