import { prisma } from './src/lib/prisma.js';

async function checkDefaults() {
    const backgrounds = await prisma.background.findMany({
        where: { isGlobalDefault: true }
    });
    console.log('Global Default Backgrounds:', JSON.stringify(backgrounds, null, 2));
    process.exit(0);
}

checkDefaults();
