import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import pdf from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';
import { CaptureNoteDto } from './dto/capture-note.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { SourcePageDto } from './dto/source-page.dto';
import { UploadPdfDto } from './dto/upload-pdf.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateNoteDto) {
    if (dto.sourcePage) {
      return this.saveNote(
        userId,
        dto.fileId ?? dto.folderId ?? null,
        dto.content,
        dto.sourcePage,
      );
    }
    if (dto.folderId) {
      await this.assertFolderOwner(userId, dto.folderId);
    }

    return this.prisma.note.create({
      data: {
        title: dto.title,
        content: dto.content,
        url: dto.url,
        type: dto.type,
        folderId: dto.folderId,
        userId,
      },
    });
  }

  async capture(userId: string, dto: CaptureNoteDto) {
    if (dto.folderId) {
      await this.assertFolderOwner(userId, dto.folderId);
    }

    const normalizedUrl = this.normalizeUrl(dto.url);
    const existing = await this.prisma.note.findFirst({
      where: {
        userId,
        url: normalizedUrl,
        ...(dto.folderId ? { folderId: dto.folderId } : {}),
      },
    });

    if (existing) {
      const note = await this.prisma.note.update({
        where: { id: existing.id },
        data: {
          title: dto.title ?? existing.title,
          content: dto.content,
          folderId: dto.folderId ?? existing.folderId,
          url: normalizedUrl,
        },
      });
      return { note, created: false };
    }

    const note = await this.prisma.note.create({
      data: {
        title: dto.title ?? 'Untitled page',
        content: dto.content,
        url: normalizedUrl,
        type: 'FULL_PAGE',
        folderId: dto.folderId,
        userId,
      },
    });
    return { note, created: true };
  }

  async uploadPdf(
    userId: string,
    file: Express.Multer.File,
    dto: UploadPdfDto,
  ) {
    if (!file.buffer.subarray(0, 5).toString().startsWith('%PDF-')) {
      throw new BadRequestException('The uploaded file is not a valid PDF');
    }

    if (dto.folderId) {
      await this.assertFolderOwner(userId, dto.folderId);
    }

    let parsed: { text: string; numpages: number };
    try {
      parsed = await pdf(file.buffer);
    } catch {
      throw new BadRequestException('Unable to extract text from PDF');
    }

    const content = parsed.text.trim();
    if (!content) {
      throw new BadRequestException(
        'The PDF does not contain extractable text',
      );
    }

    const fallbackTitle = file.originalname.replace(/\.pdf$/i, '').trim();
    const note = await this.prisma.note.create({
      data: {
        title: dto.title?.trim() || fallbackTitle || 'Untitled PDF',
        content,
        url: dto.url,
        type: 'PDF',
        folderId: dto.folderId,
        userId,
      },
    });

    return { note, pageCount: parsed.numpages };
  }

  async saveNote(
    userId: string,
    folderId: string | null,
    content: string,
    source: SourcePageDto,
  ) {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new ForbiddenException('Selected text cannot be empty');
    }
    if (folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: folderId, userId },
      });
      if (!folder) {
        throw new ForbiddenException('File not found or not yours');
      }
    }

    const url = this.normalizeUrl(source.url);
    return this.prisma.$transaction(async (tx) => {
      const sourcePage = await tx.sourcePage.upsert({
        where: { url },
        create: { url, title: source.title, faviconUrl: source.faviconUrl },
        update: {
          title: source.title ?? undefined,
          faviconUrl: source.faviconUrl ?? undefined,
        },
      });
      const existingHighlights = await tx.note.findMany({
        where: {
          userId,
          folderId,
          sourcePageId: sourcePage.id,
          type: 'HIGHLIGHT',
        },
        include: { sourcePage: true },
      });
      const normalizedContent = this.normalizeContent(trimmedContent);
      const matchingNotes = existingHighlights
        .filter((note) => {
          const normalizedNote = this.normalizeContent(note.content);
          return (
            normalizedContent === normalizedNote ||
            normalizedContent.includes(normalizedNote) ||
            (normalizedNote.includes(normalizedContent) &&
              this.isMeaningfulSelection(normalizedContent))
          );
        })
        .sort((a, b) => b.content.length - a.content.length);

      if (matchingNotes.length) {
        const exactMatch = matchingNotes.find(
          (note) => this.normalizeContent(note.content) === normalizedContent,
        );
        const canonicalNote = exactMatch ?? matchingNotes[0];
        const duplicateIds = matchingNotes
          .filter((note) => note.id !== canonicalNote.id)
          .map((note) => note.id);

        if (exactMatch) {
          if (duplicateIds.length) {
            await tx.note.deleteMany({ where: { id: { in: duplicateIds } } });
          }
          return { note: exactMatch, created: false, updated: false };
        }

        const updated = await tx.note.update({
          where: { id: canonicalNote.id },
          data: {
            content: trimmedContent,
            title: source.title,
            url,
          },
          include: { sourcePage: true },
        });
        if (duplicateIds.length) {
          await tx.note.deleteMany({ where: { id: { in: duplicateIds } } });
        }
        return { note: updated, created: false, updated: true };
      }

      const note = await tx.note.create({
        data: {
          userId,
          folderId,
          content: trimmedContent,
          title: source.title,
          url,
          type: 'HIGHLIGHT',
          sourcePageId: sourcePage.id,
        },
        include: { sourcePage: true },
      });
      return { note, created: true, updated: false };
    });
  }

  async lastUsedFolderId(userId: string) {
    const last = await this.prisma.note.findFirst({
      where: { userId, folderId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { folderId: true },
    });
    return { folderId: last?.folderId ?? null };
  }

  findAll(userId: string, folderId?: string) {
    const where =
      folderId === 'none'
        ? { userId, folderId: null }
        : { userId, ...(folderId ? { folderId } : {}) };
    return this.prisma.note.findMany({
      where,
      include: { sourcePage: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    await this.findOne(userId, id);

    if (dto.folderId) {
      await this.assertFolderOwner(userId, dto.folderId);
    }

    return this.prisma.note.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.note.delete({ where: { id } });
    return { success: true };
  }

  private async assertFolderOwner(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) {
      throw new ForbiddenException('Folder not found or not yours');
    }
  }

  private normalizeUrl(value: string) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new ForbiddenException('Invalid source URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ForbiddenException('Invalid source URL');
    }
    parsed.hash = '';
    if (parsed.pathname.length > 1)
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  }

  private normalizeContent(value: string) {
    return value.replace(/\s+/g, ' ').trim();
  }

  private isMeaningfulSelection(value: string) {
    return value.length >= 40 || value.split(/\s+/).length >= 6;
  }
}
