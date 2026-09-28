import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { FilesController } from './files.controller';

@Module({
  controllers: [FoldersController, FilesController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
