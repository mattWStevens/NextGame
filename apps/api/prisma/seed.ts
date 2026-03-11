/**
 * Seed script for development.
 * Run with: pnpm --filter api db:seed
 *
 * Test user credentials:
 *   email:    dev@nextgame.local
 *   password: password
 *
 * passwordHash below is a pre-computed bcrypt hash (cost 10) of "password".
 * It will work once bcrypt auth is wired up in Task 3.1.
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEST_USER_EMAIL = 'dev@nextgame.local';
// bcrypt.hashSync('password', 10)
const TEST_PASSWORD_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuu';

const SAMPLE_GAMES = [
  {
    igdbId: 1942,
    title: 'The Witcher 3: Wild Hunt',
    slug: 'the-witcher-3-wild-hunt',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.webp',
    summary:
      'An action RPG following Geralt of Rivia as he searches for his missing ward in a war-ravaged world.',
    genres: ['Role-playing (RPG)', 'Adventure'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One'],
    releaseDate: new Date('2015-05-19'),
    rating: 5,
    review: 'An absolute masterpiece. The side quests alone rival full games.',
    status: 'beaten' as const,
    statusOrder: 0,
  },
  {
    igdbId: 119388,
    title: 'Elden Ring',
    slug: 'elden-ring',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
    summary:
      'An action RPG set in the Lands Between, featuring open-world exploration and brutal combat.',
    genres: ['Role-playing (RPG)', 'Adventure'],
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S'],
    releaseDate: new Date('2022-02-25'),
    rating: 4,
    review: null,
    status: 'playing' as const,
    statusOrder: 0,
  },
  {
    igdbId: 1877,
    title: 'Hollow Knight',
    slug: 'hollow-knight',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.webp',
    summary:
      'A challenging metroidvania set in a vast underground kingdom of insects and heroes.',
    genres: ['Platform', 'Adventure', 'Indie'],
    platforms: ['PC', 'Nintendo Switch'],
    releaseDate: new Date('2017-02-24'),
    rating: null,
    review: null,
    status: 'backlog' as const,
    statusOrder: 0,
  },
  {
    igdbId: 113112,
    title: 'Hades',
    slug: 'hades',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.webp',
    summary:
      'A rogue-like dungeon crawler where you play as the immortal Prince of the Underworld.',
    genres: ['Hack and slash/Beat \'em up', 'Role-playing (RPG)', 'Indie'],
    platforms: ['PC', 'Nintendo Switch', 'PlayStation 4'],
    releaseDate: new Date('2020-09-17'),
    rating: null,
    review: null,
    status: 'backlog' as const,
    statusOrder: 1,
  },
  {
    igdbId: 11133,
    title: 'Disco Elysium',
    slug: 'disco-elysium',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1sfr.webp',
    summary:
      'A groundbreaking open-world RPG with no combat — only your choices, your failures, and your inner voices.',
    genres: ['Role-playing (RPG)', 'Adventure', 'Indie'],
    platforms: ['PC', 'PlayStation 4', 'PlayStation 5'],
    releaseDate: new Date('2019-10-15'),
    rating: null,
    review: null,
    status: 'backlog' as const,
    statusOrder: 2,
  },
  {
    igdbId: 1020,
    title: 'Celeste',
    slug: 'celeste',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmu.webp',
    summary:
      'A precision platformer about climbing a mountain and confronting your inner demons.',
    genres: ['Platform', 'Adventure', 'Indie'],
    platforms: ['PC', 'Nintendo Switch', 'PlayStation 4'],
    releaseDate: new Date('2018-01-25'),
    rating: null,
    review: null,
    status: 'backlog' as const,
    statusOrder: 3,
  },
  {
    igdbId: 7331,
    title: 'Divinity: Original Sin 2',
    slug: 'divinity-original-sin-2',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1t2o.webp',
    summary:
      'A deep tactical RPG with full cooperative multiplayer and near-limitless player freedom.',
    genres: ['Role-playing (RPG)', 'Strategy', 'Adventure'],
    platforms: ['PC', 'PlayStation 4', 'Xbox One'],
    releaseDate: new Date('2017-09-14'),
    rating: null,
    review: null,
    status: 'backlog' as const,
    statusOrder: 4,
  },
  {
    igdbId: 532,
    title: 'Portal 2',
    slug: 'portal-2',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2ktt.webp',
    summary:
      'A puzzle-platformer sequel with an expanded story, co-op mode, and fiendishly clever test chambers.',
    genres: ['Platform', 'Puzzle', 'Shooter'],
    platforms: ['PC', 'PlayStation 3', 'Xbox 360'],
    releaseDate: new Date('2011-04-19'),
    rating: 5,
    review: 'Still one of the best games ever made.',
    status: 'beaten' as const,
    statusOrder: 1,
  },
];

async function main() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {},
    create: {
      email: TEST_USER_EMAIL,
      passwordHash: TEST_PASSWORD_HASH,
      displayName: 'Dev User',
    },
  });

  console.log(`Upserted user: ${user.email} (${user.id})`);

  for (const game of SAMPLE_GAMES) {
    const created = await prisma.game.upsert({
      where: { userId_igdbId: { userId: user.id, igdbId: game.igdbId } },
      update: {},
      create: { ...game, userId: user.id },
    });
    console.log(`  Upserted game: ${created.title} [${created.status}]`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
