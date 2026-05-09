import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash,
    },
  });
  console.log(`✅ User created: ${user.email}`);

  // Create customers
  const customersData = [
    { name: "Ahmad Khan", house: "House A-12", ratePerBottle: 50 },
    { name: "Ali Raza", house: "House B-5", ratePerBottle: 45 },
    { name: "Fatima Bibi", house: "House C-8", ratePerBottle: 55 },
    { name: "Hassan Sheikh", house: "House D-3", ratePerBottle: 40 },
    { name: "Zara Malik", house: "House E-7", ratePerBottle: 60 },
    { name: "Usman Tariq", house: "House F-1", ratePerBottle: 48 },
    { name: "Ayesha Noor", house: "House G-9", ratePerBottle: 52 },
    { name: "Bilal Ahmed", house: "House H-4", ratePerBottle: 42 },
    { name: "Sana Iqbal", house: "House I-6", ratePerBottle: 58 },
    { name: "Kamran Yousuf", house: "House J-2", ratePerBottle: 47 },
  ];

  const customers = [];
  for (const data of customersData) {
    const customer = await prisma.customer.upsert({
      where: { name_house: { name: data.name, house: data.house } },
      update: {},
      create: data,
    });
    customers.push(customer);
  }
  console.log(`✅ ${customers.length} customers created`);

  // Create sales for last 6 months
  const salesData = [];
  const now = new Date();

  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    for (const customer of customers) {
      // Random 1-4 sales per customer per month
      const numSales = Math.floor(Math.random() * 4) + 1;
      for (let s = 0; s < numSales; s++) {
        const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, Math.floor(Math.random() * 28) + 1);
        const quantity = Math.floor(Math.random() * 20) + 1;
        const totalAmount = quantity * customer.ratePerBottle;
        const amountPaid = Math.random() > 0.3 ? totalAmount : Math.floor(totalAmount * (Math.random() * 0.8 + 0.1));
        const remainingAmount = totalAmount - amountPaid;

        salesData.push({
          customerId: customer.id,
          date,
          quantity,
          ratePerBottle: customer.ratePerBottle,
          totalAmount,
          amountPaid,
          remainingAmount,
        });
      }
    }
  }

  // Clear existing sales and recreate
  await prisma.sale.deleteMany();
  await prisma.sale.createMany({ data: salesData });
  console.log(`✅ ${salesData.length} sales records created`);

  console.log("\n🎉 Seeding complete!");
  console.log("📧 Login with: admin@example.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
