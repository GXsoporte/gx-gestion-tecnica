import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientUsers = await prisma.clientUser.findMany({
    where: { email1: { not: null } },
    select: { id: true, name: true, email1: true, companyId: true },
  });

  console.log(`Encontrados ${clientUsers.length} ClientUsers con email1.`);

  let created = 0;
  let skipped = 0;

  for (const cu of clientUsers) {
    if (!cu.email1) continue;

    const existing = await prisma.user.findUnique({ where: { email: cu.email1 } });
    if (existing) {
      console.log(`  SKIP: ${cu.email1} ya existe como usuario.`);
      skipped++;
      continue;
    }

    await prisma.user.create({
      data: {
        name: cu.name,
        email: cu.email1,
        password: null,
        role: 'CLIENT',
        companyId: cu.companyId,
        isActive: true,
      },
    });
    console.log(`  CREADO: ${cu.email1} (${cu.name})`);
    created++;
  }

  console.log(`\nResultado: ${created} creados, ${skipped} omitidos, ${clientUsers.length} total.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
