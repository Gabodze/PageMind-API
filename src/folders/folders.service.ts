import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Folder } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFolderDto): Promise<Folder> {
    const name = dto.name.trim();
    this.assertNameNotEmpty(name);
    await this.assertNameAvailable(userId, name);
    return this.prisma.folder.create({
      data: { name, userId },
    });
  }

  findAll(userId: string) {
    return this.prisma.folder
      .findMany({
        where: { userId },
        include: { _count: { select: { notes: true } } },
        orderBy: { createdAt: 'desc' },
      })
      .then((folders) =>
        folders.map(({ _count, ...folder }) => ({
          ...folder,
          noteCount: _count.notes,
        })),
      );
  }

  async findOne(userId: string, id: string): Promise<Folder> {
    const folder = await this.prisma.folder.findFirst({
      where: { id, userId },
      include: {
        notes: {
          include: { sourcePage: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  async findNotes(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.note.findMany({
      where: { folderId: id, userId },
      include: { sourcePage: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFolderDto,
  ): Promise<Folder> {
    await this.findOne(userId, id);
    const name = dto.name?.trim();
    if (name) {
      await this.assertNameAvailable(userId, name, id);
    } else if (dto.name !== undefined) {
      this.assertNameNotEmpty(name || '');
    }
    return this.prisma.folder.update({
      where: { id },
      data: name ? { ...dto, name } : dto,
    });
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    await this.findOne(userId, id);
    await this.prisma.$transaction([
      this.prisma.note.deleteMany({ where: { folderId: id, userId } }),
      this.prisma.folder.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string,
  ) {
    const folders = await this.prisma.folder.findMany({
      where: { userId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { name: true },
    });
    const normalizedName = name.toLocaleLowerCase();
    if (
      folders.some(
        (folder) => folder.name.trim().toLocaleLowerCase() === normalizedName,
      )
    ) {
      throw new ConflictException('A folder with this name already exists');
    }
  }

  private assertNameNotEmpty(name: string) {
    if (!name) {
      throw new BadRequestException('Folder name cannot be empty');
    }
  }
}
