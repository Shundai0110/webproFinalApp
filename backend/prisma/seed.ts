import { prisma } from "../src/lib/prisma.js";

const users = [
  {
    demoUserKey: "demo-user-suzuki",
    nickname: "A. Suzuki",
    faculty: "経済学部",
    department: "経済学科",
    year: 1,
    pointBalance: 5000,
  },
  {
    demoUserKey: "demo-user-tanaka",
    nickname: "S. Tanaka",
    faculty: "経済学部",
    department: "経済学科",
    year: 2,
    pointBalance: 3200,
  },
  {
    demoUserKey: "demo-user-sato",
    nickname: "M. Sato",
    faculty: "法学部",
    department: "法律学科",
    year: 2,
    pointBalance: 4100,
  },
  {
    demoUserKey: "demo-user-kato",
    nickname: "R. Kato",
    faculty: "理工学部",
    department: "学門 A",
    year: 1,
    pointBalance: 2800,
  },
  {
    demoUserKey: "demo-user-ito",
    nickname: "A. Ito",
    faculty: "商学部",
    department: "商学科",
    year: 2,
    pointBalance: 3600,
  },
] as const;

async function seedUser(data: (typeof users)[number]) {
  return prisma.user.upsert({
    where: { demoUserKey: data.demoUserKey },
    // 再seedで取引後の残高を巻き戻さないよう、既存ユーザーのポイントは更新しない。
    update: {
      nickname: data.nickname,
      faculty: data.faculty,
      department: data.department,
      year: data.year,
    },
    create: data,
  });
}

async function seedBook(input: {
  title: string;
  sellerId: number;
  price: number;
  description: string;
  status: "AVAILABLE" | "NEGOTIATING" | "SOLD";
  usedYear: number;
  usedLesson: string;
  usedFaculty: string;
  usedDepartment: string;
  targetYear: number;
  materialType: "REQUIRED" | "REFERENCE";
  category: string;
}) {
  const existing = await prisma.book.findFirst({
    where: { title: input.title, sellerId: input.sellerId },
  });
  if (existing) return existing;
  return prisma.book.create({ data: input });
}

async function main() {
  // seedは架空プロフィールだけで構成し、メール・電話・住所・認証・決済情報を持たせない。
  const [suzuki, tanaka, sato, kato, ito] = await Promise.all(users.map(seedUser));

  const [economics, civilLaw, linearAlgebra, marketing] = await Promise.all([
    seedBook({
      title: "経済学入門",
      sellerId: tanaka.id,
      price: 1200,
      description: "デモ用の架空出品。表紙に軽い擦れがある設定です。",
      status: "AVAILABLE",
      usedYear: 2025,
      usedLesson: "経済学 I",
      usedFaculty: "経済学部",
      usedDepartment: "経済学科",
      targetYear: 1,
      materialType: "REQUIRED",
      category: "専門科目",
    }),
    seedBook({
      title: "民法総則ケースブック",
      sellerId: sato.id,
      price: 1800,
      description: "デモ用の架空出品。重要箇所にマーカーがある設定です。",
      status: "AVAILABLE",
      usedYear: 2024,
      usedLesson: "民法総則",
      usedFaculty: "法学部",
      usedDepartment: "法律学科",
      targetYear: 2,
      materialType: "REQUIRED",
      category: "専門科目",
    }),
    seedBook({
      title: "線形代数スタンダード",
      sellerId: kato.id,
      price: 900,
      description: "デモ用の架空出品。購入相談中の状態確認に使用します。",
      status: "NEGOTIATING",
      usedYear: 2025,
      usedLesson: "線形代数",
      usedFaculty: "理工学部",
      usedDepartment: "学門 A",
      targetYear: 1,
      materialType: "REFERENCE",
      category: "専門科目",
    }),
    seedBook({
      title: "マーケティング基礎",
      sellerId: ito.id,
      price: 700,
      description: "デモ用の架空出品。取引成立済みの状態確認に使用します。",
      status: "SOLD",
      usedYear: 2023,
      usedLesson: "マーケティング論",
      usedFaculty: "商学部",
      usedDepartment: "商学科",
      targetYear: 2,
      materialType: "REQUIRED",
      category: "専門科目",
    }),
  ]);

  const pending = await prisma.transaction.findFirst({
    where: { bookId: linearAlgebra.id, buyerId: suzuki.id, sellerId: kato.id },
  });
  if (!pending) {
    await prisma.transaction.create({
      data: {
        bookId: linearAlgebra.id,
        buyerId: suzuki.id,
        sellerId: kato.id,
        offeredPrice: 900,
        buyerApproved: true,
        sellerApproved: false,
        status: "PENDING",
        message: "デモ用の購入相談です。実在する連絡先は含みません。",
      },
    });
  }

  let completed = await prisma.transaction.findFirst({
    where: { bookId: marketing.id, buyerId: suzuki.id, sellerId: ito.id },
  });
  if (!completed) {
    completed = await prisma.transaction.create({
      data: {
        bookId: marketing.id,
        buyerId: suzuki.id,
        sellerId: ito.id,
        offeredPrice: 700,
        buyerApproved: true,
        sellerApproved: true,
        status: "COMPLETED",
        completedAt: new Date("2026-07-01T03:00:00.000Z"),
        message: "デモ用の成立済み取引です。",
      },
    });
  }

  const notificationData = [
    {
      userId: suzuki.id,
      message: "マーケティング基礎 のデモ取引が完了しました",
    },
    {
      userId: ito.id,
      message: "マーケティング基礎 のデモ取引が完了しました",
    },
  ];
  for (const notification of notificationData) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: notification.userId,
        transactionId: completed.id,
        type: "TRANSACTION_COMPLETED",
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          ...notification,
          transactionId: completed.id,
          type: "TRANSACTION_COMPLETED",
        },
      });
    }
  }

  console.log(
    `Seed prepared: ${users.length} users, 4 books, 2 transactions (available book: ${economics.id}, ${civilLaw.id})`,
  );
}

main()
  .catch((error) => {
    console.error("Demo seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
