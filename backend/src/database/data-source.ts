import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.resolve(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [path.resolve(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: false,
});
