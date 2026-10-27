import { Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, ScheduleModule } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';

// Sends appointment, camp, eligibility and stale-request reminders. The SQL
// function claims rows atomically, so running several API instances is safe.
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private readonly enabled: boolean;
  private running = false;

  constructor(
    config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.enabled =
      config.get<boolean>('REMINDERS_ENABLED') !== false &&
      config.get<string>('NODE_ENV') !== 'test';
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run() {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      const { data, error } = await this.supabase.client.rpc(
        'run_scheduled_reminders',
        {},
      );
      if (error) throw new Error(error.message);
      this.logger.log(`Reminders sent: ${JSON.stringify(data)}`);
    } catch (err) {
      this.logger.error(
        'Reminder run failed',
        err instanceof Error ? err.stack : String(err),
      );
    } finally {
      this.running = false;
    }
  }
}

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [RemindersService],
})
export class RemindersModule {}
