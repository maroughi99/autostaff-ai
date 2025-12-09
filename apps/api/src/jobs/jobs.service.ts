import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async findAll(customerId?: string) {
    return this.prisma.job.findMany({
      where: customerId ? { leadId: customerId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            name: true,
            companyName: true,
            mainEmail: true,
            mainPhone: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    });
  }

  async create(data: any) {
    // Get customer data to pre-fill job fields
    const customer = await this.prisma.lead.findUnique({
      where: { id: data.leadId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    if (!data.jobName) {
      throw new Error('Job name is required');
    }

    // Helper to use provided value or fall back to customer value, treating empty strings as null
    const getValue = (value: any, fallback: any) => {
      if (value === '' || value === undefined || value === null) {
        return fallback || null;
      }
      return value;
    };

    return this.prisma.job.create({
      data: {
        leadId: data.leadId,
        jobName: data.jobName.trim(),
        
        // Opening balance
        openingBalance: data.openingBalance || null,
        openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : null,
        
        // Contact details - use provided or inherit from customer
        companyName: getValue(data.companyName, customer.companyName),
        title: getValue(data.title, customer.title),
        firstName: getValue(data.firstName, customer.firstName),
        middleInitial: getValue(data.middleInitial, customer.middleInitial),
        lastName: getValue(data.lastName, customer.lastName),
        jobTitle: getValue(data.jobTitle, customer.jobTitle),
        
        // Phone numbers
        mainPhone: getValue(data.mainPhone, customer.mainPhone),
        workPhone: getValue(data.workPhone, customer.workPhone),
        mobile: getValue(data.mobile, customer.mobile),
        fax: getValue(data.fax, customer.fax),
        
        // Emails
        mainEmail: getValue(data.mainEmail, customer.mainEmail),
        ccEmail: getValue(data.ccEmail, customer.ccEmail),
        
        // Other
        website: getValue(data.website, customer.website),
        other1: getValue(data.other1, customer.other1),
        
        // Addresses
        invoiceBillToAddress: getValue(data.invoiceBillToAddress, customer.invoiceBillToAddress),
        shipToAddress: getValue(data.shipToAddress, customer.shipToAddress),
        defaultShippingAddress: data.defaultShippingAddress !== undefined ? data.defaultShippingAddress : (customer.defaultShippingAddress || false),
        
        // Job details
        isActive: data.isActive !== false,
        status: data.status || 'pending',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        description: data.description || null,
        notes: data.notes || null,
      },
      include: {
        lead: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.job.update({
      where: { id },
      data: {
        jobName: data.jobName,
        
        openingBalance: data.openingBalance,
        openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : null,
        
        companyName: data.companyName,
        title: data.title,
        firstName: data.firstName,
        middleInitial: data.middleInitial,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        
        mainPhone: data.mainPhone,
        workPhone: data.workPhone,
        mobile: data.mobile,
        fax: data.fax,
        
        mainEmail: data.mainEmail,
        ccEmail: data.ccEmail,
        
        website: data.website,
        other1: data.other1,
        
        invoiceBillToAddress: data.invoiceBillToAddress,
        shipToAddress: data.shipToAddress,
        defaultShippingAddress: data.defaultShippingAddress,
        
        isActive: data.isActive,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        description: data.description,
        notes: data.notes,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.job.delete({
      where: { id },
    });
  }
}
