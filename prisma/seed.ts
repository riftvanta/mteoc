import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  console.log('👤 Creating admin user...')
  const adminPassword = await bcrypt.hash('admin123', 12)
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Seed Jordanian Banks
  const banks = [
    { name: 'Central Bank of Jordan', code: 'CBJ' },
    { name: 'Arab Bank', code: 'ARBK' },
    { name: 'Bank of Jordan', code: 'BOJ' },
    { name: 'Jordan Ahli Bank', code: 'JAB' },
    { name: 'Jordan Commercial Bank', code: 'JCB' },
    { name: 'Cairo Amman Bank', code: 'CAB' },
    { name: 'Jordan Kuwait Bank', code: 'JKB' },
    { name: 'Jordan Islamic Bank', code: 'JIB' },
    { name: 'ABC Bank', code: 'ABC' },
    { name: 'Bank al Etihad', code: 'ETIHAD' },
    { name: 'Invest Bank', code: 'INVEST' },
    { name: 'Societe Generale de Banque', code: 'SGB' },
    { name: 'Standard Chartered Bank', code: 'SCB' },
    { name: 'BLOM Bank', code: 'BLOM' },
    { name: 'Union Bank', code: 'UNION' },
  ]

  console.log('📦 Creating banks...')
  for (const bank of banks) {
    await prisma.bank.upsert({
      where: { name: bank.name },
      update: {},
      create: bank,
    })
  }

  // Seed Digital Wallets (as mentioned in App-Features.md)
  const digitalWallets = [
    { name: 'Zain Cash', code: 'ZAIN_CASH' },
    { name: 'Orange Money', code: 'ORANGE_MONEY' },
    { name: 'UWallet', code: 'UWALLET' },
    { name: 'DInarak', code: 'DINARAK' },
  ]

  console.log('💳 Creating digital wallets...')
  for (const wallet of digitalWallets) {
    await prisma.digitalWallet.upsert({
      where: { name: wallet.name },
      update: {},
      create: wallet,
    })
  }

  // Seed System Configuration
  const systemConfigs = [
    { key: 'app_version', value: '1.0.0' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'max_file_size_mb', value: '5' },
    { key: 'jordanian_timezone', value: 'Asia/Amman' },
    { key: 'default_commission_rate', value: '2.5' },
    { key: 'max_daily_transfer_limit', value: '100000' },
  ]

  console.log('⚙️  Creating system configuration...')
  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 