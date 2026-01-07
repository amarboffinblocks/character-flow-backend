import { PrismaClient, SubscriptionPlan, Role, Rating, Visibility } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // Create Admin User
  // ============================================

  const adminPassword = await argon2.hash('Admin@123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@youruniverse.ai' },
    update: {},
    create: {
      name: 'Admin User',
      username: 'admin',
      email: 'admin@youruniverse.ai',
      password: adminPassword,
      role: Role.admin,
      isEmailVerified: true,
      subscriptionPlan: SubscriptionPlan.pioneer,
      tokensRemaining: 100000,
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // ============================================
  // Create Test User
  // ============================================

  const userPassword = await argon2.hash('User@123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const testUser = await prisma.user.upsert({
    where: { email: 'test@youruniverse.ai' },
    update: {},
    create: {
      name: 'Test User',
      username: 'testuser',
      email: 'test@youruniverse.ai',
      password: userPassword,
      role: Role.user,
      isEmailVerified: true,
      subscriptionPlan: SubscriptionPlan.adventurer,
      tokensRemaining: 1000,
    },
  });

  console.log(`✅ Created test user: ${testUser.email}`);

  // ============================================
  // Create Sample Character
  // ============================================

  const character = await prisma.character.upsert({
    where: { slug: 'sample-character-001' },
    update: {},
    create: {
      userId: testUser.id,
      name: 'Sample Character',
      slug: 'sample-character-001',
      description: 'A sample character for testing purposes.',
      scenario: 'This is a friendly AI assistant character.',
      summary: 'Helpful, friendly, and knowledgeable.',
      rating: Rating.SFW,
      visibility: Visibility.private,
      tags: ['sample', 'test', 'assistant'],
      firstMessage: 'Hello! I\'m a sample character. How can I help you today?',
      alternateMessages: [
        'Hi there! Ready to chat?',
        'Greetings! What would you like to talk about?',
      ],
      exampleDialogues: [
        'User: How are you?\nCharacter: I\'m doing great, thank you for asking!',
      ],
    },
  });

  console.log(`✅ Created sample character: ${character.name}`);

  // ============================================
  // Create Sample Persona
  // ============================================

  const persona = await prisma.persona.upsert({
    where: { slug: 'sample-persona-001' },
    update: {},
    create: {
      userId: testUser.id,
      name: 'Sample Persona',
      slug: 'sample-persona-001',
      description: 'A sample persona for testing.',
      rating: Rating.SFW,
      visibility: Visibility.private,
      tags: ['sample', 'test'],
    },
  });

  console.log(`✅ Created sample persona: ${persona.name}`);

  // ============================================
  // Create Sample Lorebook
  // ============================================

  const lorebook = await prisma.lorebook.upsert({
    where: { slug: 'sample-lorebook-001' },
    update: {},
    create: {
      userId: testUser.id,
      name: 'Sample Lorebook',
      slug: 'sample-lorebook-001',
      description: 'A sample lorebook with world-building information.',
      rating: Rating.SFW,
      visibility: Visibility.private,
      tags: ['sample', 'test', 'worldbuilding'],
    },
  });

  // Create lorebook entries
  await prisma.lorebookEntry.createMany({
    data: [
      {
        lorebookId: lorebook.id,
        keyword: 'magic',
        context: 'Magic in this world is powered by ancient crystals found deep underground.',
        isEnabled: true,
        priority: 1,
      },
      {
        lorebookId: lorebook.id,
        keyword: 'kingdom',
        context: 'The Kingdom of Eldoria is the largest nation, ruled by a council of mages.',
        isEnabled: true,
        priority: 2,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created sample lorebook: ${lorebook.name}`);

  // ============================================
  // Create Sample Realm
  // ============================================

  const realm = await prisma.realm.upsert({
    where: { slug: 'sample-realm-001' },
    update: {},
    create: {
      userId: testUser.id,
      name: 'Sample Realm',
      slug: 'sample-realm-001',
      description: 'A sample realm for organizing characters.',
      rating: Rating.SFW,
      visibility: Visibility.private,
      tags: ['sample', 'test'],
    },
  });

  console.log(`✅ Created sample realm: ${realm.name}`);

  console.log('\n🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

