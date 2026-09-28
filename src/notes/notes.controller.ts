import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  Patch,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';
import { CaptureNoteDto } from './dto/capture-note.dto';
import { UploadPdfDto } from './dto/upload-pdf.dto';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNoteDto) {
    return this.notesService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('folderId') folderId?: string) {
    return this.notesService.findAll(user.id, folderId);
  }

  @Post('capture')
  capture(@CurrentUser() user: AuthUser, @Body() dto: CaptureNoteDto) {
    return this.notesService.capture(user.id, dto);
  }

  // post endpoint for uploading PDF files
  @Post('pdf')
  // use file interceptor to handle file uploads
  @UseInterceptors(FileInterceptor('file'))
  // use ParseFilePipe to validate the uploaded file
  // uploadPdf endpoint for handling PDF file uploads
  uploadPdf(
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      // validate the uploaded file using ParseFilePipe
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    // the uploaded file will be available as the 'file' parameter
    // multer will handle the file upload and provide the file as an Express.Multer.File object
    file: Express.Multer.File,
    // additional data related to the PDF upload will be available in the 'dto' parameter
    // this allows the client to send additional metadata along with the PDF file
    // for example, the client can send the title or description of the PDF file
    // this allows the server to receive both the file and its associated metadata in a single request
    // this is useful for associating the uploaded PDF with additional information in the database
    // this ensures that the uploaded PDF is properly linked with its metadata
    // the 'dto' parameter will contain the additional metadata sent by the client
    // this allows the server to properly handle the uploaded PDF and its metadata
    @Body() dto: UploadPdfDto,
  ) {
    // call the notesService to handle the PDF upload and associate it with the user and metadata
    // the notesService.uploadPdf method will handle storing the PDF file and its metadata in the database
    // the 'file' parameter contains the uploaded PDF file
    // the 'dto' parameter contains the additional metadata for the PDF file
    // return the result of the PDF upload operation to the client
    // the following line calls the notesService to handle the PDF upload
    // this ensures that the PDF file and its metadata are properly processed and stored
    // finally, return the result of the upload operation to the client
    return this.notesService.uploadPdf(user.id, file, dto);
  }

  // endpoint to retrieve the last used folder for the current user
  @Get('last-folder')
  lastFolder(@CurrentUser() user: AuthUser) {
    return this.notesService.lastUsedFolderId(user.id);
  }
  // endpoint to retrieve a specific note by its ID for the current user
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notesService.findOne(user.id, id);
  }
  // endpoint to update a specific note by its ID for the current user
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.id, id, dto);
  }

  // endpoint to delete a specific note by its ID for the current user
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notesService.remove(user.id, id);
  }
}
// NotesController handles all endpoints related to notes, including creating, retrieving, updating, and deleting notes, as well as uploading PDFs and retrieving the last used folder for the current user.
