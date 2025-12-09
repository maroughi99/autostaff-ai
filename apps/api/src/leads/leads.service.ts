import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
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

    return this.prisma.lead.findMany({
      where: { userId: dbUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        quotes: {
          include: {
            items: true,
          },
        },
      },
    });

    console.log('Lead found:', lead);
    console.log('Lead createdAt:', lead?.createdAt);
    console.log('Messages count:', lead?.messages?.length);

    return lead;
  }

  async create(data: any) {
    // Convert Clerk ID to database ID if needed
    let dbUserId = data.userId;
    
    if (data.userId?.startsWith('user_')) {
      const user = await this.prisma.user.findUnique({
        where: { clerkId: data.userId },
        select: { id: true },
      });
      if (user) {
        dbUserId = user.id;
      }
    }

    return this.prisma.lead.create({
      data: {
        ...data,
        userId: dbUserId,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.lead.update({
      where: { id },
      data,
    });
  }

  async updateStage(id: string, stage: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { stage },
    });
  }
}
