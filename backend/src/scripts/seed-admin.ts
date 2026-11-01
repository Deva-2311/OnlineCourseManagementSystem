import * as dotenv from 'dotenv';
import * as path from 'path';
import * as argon2 from 'argon2';
import { AppDataSource } from '../database/data-source';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/enums/user-role.enum';
import { UserStatus } from '../modules/users/enums/user-status.enum';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  if (!adminEmail || !adminPassword) {
    console.error(`
=================================================================================
ERROR: Missing required administrator provisioning credentials.
Please provide ADMIN_EMAIL and ADMIN_PASSWORD as environment variables.

Usage:
  ADMIN_EMAIL=admin@ocms.com ADMIN_PASSWORD="AdminSecurePass123!" npm run seed:admin

Alternatively, configure ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.
=================================================================================
    `);
    process.exit(1);
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

  console.log(`Connecting to database to provision admin [${normalizedEmail}]...`);
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(User);

  const existingUser = await userRepository.findOne({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    if (existingUser.role === UserRole.ADMIN) {
      console.log(`Notice: Administrator account [${normalizedEmail}] already exists. No changes made.`);
    } else {
      console.error(
        `Error: An account with email [${normalizedEmail}] already exists with role [${existingUser.role}]. Refusing to overwrite.`,
      );
    }
    await AppDataSource.destroy();
    return;
  }

  console.log('Hashing administrator password with Argon2...');
  const passwordHash = await argon2.hash(adminPassword);

  const newAdmin = userRepository.create({
    fullName: adminName,
    email: normalizedEmail,
    passwordHash,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
  });

  await userRepository.save(newAdmin);

  console.log(`
=================================================================================
SUCCESS: Administrator account successfully created!
ID:    ${newAdmin.id}
Name:  ${newAdmin.fullName}
Email: ${newAdmin.email}
Role:  ${newAdmin.role}
=================================================================================
  `);

  await AppDataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('Admin provisioning failed:', err);
  process.exit(1);
});
