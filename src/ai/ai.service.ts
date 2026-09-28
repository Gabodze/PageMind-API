import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ENV } from '../config/env.constants';
import { NotesService } from '../notes/notes.service';
import { SummarizeDto } from './dto/summarize.dto';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly notesService: NotesService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>(ENV.AI_API_KEY),
      baseURL: this.config.getOrThrow<string>(ENV.AI_BASE_URL),
    });
    this.model = this.config.getOrThrow<string>(ENV.AI_MODEL);
  }

  async summarize(userId: string, dto: SummarizeDto) {
    let completion: OpenAI.Chat.Completions.ChatCompletion;

    try {
      completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You summarize web page or article text. Return concise bullet points and a 2–3 sentence overview. No preamble.',
          },
          {
            role: 'user',
            content: dto.content.slice(0, 12000),
          },
        ],
        temperature: 0.3,
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown AI error';
      console.error('AI provider error:', error);
      throw new InternalServerErrorException(
        `AI provider request failed: ${detail}`,
      );
    }

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw new InternalServerErrorException('Empty AI response');
    }

    let note: unknown = null;
    if (dto.saveToNote) {
      note = await this.notesService.create(userId, {
        title: dto.title ?? 'Summary',
        content: summary,
        url: dto.url,
        type: 'SUMMARY',
        folderId: dto.folderId,
      });
    }

    return { summary, note };
  }
}
