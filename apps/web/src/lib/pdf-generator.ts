import jsPDF from "jspdf";

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  title?: string;
  description?: string;
  notes?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: QuoteItem[];
  createdAt: string;
  expiresAt?: string;
  lead: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export function generateQuotePDF(quote: Quote, businessName: string = "AutoStaff AI") {
  const doc = new jsPDF();
  
  // Company branding
  doc.setFillColor(59, 130, 246); // Blue color
  doc.rect(0, 0, 220, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(businessName, 20, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Professional Quote", 20, 33);
  
  // Quote number and date
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Quote #${quote.quoteNumber}`, 150, 25);
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 150, 31);
  if (quote.expiresAt) {
    doc.text(`Valid Until: ${new Date(quote.expiresAt).toLocaleDateString()}`, 150, 37);
  }
  
  // Client information
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 20, 55);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let yPos = 62;
  doc.text(quote.lead.name, 20, yPos);
  if (quote.lead.email) {
    yPos += 6;
    doc.text(quote.lead.email, 20, yPos);
  }
  if (quote.lead.phone) {
    yPos += 6;
    doc.text(quote.lead.phone, 20, yPos);
  }
  if (quote.lead.address) {
    yPos += 6;
    doc.text(quote.lead.address, 20, yPos);
  }
  
  // Quote title and description
  yPos += 15;
  if (quote.title) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(quote.title, 20, yPos);
    yPos += 8;
  }
  
  if (quote.description) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(quote.description, 170);
    doc.text(descLines, 20, yPos);
    yPos += descLines.length * 6;
  }
  
  // Line items table
  yPos += 10;
  
  // Table header
  doc.setFillColor(59, 130, 246);
  doc.rect(20, yPos - 5, 170, 8, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description", 22, yPos);
  doc.text("Qty", 120, yPos);
  doc.text("Unit Price", 140, yPos);
  doc.text("Total", 170, yPos);
  
  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  yPos += 8;
  
  quote.items.forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos - 5, 170, 7, "F");
    }
    
    const descLines = doc.splitTextToSize(item.description, 90);
    doc.text(descLines, 22, yPos);
    doc.text(item.quantity.toString(), 120, yPos);
    doc.text(`$${item.unitPrice.toFixed(2)}`, 140, yPos);
    doc.text(`$${item.total.toFixed(2)}`, 170, yPos);
    
    yPos += Math.max(7, descLines.length * 5);
  });
  
  // Totals section
  yPos += 10;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(120, yPos, 190, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 120, yPos);
  doc.text(`$${quote.subtotal.toFixed(2)}`, 170, yPos);
  yPos += 6;
  
  if (quote.tax > 0) {
    doc.text("Tax:", 120, yPos);
    doc.text(`$${quote.tax.toFixed(2)}`, 170, yPos);
    yPos += 6;
  }
  
  if (quote.discount > 0) {
    doc.setTextColor(34, 197, 94); // Green
    doc.text("Discount:", 120, yPos);
    doc.text(`-$${quote.discount.toFixed(2)}`, 170, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  }
  
  // Total
  doc.setDrawColor(0, 0, 0);
  doc.line(120, yPos, 190, yPos);
  yPos += 7;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", 120, yPos);
  doc.text(`$${quote.total.toFixed(2)}`, 170, yPos);
  
  // Notes/Terms
  if (quote.notes) {
    yPos += 15;
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes & Terms:", 20, yPos);
    yPos += 6;
    
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(quote.notes, 170);
    doc.text(notesLines, 20, yPos);
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${businessName} - Page ${i} of ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }
  
  return doc;
}

export function downloadQuotePDF(quote: Quote, businessName?: string) {
  const doc = generateQuotePDF(quote, businessName);
  doc.save(`Quote-${quote.quoteNumber}.pdf`);
}

export function getQuotePDFBlob(quote: Quote, businessName?: string): Blob {
  const doc = generateQuotePDF(quote, businessName);
  return doc.output("blob");
}
