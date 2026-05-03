import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

loadEnv();
loadEnv({ path: "./.env", override: false });

const prisma = new PrismaClient();

async function main() {
  const password = "Admin123!";
  const passwordHash = await bcrypt.hash(password, 10);

  // Check if superadmin already exists
  const existing = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existing) {
    console.log("Superadmin already exists:", existing.fullName, existing.phoneNumber);
    await prisma.$disconnect();
    return;
  }

  // Create superadmin
  const superadmin = await prisma.user.create({
    data: {
      fullName: "Super Admin",
      phoneNumber: "+639000000001", // Unique test number
      passwordHash,
      role: Role.SUPER_ADMIN,
      isPhoneVerified: true,
      isVerified: true,
    },
  });

  console.log("Superadmin created successfully!");
  console.log("Phone:", superadmin.phoneNumber);
  console.log("Password:", password);
  console.log("Role:", superadmin.role);

  await prisma.$disconnect();
}

main().catch(console.error);