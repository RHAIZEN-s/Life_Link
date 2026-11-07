import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { MailModule } from './modules/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RequestsModule } from './modules/requests/requests.module';
import { DonationsModule } from './modules/donations/donations.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CampsModule } from './modules/camps/camps.module';
import { SearchModule } from './modules/search/search.module';
import { PlacesModule } from './modules/places/places.module';
import { HomeModule } from './modules/home/home.module';
import { AdminModule } from './modules/admin/admin.module';
import { CryptoModule } from './common/crypto.service';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { CommunityModule } from './modules/community/community.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { RemindersModule } from './modules/reminders/reminders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    CryptoModule,
    SupabaseModule,
    MailModule,
    AuthModule,
    NotificationsModule,
    HospitalsModule,
    ProfileModule,
    RequestsModule,
    DonationsModule,
    DocumentsModule,
    CampsModule,
    SearchModule,
    PlacesModule,
    AppointmentsModule,
    AnnouncementsModule,
    ReportsModule,
    CommunityModule,
    HomeModule,
    AdminModule,
    RemindersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
