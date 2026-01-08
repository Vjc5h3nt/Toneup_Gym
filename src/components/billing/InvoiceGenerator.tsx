import { format, parseISO } from 'date-fns';

interface InvoiceData {
  invoiceNumber: string;
  paymentDate: string;
  memberName: string;
  memberPhone: string;
  memberEmail?: string | null;
  memberAddress?: string | null;
  amount: number;
  paymentMethod: string;
  membershipType?: string;
  membershipStart?: string;
  membershipEnd?: string;
  notes?: string | null;
}

interface GymDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
  logo?: string;
}

const defaultGymDetails: GymDetails = {
  name: 'FitZone Gym',
  address: '123 Fitness Street, Health City, IN 400001',
  phone: '+91 98765 43210',
  email: 'info@fitzonegym.com',
  gstNumber: 'GST123456789',
};

export function generateInvoicePDF(data: InvoiceData, gymDetails: GymDetails = defaultGymDetails) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to generate invoice');
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    card: 'Credit/Debit Card',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    other: 'Other',
  };

  const membershipTypeLabels: Record<string, string> = {
    normal: 'Regular Gym Membership',
    personal_training: 'Personal Training',
    yoga: 'Yoga Classes',
    crossfit: 'CrossFit',
    other: 'Other',
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${data.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          color: #1a1a1a;
          background: #fff;
          max-width: 800px;
          margin: 0 auto;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .gym-info h1 {
          color: #4f46e5;
          font-size: 28px;
          margin-bottom: 8px;
        }
        .gym-info p {
          color: #666;
          font-size: 13px;
          line-height: 1.6;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h2 {
          color: #1a1a1a;
          font-size: 32px;
          margin-bottom: 10px;
        }
        .invoice-title p {
          color: #666;
          font-size: 14px;
        }
        .invoice-number {
          background: #f3f4f6;
          padding: 8px 16px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 14px;
          margin-top: 10px;
          display: inline-block;
        }
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-box {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
        }
        .info-box h3 {
          color: #4f46e5;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .info-box p {
          font-size: 14px;
          line-height: 1.8;
          color: #333;
        }
        .info-box strong {
          color: #1a1a1a;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .invoice-table th {
          background: #4f46e5;
          color: white;
          padding: 14px 16px;
          text-align: left;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .invoice-table th:last-child {
          text-align: right;
        }
        .invoice-table td {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .invoice-table td:last-child {
          text-align: right;
          font-weight: 600;
        }
        .invoice-table tr:last-child td {
          border-bottom: none;
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .totals-box {
          background: #f9fafb;
          padding: 20px 30px;
          border-radius: 8px;
          min-width: 280px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .totals-row.total {
          border-top: 2px solid #4f46e5;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 18px;
          font-weight: 700;
          color: #4f46e5;
        }
        .payment-info {
          background: #ecfdf5;
          border: 1px solid #10b981;
          border-radius: 8px;
          padding: 16px 20px;
          margin-bottom: 30px;
        }
        .payment-info p {
          color: #065f46;
          font-size: 14px;
        }
        .payment-info strong {
          color: #047857;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #666;
          font-size: 12px;
          line-height: 1.8;
        }
        .footer strong {
          color: #4f46e5;
        }
        ${gymDetails.gstNumber ? `
        .gst-info {
          background: #fef3c7;
          padding: 10px 16px;
          border-radius: 4px;
          font-size: 13px;
          margin-top: 15px;
          display: inline-block;
        }
        ` : ''}
        @media print {
          body { padding: 20px; }
          .invoice-header { page-break-inside: avoid; }
          .invoice-table { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="gym-info">
          <h1>${gymDetails.name}</h1>
          <p>${gymDetails.address}</p>
          <p>Phone: ${gymDetails.phone}</p>
          <p>Email: ${gymDetails.email}</p>
          ${gymDetails.gstNumber ? `<p class="gst-info"><strong>GSTIN:</strong> ${gymDetails.gstNumber}</p>` : ''}
        </div>
        <div class="invoice-title">
          <h2>INVOICE</h2>
          <p>Date: ${format(parseISO(data.paymentDate), 'PPP')}</p>
          <div class="invoice-number">${data.invoiceNumber}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-box">
          <h3>Bill To</h3>
          <p>
            <strong>${data.memberName}</strong><br>
            Phone: ${data.memberPhone}<br>
            ${data.memberEmail ? `Email: ${data.memberEmail}<br>` : ''}
            ${data.memberAddress ? `Address: ${data.memberAddress}` : ''}
          </p>
        </div>
        <div class="info-box">
          <h3>Invoice Details</h3>
          <p>
            <strong>Invoice No:</strong> ${data.invoiceNumber}<br>
            <strong>Date:</strong> ${format(parseISO(data.paymentDate), 'PPP')}<br>
            <strong>Payment Method:</strong> ${paymentMethodLabels[data.paymentMethod] || data.paymentMethod}
          </p>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Period</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              ${data.membershipType ? membershipTypeLabels[data.membershipType] || data.membershipType : 'Gym Services'}
              ${data.notes ? `<br><small style="color:#666">${data.notes}</small>` : ''}
            </td>
            <td>
              ${data.membershipStart && data.membershipEnd 
                ? `${format(parseISO(data.membershipStart), 'PP')} - ${format(parseISO(data.membershipEnd), 'PP')}`
                : 'N/A'}
            </td>
            <td>₹${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>₹${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="totals-row">
            <span>Tax (Included)</span>
            <span>₹0.00</span>
          </div>
          <div class="totals-row total">
            <span>Total Paid</span>
            <span>₹${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div class="payment-info">
        <p>
          <strong>✓ Payment Received</strong> - 
          Amount of ₹${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} 
          paid via ${paymentMethodLabels[data.paymentMethod] || data.paymentMethod} 
          on ${format(parseISO(data.paymentDate), 'PPP')}
        </p>
      </div>

      <div class="footer">
        <p><strong>Thank you for your business!</strong></p>
        <p>If you have any questions about this invoice, please contact us.</p>
        <p>${gymDetails.email} | ${gymDetails.phone}</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
  };
}

export function generateInvoiceForEmail(data: InvoiceData, gymDetails: GymDetails = defaultGymDetails): string {
  // Returns HTML content suitable for email
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Invoice from ${gymDetails.name}</h2>
      <p>Dear ${data.memberName},</p>
      <p>Thank you for your payment. Here are your invoice details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Invoice Number</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Date</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${format(parseISO(data.paymentDate), 'PPP')}</td>
        </tr>
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Amount</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">₹${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Payment Method</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.paymentMethod}</td>
        </tr>
      </table>
      <p>Best regards,<br>${gymDetails.name}</p>
    </div>
  `;
}
