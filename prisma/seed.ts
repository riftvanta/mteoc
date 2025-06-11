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

  // Create sample exchange office users and exchanges
  console.log('🏪 Creating sample exchange offices...')
  
  const exchangePassword = await bcrypt.hash('exchange123', 12)
  
  const exchanges = [
    {
      username: 'jordan_exchange',
      name: 'Jordan Exchange Co.',
      contactEmail: 'info@jordanexchange.jo',
      contactPhone: '+962796123456',
      balance: 15750.50,
      incomingCommissionType: 'PERCENTAGE' as const,
      incomingCommissionValue: 2.0,
      outgoingCommissionType: 'FIXED' as const,
      outgoingCommissionValue: 25.0,
      allowedIncomingBanks: ['Arab Bank', 'Jordan Ahli Bank', 'Zain Cash'],
      allowedOutgoingBanks: ['Arab Bank', 'Bank of Jordan']
    },
    {
      username: 'amman_currency',
      name: 'Amman Currency Exchange',
      contactEmail: 'contact@ammancurrency.jo',
      contactPhone: '+962777987654',
      balance: -2340.25,
      incomingCommissionType: 'FIXED' as const,
      incomingCommissionValue: 15.0,
      outgoingCommissionType: 'PERCENTAGE' as const,
      outgoingCommissionValue: 1.5,
      allowedIncomingBanks: ['Cairo Amman Bank', 'Jordan Islamic Bank'],
      allowedOutgoingBanks: ['Cairo Amman Bank', 'Orange Money']
    },
    {
      username: 'capital_exchange',
      name: 'Capital Exchange',
      contactEmail: 'admin@capitalex.jo',
      contactPhone: '+962798765432',
      balance: 8920.00,
      incomingCommissionType: 'PERCENTAGE' as const,
      incomingCommissionValue: 1.8,
      outgoingCommissionType: 'PERCENTAGE' as const,
      outgoingCommissionValue: 2.2,
      allowedIncomingBanks: ['Bank of Jordan', 'UWallet', 'DInarak'],
      allowedOutgoingBanks: ['Bank of Jordan', 'Arab Bank']
    }
  ]

  for (const exchange of exchanges) {
    const user = await prisma.user.upsert({
      where: { username: exchange.username },
      update: {},
      create: {
        username: exchange.username,
        password: exchangePassword,
        role: 'EXCHANGE',
      },
    })

    await prisma.exchange.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: exchange.name,
        contactEmail: exchange.contactEmail,
        contactPhone: exchange.contactPhone,
        balance: exchange.balance,
        incomingCommissionType: exchange.incomingCommissionType,
        incomingCommissionValue: exchange.incomingCommissionValue,
        outgoingCommissionType: exchange.outgoingCommissionType,
        outgoingCommissionValue: exchange.outgoingCommissionValue,
        allowedIncomingBanks: exchange.allowedIncomingBanks,
        allowedOutgoingBanks: exchange.allowedOutgoingBanks,
      },
    })
  }

  // Create sample orders
  console.log('📋 Creating sample orders...')
  
  const exchangeList = await prisma.exchange.findMany({ include: { user: true } })
  
  const sampleOrders = [
    {
      orderNumber: 'T25010045',
      type: 'OUTGOING' as const,
      status: 'PENDING_REVIEW' as const,
      amount: 1250.00,
      commission: 25.00,
      netAmount: 1275.00,
      recipientName: 'Ahmad Abdullah',
      bankName: 'Arab Bank',
      cliqBankAliasName: 'Ahmad.Bank',
      cliqMobileNumber: '0077123456',
      exchangeId: exchangeList[0]?.id,
      createdAt: new Date('2025-01-15T10:30:00Z'),
    },
    {
      orderNumber: 'T25010044',
      type: 'INCOMING' as const,
      status: 'PROCESSING' as const,
      amount: 890.50,
      commission: 17.81,
      netAmount: 872.69,
      senderName: 'Sarah Mohammed',
      bankName: 'Jordan Ahli Bank',
      paymentProofUrl: '/uploads/proof-123.jpg',
      exchangeId: exchangeList[1]?.id,
      createdAt: new Date('2025-01-15T09:45:00Z'),
      approvedAt: new Date('2025-01-15T10:00:00Z'),
    },
    {
      orderNumber: 'T25010043',
      type: 'OUTGOING' as const,
      status: 'COMPLETED' as const,
      amount: 2100.75,
      commission: 42.02,
      netAmount: 2142.77,
      recipientName: 'Mohammed Ali',
      bankName: 'Bank of Jordan',
      cliqBankAliasName: 'Mohammed.B',
      cliqMobileNumber: '0078987654',
      completionProofUrl: '/uploads/completion-456.jpg',
      exchangeId: exchangeList[2]?.id,
      createdAt: new Date('2025-01-15T08:20:00Z'),
      approvedAt: new Date('2025-01-15T08:35:00Z'),
      completedAt: new Date('2025-01-15T12:30:00Z'),
    },
    {
      orderNumber: 'T25010042',
      type: 'INCOMING' as const,
      status: 'SUBMITTED' as const,
      amount: 750.25,
      commission: 15.01,
      netAmount: 735.24,
      senderName: 'Layla Hassan',
      bankName: 'Zain Cash',
      paymentProofUrl: '/uploads/proof-789.jpg',
      exchangeId: exchangeList[0]?.id,
      createdAt: new Date('2025-01-15T07:15:00Z'),
    },
    {
      orderNumber: 'T25010041',
      type: 'OUTGOING' as const,
      status: 'REJECTED' as const,
      amount: 500.00,
      commission: 10.00,
      netAmount: 510.00,
      recipientName: 'Omar Khalil',
      rejectionReason: 'Invalid CliQ mobile number format',
      exchangeId: exchangeList[2]?.id,
      createdAt: new Date('2025-01-15T06:00:00Z'),
    }
  ]

  for (const order of sampleOrders) {
    if (order.exchangeId) {
      await prisma.order.upsert({
        where: { orderNumber: order.orderNumber },
        update: {},
        create: order,
      })
    }
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