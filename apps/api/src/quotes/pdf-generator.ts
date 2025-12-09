import { jsPDF } from 'jspdf';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  validUntil?: Date;
  notes?: string;
  items: QuoteItem[];
  lead?: {
    name: string;
    email: string;
  };
}

export function generateQuotePDF(quote: Quote, businessName: string = 'Your Business'): Buffer {
  const doc = new jsPDF();
  
  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const secondaryColor: [number, number, number] = [139, 92, 246]; // Purple
  const darkGray: [number, number, number] = [55, 65, 81];
  const lightGray: [number, number, number] = [243, 244, 246];
  
  let yPos = 20;
  
  // Header with gradient background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Business name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, 20, 20);
  
  // Quote number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quote #${quote.quoteNumber}`, 20, 30);
  
  yPos = 50;
  
  // Client information
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  if (quote.lead) {
    doc.text(quote.lead.name, 20, yPos);
    yPos += 5;
    doc.text(quote.lead.email, 20, yPos);
  }
  
  // Quote details (right side)
  let rightX = 140;
  let rightY = 50;
  
  doc.setFont('helvetica', 'bold');
  doc.text('DATE:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString(), rightX + 30, rightY);
  
  if (quote.validUntil) {
    rightY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('VALID UNTIL:', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(quote.validUntil).toLocaleDateString(), rightX + 30, rightY);
  }
  
  yPos += 15;
  
  // Quote title and description
  if (quote.title) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(quote.title, 20, yPos);
    yPos += 8;
  }
  
  if (quote.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    const descLines = doc.splitTextToSize(quote.description, 170);
    doc.text(descLines, 20, yPos);
    yPos += descLines.length * 5 + 5;
  }
  
  yPos += 5;
  
  // Line items table
  const tableStartY = yPos;
  const colWidths = {
    description: 90,
    quantity: 25,
    unitPrice: 30,
    amount: 30
  };
  
  // Table header
  doc.setFillColor(...lightGray);
  doc.rect(20, yPos, 170, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  
  let xPos = 22;
  doc.text('DESCRIPTION', xPos, yPos + 5);
  xPos += colWidths.description;
  doc.text('QTY', xPos, yPos + 5);
  xPos += colWidths.quantity;
  doc.text('UNIT PRICE', xPos, yPos + 5);
  xPos += colWidths.unitPrice;
  doc.text('AMOUNT', xPos, yPos + 5);
  
  yPos += 8;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  quote.items.forEach((item, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(249, 250, 251);
    }
    doc.rect(20, yPos, 170, 7, 'F');
    
    xPos = 22;
    
    // Description (with text wrapping if needed)
    const descLines = doc.splitTextToSize(item.description, colWidths.description - 4);
    doc.text(descLines, xPos, yPos + 5);
    
    xPos += colWidths.description;
    doc.text(item.quantity.toString(), xPos, yPos + 5);
    
    xPos += colWidths.quantity;
    doc.text(`$${item.unitPrice.toFixed(2)}`, xPos, yPos + 5);
    
    xPos += colWidths.unitPrice;
    doc.text(`$${item.amount.toFixed(2)}`, xPos, yPos + 5);
    
    yPos += Math.max(7, descLines.length * 4 + 3);
  });
  
  yPos += 5;
  
  // Totals section
  const totalsX = 130;
  doc.setDrawColor(...darkGray);
  doc.line(totalsX, yPos, 190, yPos);
  
  yPos += 7;
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`$${quote.subtotal.toFixed(2)}`, 190, yPos, { align: 'right' });
  
  yPos += 6;
  
  // Tax
  doc.text(`Tax (${(quote.taxRate * 100).toFixed(1)}%):`, totalsX, yPos);
  doc.text(`$${quote.taxAmount.toFixed(2)}`, 190, yPos, { align: 'right' });
  
  yPos += 6;
  
  // Discount
  if (quote.discount > 0) {
    doc.text('Discount:', totalsX, yPos);
    doc.text(`-$${quote.discount.toFixed(2)}`, 190, yPos, { align: 'right' });
    yPos += 6;
  }
  
  // Line above total
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX, yPos, 190, yPos);
  
  yPos += 7;
  
  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, yPos);
  doc.text(`$${quote.total.toFixed(2)}`, 190, yPos, { align: 'right' });
  
  yPos += 10;
  
  // Notes section
  if (quote.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.text('NOTES:', 20, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(quote.notes, 170);
    doc.text(notesLines, 20, yPos);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    'Thank you for your business!',
    105,
    280,
    { align: 'center' }
  );
  
  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
