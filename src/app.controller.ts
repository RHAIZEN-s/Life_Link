import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Status')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Check that the API is running' })
  @ApiOkResponse({
    description: 'The API is available.',
    schema: { example: { ok: true } },
  })
  @Get()
  getRoot() {
    return { ok: true };
  }
}
