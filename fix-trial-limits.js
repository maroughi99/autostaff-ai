// Script to enforce proper AI conversation limits for trial users
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTrialLimits() {
  try {
    console.log('Checking users with trial status...');
    
    // Find all users with trial status
    const trialUsers = await prisma.user.findMany({
      where: {
        subscriptionStatus: 'trial'
      },
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        aiConversationsLimit: true,
        aiConversationsUsed: true,
      }
    });

    console.log(`Found ${trialUsers.length} trial users\n`);

    for (const user of trialUsers) {
      console.log(`User: ${user.email}`);
      console.log(`  Plan: ${user.subscriptionPlan}`);
      console.log(`  Current limit: ${user.aiConversationsLimit === null ? 'Unlimited' : user.aiConversationsLimit}`);
      console.log(`  Current usage: ${user.aiConversationsUsed}`);

      let correctLimit = null;
      
      // Set correct limit based on plan
      if (user.subscriptionPlan === 'starter') {
        correctLimit = 50;
      } else if (user.subscriptionPlan === 'pro') {
        correctLimit = 200;
      } else if (user.subscriptionPlan === 'ultimate') {
        correctLimit = null; // unlimited
      }

      // Update if limit is wrong
      if (user.aiConversationsLimit !== correctLimit) {
        await prisma.user.update({
          where: { id: user.id },
          data: { aiConversationsLimit: correctLimit }
        });
        console.log(`  ✓ Updated limit to: ${correctLimit === null ? 'Unlimited' : correctLimit}\n`);
      } else {
        console.log(`  ✓ Limit is already correct\n`);
      }
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrialLimits();
