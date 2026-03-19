const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ContractorOS database...\n');

  // ── Company ────────────────────────────────────────
  const company = await prisma.company.create({
    data: {
      name: 'JB Construction LLC', owner: 'Jason Braddock', phone: '(512) 555-0199',
      email: 'jason@jbconstruction.com', address: '2801 S Lamar Blvd, Suite 210, Austin TX 78704',
      website: 'www.jbconstruction.com', license: 'TX GC License #28841', ein: '74-3229901',
      defaultTaxRate: 6.5, paymentTerms: 30, laborBurdenDefault: 28.3,
      invoiceFooter: 'Thank you for your business. Payment due within terms shown above.',
      estimateFooter: 'This estimate is valid for 30 days. Prices subject to change after expiry.',
      smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecure: true,
      emailSubjectEstimate: 'Estimate #{number} from {company}',
      emailSubjectInvoice: 'Invoice #{number} from {company}',
      themeAccent: '#3b82f6', themeName: 'Ocean Blue',
    }
  });
  console.log('  ✓ Company created:', company.name);

  // ── Owner user ─────────────────────────────────────
  const passwordHash = await bcrypt.hash('contractor123', 12);
  await prisma.user.create({
    data: {
      companyId: company.id, name: 'Jason Braddock', email: 'jason@jbconstruction.com',
      passwordHash, phone: '(512)555-0199', role: 'Owner', status: 'active', lastLogin: new Date(),
    }
  });
  console.log('  ✓ Owner user created (email: jason@jbconstruction.com / password: contractor123)');

  // ── Sample customers ───────────────────────────────
  const custData = [
    { name: 'Robert Thornton', phone: '(555)201-4400', email: 'bob.thornton@email.com', address: '4821 Maple Ridge Dr, Austin TX 78704', propertyType: 'Single Family', leadSource: 'Referral', tags: ['Repeat', 'VIP'], totalRevenue: 48000 },
    { name: 'Ana Rivera', phone: '(555)308-9921', email: 'ana.rivera@gmail.com', address: '2204 Sunflower Ln, Austin TX 78745', propertyType: 'Condo', leadSource: 'Google', tags: ['Repeat'], totalRevenue: 9750 },
    { name: 'Samuel Goldberg', phone: '(555)744-2200', email: 'sam@goldberg-props.com', address: '9102 Ridgecrest Blvd, Austin TX 78731', propertyType: 'Multi-family', leadSource: 'Referral', tags: ['VIP', 'Investor'] },
  ];
  for (const c of custData) {
    await prisma.customer.create({ data: { companyId: company.id, ...c } });
  }
  console.log(`  ✓ ${custData.length} customers created`);

  // ── Labor roles (first 10) ─────────────────────────
  const roleData = [
    { title: 'Carpenter', baseRate: 32, payrollPct: 15.3, benefitsPct: 12.5 },
    { title: 'Electrician', baseRate: 42, payrollPct: 15.3, benefitsPct: 14.0 },
    { title: 'Plumber', baseRate: 40, payrollPct: 15.3, benefitsPct: 14.0 },
    { title: 'Tile Setter', baseRate: 36, payrollPct: 15.3, benefitsPct: 11.0 },
    { title: 'Laborer', baseRate: 22, payrollPct: 15.3, benefitsPct: 8.0 },
    { title: 'Painter', baseRate: 28, payrollPct: 15.3, benefitsPct: 10.0 },
    { title: 'Framer', baseRate: 34, payrollPct: 15.3, benefitsPct: 12.0 },
    { title: 'HVAC Technician', baseRate: 44, payrollPct: 15.3, benefitsPct: 15.0 },
    { title: 'Roofer', baseRate: 35, payrollPct: 15.3, benefitsPct: 18.0 },
    { title: 'Mason', baseRate: 38, payrollPct: 15.3, benefitsPct: 13.0 },
  ];
  for (const r of roleData) {
    await prisma.laborRole.create({ data: { companyId: company.id, ...r } });
  }
  console.log(`  ✓ ${roleData.length} labor roles created`);

  console.log('\n✅ Seed complete!\n');
  console.log('  Login credentials:');
  console.log('  Email:    jason@jbconstruction.com');
  console.log('  Password: contractor123\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
