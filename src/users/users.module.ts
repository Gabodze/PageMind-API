import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
// module for managing users, providing the UsersService to other parts of the application
@Module({
  // no imports are needed for this module as it only provides the UsersService
  providers: [UsersService],
  // exports the UsersService so it can be used in other modules
  exports: [UsersService],
})
export class UsersModule {}
