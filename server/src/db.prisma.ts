import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from './generated/prisma/client';
import { DuplicateError, type Db, type DuplicateField } from './db';

const isUniqueViolation = (err: unknown) => (err as { code?: string } | null)?.code === 'P2002';

export function createPrismaDb(connectionString: string): Db & { disconnect(): Promise<void> } {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const findTaken: Db['findTaken'] = async (registerNumber, email) => {
    const rows = await prisma.application.findMany({
      where: { OR: [{ registerNumber }, { email }] },
      select: { registerNumber: true, email: true },
    });
    return {
      registerNumberTaken: rows.some((r) => r.registerNumber === registerNumber),
      emailTaken: rows.some((r) => r.email === email),
    };
  };

  return {
    findTaken,

    async findPhoto(id) {
      const photo = await prisma.photo.findUnique({ where: { id }, include: { application: { select: { id: true } } } });
      return photo ? { id: photo.id, url: photo.url, linked: photo.application !== null } : null;
    },

    async createPhoto(photo) {
      await prisma.photo.create({ data: photo });
    },

    async createApplication(data) {
      try {
        const { achievements, portfolioUrl, otherClubs, ...rest } = data;
        const row = await prisma.application.create({
          data: {
            ...rest,
            achievements: achievements as Prisma.InputJsonValue,
            portfolioUrl: portfolioUrl ?? null,
            otherClubs: otherClubs ?? null,
          },
          select: { id: true },
        });
        return row;
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Work out which constraint tripped without depending on driver specific error metadata.
        const taken = await findTaken(data.registerNumber, data.email);
        const field: DuplicateField = taken.registerNumberTaken ? 'registerNumber' : taken.emailTaken ? 'email' : 'photoId';
        throw new DuplicateError(field);
      }
    },

    async listApplications() {
      const rows = await prisma.application.findMany({ orderBy: { createdAt: 'asc' }, include: { photo: { select: { url: true } } } });
      return rows.map(({ photo, achievements, portfolioUrl, otherClubs, ...row }) => ({
        ...row,
        achievements: achievements as { title: string; description: string }[],
        portfolioUrl: portfolioUrl ?? undefined,
        otherClubs: otherClubs ?? undefined,
        photoUrl: photo.url,
      }));
    },

    disconnect: () => prisma.$disconnect(),
  };
}
