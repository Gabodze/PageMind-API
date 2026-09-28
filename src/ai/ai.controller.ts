import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { type AuthUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { SummarizeDto } from './dto/summarize.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summarize')
  summarize(@CurrentUser() user: AuthUser, @Body() dto: SummarizeDto) {
    return this.aiService.summarize(user.id, dto);
  }
}
