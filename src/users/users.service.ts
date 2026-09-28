import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// injectable service for managing users in the database
@Injectable()
// provides methods for finding and creating users
export class UsersService {
  // Prisma service instance for database access
  constructor(private readonly prisma: PrismaService) {}
  // findByEmail retrieves a user by their email address
  findByEmail(email: string) {
    // query the database for a user with the specified email
    return this.prisma.user.findUnique({ where: { email } });
  }

  // findById retrieves a user by their unique ID
  findById(id: string) {
    // query the database for a user with the specified ID
    return this.prisma.user.findUnique({ where: { id } });
  }
  // create adds a new user to the database with the provided email, password, and optional name. Returns the created user.
  create(data: { email: string; password: string; name?: string }) {
    // create a new user record in the database with the provided data
    return this.prisma.user.create({ data });
  }
}
