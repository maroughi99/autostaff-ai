import { jsPDF } from 'jspdf';

interface InvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  businessName: string;
  businessEmail: string;
  lead: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  title: string;
  description?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  notes?: string;
}

export function generateInvoicePDF(invoice: InvoiceData): Buffer {
  const doc = new jsPDF();
  let yPos = 20;

  // Header with blue bar
  doc.setFillColor(30, 64, 175); // Blue
  doc.rect(0, 0, 210, 12, 'F');
  
  // Company name in header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(invoice.businessName, 20, yPos);
  yPos += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(invoice.businessEmail, 20, yPos);

  // INVOICE title (right side)
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('INVOICE', 210, 20, { align: 'right' });

  // Status badge if paid
  if (invoice.status === 'paid') {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(160, 28, 30, 8, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('PAID', 175, 33, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  yPos = 35;

  // Invoice details box (right side)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(130, yPos, 60, 26, 2, 2, 'F');
  
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Invoice #:', 133, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoiceNumber, 187, yPos, { align: 'right' });

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Issue Date:', 133, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.issueDate.toLocaleDateString('en-CA'), 187, yPos, { align: 'right' });

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Due Date:', 133, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.dueDate.toLocaleDateString('en-CA'), 187, yPos, { align: 'right' });

  // Bill To section
  yPos = 50;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, yPos, 90, 35, 3, 3, 'F');
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('BILL TO:', 23, yPos);
  
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.lead.name, 23, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(invoice.lead.email, 23, yPos);

  if (invoice.lead.phone) {
    yPos += 4;
    doc.text(invoice.lead.phone, 23, yPos);
  }

  if (invoice.lead.address) {
    yPos += 4;
    const addressLines = doc.splitTextToSize(invoice.lead.address, 80);
    doc.text(addressLines, 23, yPos);
    yPos += addressLines.length * 4;
  }

  // Project info section
  yPos = 92;
  if (invoice.title) {
    doc.setFillColor(239, 246, 255);
    const descHeight = invoice.description ? 22 : 12;
    doc.roundedRect(20, yPos, 170, descHeight, 2, 2, 'F');
    
    // Blue left border
    doc.setFillColor(37, 99, 235);
    doc.rect(20, yPos, 2, descHeight, 'F');
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Project: ' + invoice.title, 25, yPos);
    
    if (invoice.description) {
      yPos += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const descLines = doc.splitTextToSize(invoice.description, 160);
      doc.text(descLines, 25, yPos);
      yPos += descLines.length * 4 + 8;
    } else {
      yPos += 8;
    }
  }

  yPos += 5;

  // Line items table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Table header with blue background
  doc.setFillColor(30, 64, 175);
  doc.rect(20, yPos - 4, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('Description', 22, yPos);
  doc.text('Qty', 130, yPos, { align: 'center' });
  doc.text('Price', 160, yPos, { align: 'right' });
  doc.text('Total', 188, yPos, { align: 'right' });

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Table rows with alternating colors
  let rowIndex = 0;
  invoice.items.forEach((item) => {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, yPos - 3, 170, 7, 'F');
    }
    
    const descLines = doc.splitTextToSize(item.description, 100);
    doc.text(descLines, 22, yPos);
    doc.text(item.quantity.toString(), 130, yPos, { align: 'center' });
    doc.text('$' + item.unitPrice.toFixed(2), 160, yPos, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text('$' + item.total.toFixed(2), 188, yPos, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    yPos += Math.max(descLines.length * 4, 7);
    rowIndex++;

    // Add new page if needed
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
      rowIndex = 0;
    }
  });

  yPos += 5;

  // Totals section with background
  const totalsBoxHeight = invoice.discount > 0 ? 35 : 30;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(130, yPos - 3, 60, totalsBoxHeight, 2, 2, 'F');

  yPos += 3;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 133, yPos);
  doc.text('$' + invoice.subtotal.toFixed(2), 187, yPos, { align: 'right' });

  yPos += 6;
  doc.text('Tax:', 133, yPos);
  doc.text('$' + invoice.tax.toFixed(2), 187, yPos, { align: 'right' });

  if (invoice.discount > 0) {
    yPos += 6;
    doc.setTextColor(39, 174, 96);
    doc.text('Discount:', 133, yPos);
    doc.text('-$' + invoice.discount.toFixed(2), 187, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  yPos += 8;
  
  // Total box with blue background
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(130, yPos - 3, 60, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('Total:', 133, yPos + 3);
  doc.text('$' + invoice.total.toFixed(2), 187, yPos + 3, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  
  // Payment status
  if (invoice.amountPaid > 0) {
    yPos += 15;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(130, yPos - 3, 60, 16, 2, 2, 'F');
    
    yPos += 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 163, 74);
    doc.text('Amount Paid:', 133, yPos);
    doc.text('$' + invoice.amountPaid.toFixed(2), 187, yPos, { align: 'right' });

    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Amount Due:', 133, yPos);
    doc.text('$' + invoice.amountDue.toFixed(2), 187, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // Notes section with yellow background
  if (invoice.notes) {
    yPos += 20;
    doc.setFillColor(254, 243, 199);
    const notesLines = doc.splitTextToSize(invoice.notes, 160);
    const notesHeight = notesLines.length * 4 + 10;
    doc.roundedRect(20, yPos - 3, 170, notesHeight, 2, 2, 'F');
    
    // Orange left border
    doc.setFillColor(245, 158, 11);
    doc.rect(20, yPos - 3, 2, notesHeight, 'F');
    
    yPos += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('NOTES:', 25, yPos);
    
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 53, 15);
    doc.text(notesLines, 25, yPos);
  }

  // Footer
  yPos = 280;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(20, yPos - 5, 190, yPos - 5);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
  
  yPos += 4;
  doc.setFontSize(7);
  const dueText = 'Payment is due by ' + invoice.dueDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(dueText, 105, yPos, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
