import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1) Admin kullanıcısı oluştur
  const adminPassword = await argon2.hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@studentcoach.com' },
    update: {},
    create: {
      email: 'admin@studentcoach.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED, // Admin direkt onaylı
      approvedAt: new Date(),
    },
  });
  console.log('✅ Admin created:', admin.email);

  // 2) Test Coach
  const coachPassword = await argon2.hash('Coach123!');
  const coach = await prisma.user.upsert({
    where: { email: 'coach@test.com' },
    update: {},
    create: {
      email: 'coach@test.com',
      passwordHash: coachPassword,
      role: UserRole.COACH,
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
      coachProfile: {
        create: {
          firstName: 'Ahmet',
          lastName: 'Yılmaz',
          phone: '05551234567',
          bio: 'Deneyimli eğitim koçu',
        },
      },
    },
  });
  console.log('✅ Coach created:', coach.email);

  // 3) Test Student
  const studentPassword = await argon2.hash('Student123!');
  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {},
    create: {
      email: 'student@test.com',
      passwordHash: studentPassword,
      role: UserRole.STUDENT,
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
      studentProfile: {
        create: {
          firstName: 'Ayşe',
          lastName: 'Demir',
          grade: '8. Sınıf',
          phone: '05559876543',
          parentPhone: '05551112233',
        },
      },
    },
  });
  console.log('✅ Student created:', student.email);

  // 4) Örnek kaynaklar
  const sources = [
    'Biltest',
    'Tudem',
    'Palme',
    'Tonguç',
    'Hız Yayınları',
    'Limit Yayınları',
  ];

  for (const sourceName of sources) {
    await prisma.source.upsert({
      where: { name: sourceName },
      update: {},
      create: { name: sourceName },
    });
  }
  console.log('✅ Sources created');

  // 5) Örnek dersler ve konular
  const mathSubject = await prisma.subject.upsert({
    where: { name: 'Matematik' },
    update: {},
    create: {
      name: 'Matematik',
      grade: '8. Sınıf',
      topics: {
        create: [
          { name: 'Üslü Sayılar' },
          { name: 'Kareköklü Sayılar' },
          { name: 'Üçgenler' },
          { name: 'Olasılık' },
        ],
      },
    },
  });

  const turkishSubject = await prisma.subject.upsert({
    where: { name: 'Türkçe' },
    update: {},
    create: {
      name: 'Türkçe',
      grade: '8. Sınıf',
      topics: {
        create: [
          { name: 'Yazım Kuralları' },
          { name: 'Noktalama İşaretleri' },
          { name: 'Cümle Çeşitleri' },
        ],
      },
    },
  });

  console.log('✅ Subjects and topics created');

  console.log('🎉 Seeding completed!');
  console.log('\n📧 Test credentials:');
  console.log('Admin: admin@studentcoach.com / Admin123!');
  console.log('Coach: coach@test.com / Coach123!');
  console.log('Student: student@test.com / Student123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
