import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { DonationRow } from '../../types/database.types';

const DONATION_LABELS: Record<DonationRow['donation_type'], string> = {
  whole_blood: 'Whole Blood',
  plasma: 'Plasma',
  platelets: 'Platelets',
  double_red_cells: 'Double Red Cells',
  organ: 'Organ',
};

// Renders a one-page A4 landscape donation certificate.
@Injectable()
export class CertificateService {
  render(donation: DonationRow, donorName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { width, height } = doc.page;
      doc
        .rect(20, 20, width - 40, height - 40)
        .lineWidth(3)
        .stroke('#E63946');
      doc
        .rect(30, 30, width - 60, height - 60)
        .lineWidth(1)
        .stroke('#F4A3A9');

      doc.moveDown(2);
      doc
        .fillColor('#E63946')
        .fontSize(34)
        .font('Helvetica-Bold')
        .text('Certificate of Donation', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fillColor('#555')
        .fontSize(14)
        .font('Helvetica')
        .text('Life Link gratefully recognises', { align: 'center' });
      doc.moveDown(0.8);
      doc
        .fillColor('#1D3557')
        .fontSize(30)
        .font('Helvetica-Bold')
        .text(donorName, { align: 'center' });
      doc.moveDown(0.8);

      const units = `${donation.units} unit${donation.units === 1 ? '' : 's'}`;
      const group = donation.blood_group ? ` (${donation.blood_group})` : '';
      doc
        .fillColor('#333')
        .fontSize(15)
        .font('Helvetica')
        .text(
          `for the ${DONATION_LABELS[donation.donation_type].toLowerCase()} donation${group} of ${units} ` +
            `at ${donation.hospital_name} on ${formatDate(donation.donated_on)}.`,
          { align: 'center' },
        );
      doc.moveDown(0.6);
      doc.text('Your generosity helps save lives.', { align: 'center' });

      doc
        .fontSize(10)
        .fillColor('#888')
        .text(
          `Certificate ID: ${donation.id}   •   Verified on ${formatDate(donation.verified_at!.slice(0, 10))}`,
          50,
          height - 80,
          { align: 'center', width: width - 100 },
        );
      doc.end();
    });
  }
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
