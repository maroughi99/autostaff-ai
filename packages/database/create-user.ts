import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createUser() {
  // Replace with your actual Clerk user ID
  const clerkId = 'user_2pM9q4xQYZH7vL8eR3nK1sT6wPd'; // You'll need to get this from Clerk
  const email = 'tonymaroughi@gmail.com';
  const name = 'Tony';

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: { email, name },
    create: {
      clerkId,
      email,
      name,
    },
  });

  console.log('User created:', user);
}

createUser()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
