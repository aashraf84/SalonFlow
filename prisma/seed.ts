import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // --- Branches ---
  const branch1 = await prisma.branch.upsert({
    where: { branchCode: 'GUL' },
    update: {},
    create: {
      name: 'Gulberg Branch',
      branchCode: 'GUL',
      address: '45 Main Blvd, Gulberg III, Lahore',
      phone: '+92-300-1110001',
      email: 'gulberg@salonflow.pk',
      openTime: '09:00',
      closeTime: '21:00',
    },
  })

  const branch2 = await prisma.branch.upsert({
    where: { branchCode: 'DHA' },
    update: {},
    create: {
      name: 'DHA Branch',
      branchCode: 'DHA',
      address: '12 Y Block, DHA Phase 3, Lahore',
      phone: '+92-300-1110002',
      email: 'dha@salonflow.pk',
      openTime: '09:00',
      closeTime: '22:00',
    },
  })

  const branch3 = await prisma.branch.upsert({
    where: { branchCode: 'MGL' },
    update: {},
    create: {
      name: 'Model Town Branch',
      branchCode: 'MGL',
      address: '78 Block B, Model Town, Lahore',
      phone: '+92-300-1110003',
      email: 'modeltown@salonflow.pk',
      openTime: '10:00',
      closeTime: '21:00',
    },
  })

  console.log(`✅ Created 3 branches`)

  // --- Staff ---
  await prisma.staff.upsert({
    where: { email: 'aisha@salonflow.pk' },
    update: {},
    create: {
      branchId: branch1.id,
      firstName: 'Aisha',
      lastName: 'Khan',
      email: 'aisha@salonflow.pk',
      phone: '+92-300-2220001',
      role: 'stylist',
      specialization: 'Hair Styling & Color',
      commissionRate: 0.15,
      status: 'active',
    },
  })

  await prisma.staff.upsert({
    where: { email: 'fatima@salonflow.pk' },
    update: {},
    create: {
      branchId: branch1.id,
      firstName: 'Fatima',
      lastName: 'Rizvi',
      email: 'fatima@salonflow.pk',
      phone: '+92-300-2220002',
      role: 'beautician',
      specialization: 'Bridal Makeup',
      commissionRate: 0.12,
      status: 'active',
    },
  })

  await prisma.staff.upsert({
    where: { email: 'zara@salonflow.pk' },
    update: {},
    create: {
      branchId: branch2.id,
      firstName: 'Zara',
      lastName: 'Ahmed',
      email: 'zara@salonflow.pk',
      phone: '+92-300-2220003',
      role: 'therapist',
      specialization: 'Skin & Spa Treatments',
      commissionRate: 0.10,
      status: 'active',
    },
  })

  console.log(`✅ Created 3 staff members`)

  // --- Customers (use explicit IDs for upsert) ---
  const customerData = [
    { id: 'cust-01', firstName: 'Sana', lastName: 'Malik', phone: '+92-321-5550001', email: 'sana@example.com', loyaltyTier: 'gold', loyaltyPoints: 2500, lifetimeValue: 85000 },
    { id: 'cust-02', firstName: 'Hina', lastName: 'Shah', phone: '+92-321-5550002', email: 'hina@example.com', loyaltyTier: 'platinum', loyaltyPoints: 5800, lifetimeValue: 195000 },
    { id: 'cust-03', firstName: 'Maha', lastName: 'Ali', phone: '+92-321-5550003', email: 'maha@example.com', loyaltyTier: 'silver', loyaltyPoints: 800, lifetimeValue: 25000 },
    { id: 'cust-04', firstName: 'Noor', lastName: 'Hassan', phone: '+92-321-5550004', email: 'noor@example.com', loyaltyTier: 'vip', loyaltyPoints: 12000, lifetimeValue: 320000 },
    { id: 'cust-05', firstName: 'Ayesha', lastName: 'Butt', phone: '+92-321-5550005', email: 'ayesha@example.com', loyaltyTier: 'gold', loyaltyPoints: 3200, lifetimeValue: 92000 },
    { id: 'cust-06', firstName: 'Rida', lastName: 'Nawaz', phone: '+92-321-5550006', email: 'rida@example.com', loyaltyTier: 'silver', loyaltyPoints: 450, lifetimeValue: 18000 },
    { id: 'cust-07', firstName: 'Kiran', lastName: 'Raza', phone: '+92-321-5550007', email: 'kiran@example.com', loyaltyTier: 'platinum', loyaltyPoints: 6100, lifetimeValue: 210000 },
    { id: 'cust-08', firstName: 'Saba', lastName: 'Iqbal', phone: '+92-321-5550008', email: 'saba@example.com', loyaltyTier: 'vip', loyaltyPoints: 9500, lifetimeValue: 280000 },
    { id: 'cust-09', firstName: 'Amna', lastName: 'Sheikh', phone: '+92-321-5550009', email: 'amna@example.com', loyaltyTier: 'silver', loyaltyPoints: 600, lifetimeValue: 22000 },
    { id: 'cust-10', firstName: 'Uzma', lastName: 'Tariq', phone: '+92-321-5550010', email: 'uzma@example.com', loyaltyTier: 'gold', loyaltyPoints: 2800, lifetimeValue: 88000 },
  ]

  const customers = []
  for (const cd of customerData) {
    const c = await prisma.customer.upsert({
      where: { id: cd.id },
      update: {},
      create: cd,
    })
    customers.push(c)
  }
  console.log(`✅ Created ${customers.length} customers`)

  // --- Service Categories ---
  const catHair = await prisma.serviceCategory.upsert({
    where: { id: 'cat-hair' },
    update: {},
    create: { id: 'cat-hair', name: 'Hair Services', description: 'Haircuts, styling, and treatments', sortOrder: 1 },
  })
  const catSkin = await prisma.serviceCategory.upsert({
    where: { id: 'cat-skin' },
    update: {},
    create: { id: 'cat-skin', name: 'Skin & Facial', description: 'Facials and skin treatments', sortOrder: 2 },
  })
  const catNails = await prisma.serviceCategory.upsert({
    where: { id: 'cat-nails' },
    update: {},
    create: { id: 'cat-nails', name: 'Nail Services', description: 'Manicure, pedicure, and nail art', sortOrder: 3 },
  })
  const catBridal = await prisma.serviceCategory.upsert({
    where: { id: 'cat-bridal' },
    update: {},
    create: { id: 'cat-bridal', name: 'Bridal Packages', description: 'Complete bridal makeup and styling', sortOrder: 4 },
  })
  const catSpa = await prisma.serviceCategory.upsert({
    where: { id: 'cat-spa' },
    update: {},
    create: { id: 'cat-spa', name: 'Spa & Wellness', description: 'Massage and relaxation treatments', sortOrder: 5 },
  })

  // --- Services ---
  const servicesData = [
    { id: 'svc-haircut-women', categoryId: catHair.id, name: 'Haircut — Women', duration: 45, price: 2000 },
    { id: 'svc-hair-color-full', categoryId: catHair.id, name: 'Hair Color — Full', duration: 120, price: 8000 },
    { id: 'svc-hair-color-roots', categoryId: catHair.id, name: 'Hair Color — Roots', duration: 60, price: 4500 },
    { id: 'svc-keratin', categoryId: catHair.id, name: 'Keratin Treatment', duration: 180, price: 15000 },
    { id: 'svc-blowout', categoryId: catHair.id, name: 'Blowout & Style', duration: 30, price: 1500 },
    { id: 'svc-extensions', categoryId: catHair.id, name: 'Hair Extensions', duration: 90, price: 12000 },
    { id: 'svc-classic-facial', categoryId: catSkin.id, name: 'Classic Facial', duration: 60, price: 3500 },
    { id: 'svc-hydrafacial', categoryId: catSkin.id, name: 'HydraFacial', duration: 75, price: 7000 },
    { id: 'svc-anti-aging', categoryId: catSkin.id, name: 'Anti-Aging Facial', duration: 90, price: 8500 },
    { id: 'svc-chemical-peel', categoryId: catSkin.id, name: 'Chemical Peel', duration: 45, price: 5500 },
    { id: 'svc-gel-manicure', categoryId: catNails.id, name: 'Gel Manicure', duration: 45, price: 2500 },
    { id: 'svc-gel-pedicure', categoryId: catNails.id, name: 'Gel Pedicure', duration: 60, price: 3000 },
    { id: 'svc-nail-art', categoryId: catNails.id, name: 'Nail Art — Full Set', duration: 60, price: 4000 },
    { id: 'svc-bridal-package', categoryId: catBridal.id, name: 'Bridal Makeup Package', duration: 180, price: 35000, isPackage: true },
    { id: 'svc-mehndi-look', categoryId: catBridal.id, name: 'Mehndi Look', duration: 90, price: 18000 },
    { id: 'svc-walima-look', categoryId: catBridal.id, name: 'Walima Look', duration: 120, price: 25000 },
    { id: 'svc-swedish-massage', categoryId: catSpa.id, name: 'Swedish Massage', duration: 60, price: 5000 },
    { id: 'svc-hot-stone', categoryId: catSpa.id, name: 'Hot Stone Therapy', duration: 75, price: 7000 },
    { id: 'svc-aromatherapy', categoryId: catSpa.id, name: 'Aromatherapy Session', duration: 60, price: 5500 },
  ]

  const services = []
  for (const sd of servicesData) {
    const s = await prisma.service.upsert({
      where: { id: sd.id },
      update: {},
      create: {
        ...sd,
        isActive: true,
        isPackage: sd.isPackage || false,
      },
    })
    services.push(s)
  }
  console.log(`✅ Created ${services.length} services`)

  // --- Membership Plans ---
  const planSilver = await prisma.membershipPlan.upsert({
    where: { id: 'plan-silver' },
    update: {},
    create: {
      id: 'plan-silver',
      name: 'Silver',
      description: 'Basic membership with essential benefits',
      price: 2000,
      duration: 3,
      discount: 5,
      freeServices: 1,
      priorityBooking: false,
      loyaltyBonus: 200,
    },
  })

  const planGold = await prisma.membershipPlan.upsert({
    where: { id: 'plan-gold' },
    update: {},
    create: {
      id: 'plan-gold',
      name: 'Gold',
      description: 'Premium membership with enhanced benefits and priority access',
      price: 5000,
      duration: 6,
      discount: 10,
      freeServices: 3,
      priorityBooking: true,
      loyaltyBonus: 500,
    },
  })

  const planPlatinum = await prisma.membershipPlan.upsert({
    where: { id: 'plan-platinum' },
    update: {},
    create: {
      id: 'plan-platinum',
      name: 'Platinum',
      description: 'Elite membership with maximum savings and VIP experience',
      price: 10000,
      duration: 12,
      discount: 15,
      freeServices: 6,
      priorityBooking: true,
      loyaltyBonus: 1000,
    },
  })

  const planVIP = await prisma.membershipPlan.upsert({
    where: { id: 'plan-vip' },
    update: {},
    create: {
      id: 'plan-vip',
      name: 'VIP',
      description: 'The ultimate salon experience with unlimited perks',
      price: 20000,
      duration: 12,
      discount: 20,
      freeServices: 12,
      priorityBooking: true,
      loyaltyBonus: 2000,
    },
  })

  console.log(`✅ Created 4 membership plans`)

  // --- Active Memberships ---
  const membershipData = [
    { id: 'mem-01', customerId: customers[0].id, planId: planGold.id, status: 'active', autoRenew: true },
    { id: 'mem-02', customerId: customers[1].id, planId: planPlatinum.id, status: 'active', autoRenew: true },
    { id: 'mem-03', customerId: customers[3].id, planId: planVIP.id, status: 'active', autoRenew: true },
    { id: 'mem-04', customerId: customers[4].id, planId: planGold.id, status: 'active', autoRenew: false },
    { id: 'mem-05', customerId: customers[6].id, planId: planPlatinum.id, status: 'active', autoRenew: true },
    { id: 'mem-06', customerId: customers[7].id, planId: planVIP.id, status: 'active', autoRenew: true },
    { id: 'mem-07', customerId: customers[9].id, planId: planSilver.id, status: 'active', autoRenew: true },
    { id: 'mem-08', customerId: customers[2].id, planId: planSilver.id, status: 'expired', autoRenew: false },
    { id: 'mem-09', customerId: customers[5].id, planId: planSilver.id, status: 'cancelled', autoRenew: false },
    { id: 'mem-10', customerId: customers[8].id, planId: planGold.id, status: 'paused', autoRenew: true },
  ]

  for (const md of membershipData) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 90))
    const plan = [planSilver, planGold, planPlatinum, planVIP].find((p) => p.id === md.planId)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + (plan?.duration || 3))

    await prisma.membership.upsert({
      where: { id: md.id },
      update: {},
      create: {
        id: md.id,
        customerId: md.customerId,
        planId: md.planId,
        startDate,
        endDate,
        status: md.status,
        autoRenew: md.autoRenew,
        paymentMethod: 'card',
      },
    })
  }
  console.log(`✅ Created ${membershipData.length} memberships`)

  // --- Loyalty Transactions ---
  const txTypes = ['earn', 'redeem', 'bonus', 'referral', 'birthday']
  const txDescriptions: Record<string, string[]> = {
    earn: ['Service visit reward', 'Hair color booking bonus', 'Facial treatment points', 'Bridal package reward'],
    redeem: ['Discount on haircut', 'Free facial redemption', 'Product discount claim'],
    bonus: ['Anniversary bonus', 'New member bonus', 'Seasonal promotion reward'],
    referral: ['Referred Sana Malik', 'Referred Hina Shah', 'Referred Maha Ali'],
    birthday: ['Birthday month bonus points', 'Birthday gift redemption'],
  }

  // Delete existing loyalty transactions first to avoid duplicates
  await prisma.loyaltyTransaction.deleteMany({})

  const loyaltyTxs = []
  for (let i = 0; i < 25; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const type = txTypes[Math.floor(Math.random() * txTypes.length)]
    const descs = txDescriptions[type] || ['Loyalty transaction']
    const desc = descs[Math.floor(Math.random() * descs.length)]
    const isPositive = type !== 'redeem'
    const points = isPositive
      ? Math.floor(Math.random() * 500) + 50
      : -(Math.floor(Math.random() * 300) + 50)

    const tx = await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type,
        points,
        description: desc,
      },
    })
    loyaltyTxs.push(tx)
  }
  console.log(`✅ Created ${loyaltyTxs.length} loyalty transactions`)

  // --- Product Categories ---
  const prodCatHaircare = await prisma.productCategory.upsert({
    where: { id: 'pcat-haircare' },
    update: {},
    create: { id: 'pcat-haircare', name: 'Haircare', description: 'Shampoos, conditioners, and treatments' },
  })
  const prodCatSkincare = await prisma.productCategory.upsert({
    where: { id: 'pcat-skincare' },
    update: {},
    create: { id: 'pcat-skincare', name: 'Skincare', description: 'Cleansers, moisturizers, and serums' },
  })
  const prodCatNailcare = await prisma.productCategory.upsert({
    where: { id: 'pcat-nailcare' },
    update: {},
    create: { id: 'pcat-nailcare', name: 'Nailcare', description: 'Nail polish, removers, and tools' },
  })
  const prodCatTools = await prisma.productCategory.upsert({
    where: { id: 'pcat-tools' },
    update: {},
    create: { id: 'pcat-tools', name: 'Tools & Equipment', description: 'Combs, brushes, and salon equipment' },
  })

  // --- Products ---
  const productsData = [
    { id: 'prod-01', categoryId: prodCatHaircare.id, name: 'Kerastase Elixir Ultime Oil', sku: 'KER-001', brand: 'Kerastase', costPrice: 2800, sellingPrice: 4500, reorderLevel: 5 },
    { id: 'prod-02', categoryId: prodCatHaircare.id, name: 'Olaplex No.3 Hair Perfector', sku: 'OLP-001', brand: 'Olaplex', costPrice: 3200, sellingPrice: 5200, reorderLevel: 8 },
    { id: 'prod-03', categoryId: prodCatHaircare.id, name: 'Moroccanoil Treatment', sku: 'MOR-001', brand: 'Moroccanoil', costPrice: 2200, sellingPrice: 3800, reorderLevel: 10 },
    { id: 'prod-04', categoryId: prodCatHaircare.id, name: 'L\'Oréal Professionnel Shampoo', sku: 'LOR-001', brand: 'L\'Oréal', costPrice: 1200, sellingPrice: 2200, reorderLevel: 15 },
    { id: 'prod-05', categoryId: prodCatSkincare.id, name: 'CeraVe Moisturizing Cream', sku: 'CER-001', brand: 'CeraVe', costPrice: 1500, sellingPrice: 2800, reorderLevel: 12 },
    { id: 'prod-06', categoryId: prodCatSkincare.id, name: 'The Ordinary Niacinamide 10%', sku: 'TOR-001', brand: 'The Ordinary', costPrice: 800, sellingPrice: 1800, reorderLevel: 20 },
    { id: 'prod-07', categoryId: prodCatSkincare.id, name: 'La Roche-Posay Sunscreen SPF50', sku: 'LRP-001', brand: 'La Roche-Posay', costPrice: 2200, sellingPrice: 3800, reorderLevel: 10 },
    { id: 'prod-08', categoryId: prodCatNailcare.id, name: 'OPI Nail Lacquer — Red', sku: 'OPI-001', brand: 'OPI', costPrice: 600, sellingPrice: 1200, reorderLevel: 25 },
    { id: 'prod-09', categoryId: prodCatNailcare.id, name: 'Gelish Gel Polish Kit', sku: 'GEL-001', brand: 'Gelish', costPrice: 2500, sellingPrice: 4500, reorderLevel: 8 },
    { id: 'prod-10', categoryId: prodCatTools.id, name: 'Tangle Teezer Brush', sku: 'TTE-001', brand: 'Tangle Teezer', costPrice: 900, sellingPrice: 1800, reorderLevel: 10 },
    { id: 'prod-11', categoryId: prodCatTools.id, name: 'Professional Hair Dryer 2200W', sku: 'DRY-001', brand: 'Dyson', costPrice: 35000, sellingPrice: 52000, reorderLevel: 2 },
  ]

  const products = []
  for (const pd of productsData) {
    const p = await prisma.product.upsert({
      where: { id: pd.id },
      update: {},
      create: pd,
    })
    products.push(p)
  }
  console.log(`✅ Created ${products.length} products`)

  // --- Inventory Items ---
  // Delete existing to avoid conflicts
  await prisma.inventoryItem.deleteMany({})

  for (const product of products) {
    for (const branch of [branch1, branch2, branch3]) {
      // Make some items low/out of stock for variety
      let qty: number
      if (product.sku === 'DRY-001') {
        qty = branch.branchCode === 'DHA' ? 0 : branch.branchCode === 'GUL' ? 1 : 2
      } else if (product.sku === 'OLP-001') {
        qty = branch.branchCode === 'MGL' ? 3 : branch.branchCode === 'DHA' ? 7 : 12
      } else if (product.sku === 'CER-001') {
        qty = branch.branchCode === 'GUL' ? 2 : 15
      } else if (product.sku === 'OPI-001') {
        qty = branch.branchCode === 'MGL' ? 8 : branch.branchCode === 'GUL' ? 20 : 30
      } else if (product.sku === 'LRP-001') {
        qty = branch.branchCode === 'DHA' ? 4 : 18
      } else {
        qty = Math.floor(Math.random() * 30) + 2
      }

      await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          branchId: branch.id,
          quantity: qty,
          lastRestocked: qty > 5 ? new Date() : null,
        },
      })
    }
  }
  console.log(`✅ Created inventory items for ${products.length} products across 3 branches`)

  // --- Invoices ---
  // Delete existing to avoid duplicates
  await prisma.invoiceItem.deleteMany({})
  await prisma.invoice.deleteMany({})

  const paymentMethods = ['cash', 'card', 'wallet']
  const invoiceItems = [
    { name: 'Haircut — Women', price: 2000, type: 'service' },
    { name: 'Classic Facial', price: 3500, type: 'service' },
    { name: 'Hair Color — Full', price: 8000, type: 'service' },
    { name: 'Gel Manicure', price: 2500, type: 'service' },
    { name: 'Kerastase Elixir Ultime Oil', price: 4500, type: 'product' },
    { name: 'Bridal Makeup Package', price: 35000, type: 'service' },
    { name: 'Swedish Massage', price: 5000, type: 'service' },
    { name: 'HydraFacial', price: 7000, type: 'service' },
    { name: 'Blowout & Style', price: 1500, type: 'service' },
  ]

  for (let i = 0; i < 15; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const branch = [branch1, branch2, branch3][Math.floor(Math.random() * 3)]
    const numItems = Math.floor(Math.random() * 3) + 1
    const selectedItems = []
    for (let j = 0; j < numItems; j++) {
      selectedItems.push(invoiceItems[Math.floor(Math.random() * invoiceItems.length)])
    }

    const subtotal = selectedItems.reduce((s, item) => s + item.price, 0)
    const tax = Math.round(subtotal * 0.05)
    const discount = Math.random() > 0.6 ? Math.round(subtotal * (Math.random() * 0.1 + 0.05)) : 0
    const totalAmount = subtotal + tax - discount
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30))
    createdAt.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60))

    await prisma.invoice.create({
      data: {
        branchId: branch.id,
        customerId: Math.random() > 0.2 ? customer.id : null,
        invoiceNumber: `INV-${String(i + 1).padStart(6, '0')}`,
        type: selectedItems.some((item) => item.type === 'product') ? 'combo' : 'service',
        subtotal,
        tax,
        discount,
        totalAmount,
        paymentMethod,
        paymentStatus: Math.random() > 0.1 ? 'paid' : 'pending',
        createdAt,
        items: {
          create: selectedItems.map((item) => ({
            itemType: item.type,
            name: item.name,
            quantity: 1,
            unitPrice: item.price,
            discount: 0,
            total: item.price,
          })),
        },
      },
    })
  }
  console.log(`✅ Created 15 invoices`)

  // --- Appointments ---
  await prisma.appointmentService.deleteMany({})
  await prisma.appointment.deleteMany({})

  const allStaff = await prisma.staff.findMany({ where: { status: 'active' } })
  const allServices = await prisma.service.findMany({ where: { isActive: true } })
  const allBranches = [branch1, branch2, branch3]

  const statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
  const types = ['booking', 'walk_in']
  const timeSlots = [
    { start: '09:00', end: '09:30' }, { start: '09:30', end: '10:00' },
    { start: '10:00', end: '10:45' }, { start: '10:30', end: '11:30' },
    { start: '11:00', end: '12:00' }, { start: '11:30', end: '12:30' },
    { start: '12:00', end: '12:45' }, { start: '13:00', end: '14:00' },
    { start: '14:00', end: '15:00' }, { start: '14:30', end: '15:30' },
    { start: '15:00', end: '16:00' }, { start: '15:30', end: '16:30' },
    { start: '16:00', end: '17:00' }, { start: '16:30', end: '17:30' },
    { start: '17:00', end: '18:00' }, { start: '17:30', end: '18:30' },
    { start: '18:00', end: '19:00' }, { start: '18:30', end: '19:30' },
    { start: '19:00', end: '20:00' },
  ]

  const appointmentNotes = [
    'First time customer, prefer gentle products',
    'Allergic to certain hair dyes',
    'Bridal trial session',
    'Regular customer, prefers morning slots',
    'Celebration package for birthday',
    'Pre-wash hair before appointment',
    'Bring reference photos',
    'Sensitive skin, patch test done',
    'VIP client, ensure premium products',
    'Follow-up appointment from last week',
    null, null, null, null, null,
  ]

  for (let i = 0; i < 30; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const branch = allBranches[Math.floor(Math.random() * allBranches.length)]
    const branchStaff = allStaff.filter(s => s.branchId === branch.id)
    const staff = branchStaff.length > 0 ? branchStaff[Math.floor(Math.random() * branchStaff.length)] : allStaff[Math.floor(Math.random() * allStaff.length)]
    const slot = timeSlots[Math.floor(Math.random() * timeSlots.length)]

    // Pick 1-3 services
    const numServices = Math.floor(Math.random() * 3) + 1
    const selectedServices = []
    for (let j = 0; j < numServices; j++) {
      const svc = allServices[Math.floor(Math.random() * allServices.length)]
      if (!selectedServices.find(s => s.id === svc.id)) {
        selectedServices.push(svc)
      }
    }

    const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0)

    // Generate dates: some today, some this week, some past
    const dateOffset = Math.random() > 0.4
      ? Math.floor(Math.random() * 7) // upcoming week
      : -Math.floor(Math.random() * 14) // past 2 weeks
    const appointmentDate = new Date()
    appointmentDate.setDate(appointmentDate.getDate() + dateOffset)
    appointmentDate.setHours(0, 0, 0, 0)

    // Status distribution: weight towards scheduled/confirmed for future, completed for past
    let status: string
    if (dateOffset < 0) {
      status = Math.random() > 0.15
        ? 'completed'
        : Math.random() > 0.5 ? 'cancelled' : 'no_show'
    } else if (dateOffset === 0) {
      status = Math.random() > 0.3 ? 'confirmed' : 'in_progress'
    } else {
      status = Math.random() > 0.4 ? 'scheduled' : 'confirmed'
    }

    const type = Math.random() > 0.25 ? 'booking' : 'walk_in'
    const note = appointmentNotes[Math.floor(Math.random() * appointmentNotes.length)]

    await prisma.appointment.create({
      data: {
        branchId: branch.id,
        customerId: customer.id,
        staffId: staff.id,
        date: appointmentDate,
        startTime: slot.start,
        endTime: slot.end,
        status,
        type,
        notes: note,
        totalAmount,
        services: {
          create: selectedServices.map(s => ({
            serviceId: s.id,
            staffId: staff.id,
            price: s.price,
            duration: s.duration,
          })),
        },
      },
    })
  }
  console.log(`✅ Created 30 appointments`)

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
