import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { validate } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { FoldersModule } from './folders/folders.module';
import { NotesModule } from './notes/notes.module';
import { AiModule } from './ai/ai.module';
// root module of the application, importing and configuring all other modules
// sets up global configuration, authentication, database access, health checks, and feature modules
// serves as the main entry point for the NestJS application
// contains the main AppModule class decorated with @Module
@Module({
  // imports all necessary modules for the application
  imports: [
    // configure the global configuration module with environment validation
    ConfigModule.forRoot({
      // isGlobal indicates that the configuration should be available globally throughout the application
      isGlobal: true,
      validate,
    }),
    // authentication module for handling user authentication and authorization
    AuthModule,
    // Prisma module for database access
    PrismaModule,
    // Health module for application health checks
    HealthModule,
    // Folders module for managing user folders
    FoldersModule,
    // Notes module for managing user notes
    NotesModule,
    // AI module for integrating AI features
    AiModule,
  ],
})
export class AppModule {}
