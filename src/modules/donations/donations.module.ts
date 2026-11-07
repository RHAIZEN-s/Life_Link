import { Global, Module } from '@nestjs/common';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { CertificateService } from './certificate.service';

@Global()
@Module({
  controllers: [DonationsController],
  providers: [DonationsService, CertificateService],
  exports: [DonationsService],
})
export class DonationsModule {}
