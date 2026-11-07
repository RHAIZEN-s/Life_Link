import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators';

@ApiTags('Status')
@Controller('health')
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  health() {
    return { ok: true };
  }
}
