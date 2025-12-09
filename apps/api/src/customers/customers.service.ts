import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.lead.findMany({
      where: {
        userId: dbUserId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        quotes: true,
        invoices: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        quotes: {
          include: {
            items: true,
          },
        },
        invoices: {
          include: {
            items: true,
          },
        },
        messages: true,
      },
    });
  }

  async create(data: any) {
    // Handle Clerk user IDs
    let dbUserId = data.userId;
    if (data.userId?.startsWith('user_')) {
      const user = await this.prisma.user.findUnique({
        where: { clerkId: data.userId },
      });
      if (!user) throw new Error('User not found');
      dbUserId = user.id;
    }

    return this.prisma.lead.create({
      data: {
        userId: dbUserId,
        name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unnamed Customer',
        email: data.mainEmail || data.email,
        phone: data.mainPhone || data.phone,
        address: data.invoiceBillToAddress || data.address,
        
        // Customer details
        companyName: data.companyName,
        title: data.title,
        firstName: data.firstName,
        middleInitial: data.middleInitial,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        
        // Phone numbers
        mainPhone: data.mainPhone,
        workPhone: data.workPhone,
        mobile: data.mobile,
        fax: data.fax,
        
        // Emails
        mainEmail: data.mainEmail,
        ccEmail: data.ccEmail,
        
        // Other
        website: data.website,
        other1: data.other1,
        
        // Addresses
        invoiceBillToAddress: data.invoiceBillToAddress,
        shipToAddress: data.shipToAddress,
        defaultShippingAddress: data.defaultShippingAddress,
        
        // Financial
        openingBalance: data.openingBalance,
        openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : null,
        
        // Status
        isActive: data.isActive !== false,
        stage: 'new',
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.lead.update({
      where: { id },
      data: {
        name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.mainEmail || data.email,
        phone: data.mainPhone || data.phone,
        address: data.invoiceBillToAddress || data.address,
        
        // Customer details
        companyName: data.companyName,
        title: data.title,
        firstName: data.firstName,
        middleInitial: data.middleInitial,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        
        // Phone numbers
        mainPhone: data.mainPhone,
        workPhone: data.workPhone,
        mobile: data.mobile,
        fax: data.fax,
        
        // Emails
        mainEmail: data.mainEmail,
        ccEmail: data.ccEmail,
        
        // Other
        website: data.website,
        other1: data.other1,
        
        // Addresses
        invoiceBillToAddress: data.invoiceBillToAddress,
        shipToAddress: data.shipToAddress,
        defaultShippingAddress: data.defaultShippingAddress,
        
        // Financial
        openingBalance: data.openingBalance,
        openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : null,
        
        // Status
        isActive: data.isActive,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.lead.delete({
      where: { id },
    });
  }
}
