import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDefaults() {
    try {
        const backgrounds = await prisma.background.findMany({
            where: { isGlobalDefault: true },
            select: {
                id: true,
                name: true,
                userId: true,
                isGlobalDefault: true,
                image: true,
                createdAt: true
            }
        });
        console.log('--- GLOBAL DEFAULT BACKGROUNDS ---');
        console.log(JSON.stringify(backgrounds, null, 2));
        console.log('--- END ---');
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

checkDefaults();
