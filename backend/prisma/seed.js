var PrismaClient = require('@prisma/client').PrismaClient;
var bcrypt = require('bcryptjs');
var prisma = new PrismaClient();

async function main() {
  console.log('Seeding ContractorOS database...\n');

  // ── Company ────────────────────────────────────────
  var company = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
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
  console.log('  + Company: ' + company.name);

  // ── Owner user ─────────────────────────────────────
  var passwordHash = await bcrypt.hash('contractor123', 12);
  var existing = await prisma.user.findUnique({ where: { email: 'jason@jbconstruction.com' } });
  if (!existing) {
    await prisma.user.create({
      data: { companyId: company.id, name: 'Jason Braddock', email: 'jason@jbconstruction.com', passwordHash: passwordHash, phone: '(512)555-0199', role: 'Owner', status: 'active', lastLogin: new Date() }
    });
    console.log('  + Owner user (jason@jbconstruction.com / contractor123)');
  } else {
    await prisma.user.update({ where: { email: 'jason@jbconstruction.com' }, data: { passwordHash: passwordHash } });
    console.log('  ~ Owner password reset');
  }

  // ── Customers (7) ──────────────────────────────────
  var custs = [
    { companyId: company.id, name: 'Robert Thornton', phone: '(555)201-4400', email: 'bob.thornton@email.com', address: '4821 Maple Ridge Dr, Austin TX 78704', propertyType: 'Single Family', leadSource: 'Referral', notes: 'Decisive. Prefers text. HOA exterior restrictions.', tags: ['Repeat','VIP'], totalRevenue: 48000 },
    { companyId: company.id, name: 'Ana Rivera', phone: '(555)308-9921', email: 'ana.rivera@gmail.com', address: '2204 Sunflower Ln, Austin TX 78745', propertyType: 'Condo', leadSource: 'Google', notes: 'Budget-conscious. Needs itemized breakdowns.', tags: ['Repeat'], totalRevenue: 9750 },
    { companyId: company.id, name: 'Samuel Goldberg', phone: '(555)744-2200', email: 'sam@goldberg-props.com', address: '9102 Ridgecrest Blvd, Austin TX 78731', propertyType: 'Multi-family', leadSource: 'Referral', notes: 'Property investor. Net-30 terms.', tags: ['VIP','Investor'], totalRevenue: 0 },
    { companyId: company.id, name: 'Jin Park', phone: '(555)611-8833', email: 'jin.park@techcorp.io', address: '505 Barton Springs Rd #8, Austin TX', propertyType: 'Single Family', leadSource: 'Website', notes: 'ADU for rental income. Weekly updates.', tags: ['New'], totalRevenue: 20000 },
    { companyId: company.id, name: 'Lily Chen', phone: '(555)920-0047', email: 'lily.chen@outlook.com', address: '3310 Clarkson Ave, Austin TX 78723', propertyType: 'Single Family', leadSource: 'Angi', notes: 'Very happy - 5 referral cards requested.', tags: ['Repeat','Referral Source'], totalRevenue: 31000 },
    { companyId: company.id, name: 'Marcus Webb', phone: '(555)402-7765', email: 'm.webb@email.com', address: '1821 Pecos St, Austin TX 78702', propertyType: 'Single Family', leadSource: 'Referral', notes: 'Kitchen remodel. Granite + soft-close.', tags: ['Hot Lead'], totalRevenue: 0 },
    { companyId: company.id, name: 'Priya Nair', phone: '(555)835-1122', email: 'p.nair@email.com', address: '6710 Lamar Blvd, Austin TX 78757', propertyType: 'Single Family', leadSource: 'Referral', notes: 'Basement finish + wet bar. Pre-approved.', tags: ['Hot Lead'], totalRevenue: 0 },
  ];
  for (var c of custs) { await prisma.customer.upsert({ where: { id: custs.indexOf(c) + 1 }, update: {}, create: c }); }
  console.log('  + 7 customers');

  // ── Materials (25) ─────────────────────────────────
  var mats = [
    { name:'Framing Lumber 2x4x8',unit:'ea',category:'Lumber',supplier:'Home Depot',cost:4.82,markup:20,stock:180,reorderAt:50 },
    { name:'Framing Lumber 2x6x8',unit:'ea',category:'Lumber',supplier:'Home Depot',cost:6.40,markup:20,stock:85,reorderAt:40 },
    { name:'OSB Sheathing 4x8',unit:'sheet',category:'Lumber',supplier:'Home Depot',cost:22.50,markup:18,stock:60,reorderAt:20 },
    { name:'Drywall 4x8 half inch',unit:'sheet',category:'Drywall',supplier:'ABC Supply',cost:14.80,markup:22,stock:120,reorderAt:40 },
    { name:'Drywall 4x8 Fire Rated',unit:'sheet',category:'Drywall',supplier:'ABC Supply',cost:17.20,markup:22,stock:48,reorderAt:20 },
    { name:'LVP Flooring',unit:'SF',category:'Flooring',supplier:'Floor & Decor',cost:2.80,markup:35,stock:840,reorderAt:200 },
    { name:'Hardwood Flooring',unit:'SF',category:'Flooring',supplier:'Floor & Decor',cost:5.60,markup:35,stock:320,reorderAt:100 },
    { name:'Ceramic Floor Tile 12x12',unit:'SF',category:'Tile',supplier:'Floor & Decor',cost:2.10,markup:40,stock:600,reorderAt:150 },
    { name:'Porcelain Wall Tile 4x12',unit:'SF',category:'Tile',supplier:'Floor & Decor',cost:3.40,markup:40,stock:420,reorderAt:100 },
    { name:'Interior Paint 1 gal',unit:'gal',category:'Paint',supplier:'Sherwin-Williams',cost:32.00,markup:30,stock:28,reorderAt:10 },
    { name:'Exterior Paint 1 gal',unit:'gal',category:'Paint',supplier:'Sherwin-Williams',cost:38.00,markup:28,stock:18,reorderAt:8 },
    { name:'PVC Pipe half inch',unit:'LF',category:'Plumbing',supplier:'Ferguson',cost:0.68,markup:45,stock:320,reorderAt:80 },
    { name:'Kitchen Faucet Mid',unit:'ea',category:'Plumbing',supplier:'Ferguson',cost:145,markup:40,stock:4,reorderAt:2 },
    { name:'Toilet 1.28 GPF',unit:'ea',category:'Plumbing',supplier:'Ferguson',cost:188,markup:35,stock:3,reorderAt:2 },
    { name:'14/2 NM Wire',unit:'roll',category:'Electrical',supplier:'Graybar',cost:58,markup:30,stock:12,reorderAt:4 },
    { name:'20A GFCI Outlet',unit:'ea',category:'Electrical',supplier:'Graybar',cost:14,markup:50,stock:24,reorderAt:10 },
    { name:'LED Recessed 6 inch',unit:'ea',category:'Electrical',supplier:'Graybar',cost:18,markup:45,stock:36,reorderAt:12 },
    { name:'Composite Decking 1x6',unit:'LF',category:'Decking',supplier:'Home Depot',cost:4.20,markup:30,stock:600,reorderAt:150 },
    { name:'Concrete Mix 80lb',unit:'bag',category:'Concrete',supplier:'Home Depot',cost:6.80,markup:20,stock:80,reorderAt:30 },
    { name:'R-19 Batt Insulation',unit:'roll',category:'Insulation',supplier:'ABC Supply',cost:38,markup:25,stock:22,reorderAt:8 },
    { name:'Exterior Door 36 inch',unit:'ea',category:'Doors & Windows',supplier:'Home Depot',cost:320,markup:35,stock:3,reorderAt:1 },
    { name:'12/2 NM Wire',unit:'roll',category:'Electrical',supplier:'Graybar',cost:72,markup:30,stock:10,reorderAt:4 },
    { name:'R-13 Batt Insulation',unit:'roll',category:'Insulation',supplier:'ABC Supply',cost:28,markup:25,stock:30,reorderAt:10 },
    { name:'Cement Board 3x5',unit:'sheet',category:'Drywall',supplier:'ABC Supply',cost:16.40,markup:22,stock:35,reorderAt:12 },
    { name:'Deck Rail System',unit:'ea',category:'Decking',supplier:'Home Depot',cost:280,markup:30,stock:5,reorderAt:2 },
  ];
  for (var m of mats) { await prisma.material.upsert({ where: { id: mats.indexOf(m) + 1 }, update: {}, create: { companyId: company.id, ...m } }); }
  console.log('  + 25 materials');

  // ── Subcontractors (10) ────────────────────────────
  var subs = [
    { name:'Carlos Mendez',companyName:'Mendez Carpentry LLC',role:'Carpenter',hourlyWage:32,billableRate:75,status:'active',phone:'(555)301-2211',email:'carlos@mendezcarpentry.com' },
    { name:'Mike Torres',companyName:'Torres Electric Inc',role:'Electrician',hourlyWage:42,billableRate:95,status:'active',phone:'(555)301-3322',email:'mike@torreselectric.com' },
    { name:'Jake Sullivan',companyName:'Sullivan Plumbing Co',role:'Plumber',hourlyWage:40,billableRate:100,status:'active',phone:'(555)301-4433',email:'jake@sullivanplumbing.com' },
    { name:'Devon Harris',companyName:'Harris Tile & Stone',role:'Tile Setter',hourlyWage:36,billableRate:85,status:'active',phone:'(555)301-5544',email:'devon@harristile.com' },
    { name:'Luis Ramirez',companyName:'Ramirez Labor Services',role:'Laborer',hourlyWage:22,billableRate:55,status:'active',phone:'(555)301-6655',email:'luis@ramirezlabor.com' },
    { name:'Sean Wright',companyName:'Wright Painting Co',role:'Painter',hourlyWage:28,billableRate:65,status:'active',phone:'(555)301-7766',email:'sean@wrightpainting.com' },
    { name:'Tyrone Jackson',companyName:'Jackson Framing',role:'Framer',hourlyWage:34,billableRate:80,status:'active',phone:'(555)301-8877',email:'tyrone@jacksonframing.com' },
    { name:'Rosa Gutierrez',companyName:'RG HVAC Solutions',role:'HVAC Technician',hourlyWage:44,billableRate:105,status:'active',phone:'(555)301-9988',email:'rosa@rghvac.com' },
    { name:'David Kim',companyName:'Kim Roofing',role:'Roofer',hourlyWage:35,billableRate:82,status:'active',phone:'(555)301-1100',email:'david@kimroofing.com' },
    { name:'Anthony Russo',companyName:'Russo Concrete & Masonry',role:'Mason',hourlyWage:38,billableRate:90,status:'active',phone:'(555)301-2233',email:'anthony@russoconcrete.com' },
  ];
  for (var s of subs) { await prisma.subcontractor.upsert({ where: { id: subs.indexOf(s) + 1 }, update: {}, create: { companyId: company.id, ...s } }); }
  console.log('  + 10 subcontractors');

  // ── Labor Roles (10) ───────────────────────────────
  var roles = [
    { title:'Carpenter',baseRate:32,payrollPct:15.3,benefitsPct:12.5 },
    { title:'Electrician',baseRate:42,payrollPct:15.3,benefitsPct:14.0 },
    { title:'Plumber',baseRate:40,payrollPct:15.3,benefitsPct:14.0 },
    { title:'Tile Setter',baseRate:36,payrollPct:15.3,benefitsPct:11.0 },
    { title:'Laborer',baseRate:22,payrollPct:15.3,benefitsPct:8.0 },
    { title:'Painter',baseRate:28,payrollPct:15.3,benefitsPct:10.0 },
    { title:'Framer',baseRate:34,payrollPct:15.3,benefitsPct:12.0 },
    { title:'HVAC Technician',baseRate:44,payrollPct:15.3,benefitsPct:15.0 },
    { title:'Roofer',baseRate:35,payrollPct:15.3,benefitsPct:18.0 },
    { title:'Mason',baseRate:38,payrollPct:15.3,benefitsPct:13.0 },
  ];
  for (var r of roles) { await prisma.laborRole.upsert({ where: { id: roles.indexOf(r) + 1 }, update: {}, create: { companyId: company.id, ...r } }); }
  console.log('  + 10 labor roles');

  // ── Projects (5) ───────────────────────────────────
  var projects = [
    { id:'PRJ-2026-001',name:'Thornton Kitchen Full Remodel',companyId:company.id,custId:1,estId:'EST-2026-001',status:'active',contractValue:38000,budgetLabor:18000,budgetMaterials:14200,actualLabor:12400,actualMaterials:9800,start:'2026-02-01',end:'2026-03-28',phase:'Finish Work',progress:72,notes:'On track. Countertops install next week.' },
    { id:'PRJ-2026-002',name:'Rivera Bathroom Remodel',companyId:company.id,custId:2,estId:'EST-2026-002',status:'active',contractValue:19500,budgetLabor:9300,budgetMaterials:8100,actualLabor:7200,actualMaterials:6900,start:'2026-02-15',end:'2026-03-20',phase:'Tile & Fixtures',progress:85,notes:'Final punch list pending.' },
    { id:'PRJ-2026-003',name:'Goldberg Composite Deck',companyId:company.id,custId:3,estId:'EST-2026-003',status:'active',contractValue:14200,budgetLabor:5700,budgetMaterials:6200,actualLabor:3200,actualMaterials:4100,start:'2026-03-01',end:'2026-03-22',phase:'Framing',progress:40,notes:'Material delivery on 3/14.' },
    { id:'PRJ-2026-004',name:'Park Detached ADU',companyId:company.id,custId:4,estId:'EST-2026-004',status:'active',contractValue:88000,budgetLabor:42000,budgetMaterials:32000,actualLabor:9600,actualMaterials:12000,start:'2026-03-10',end:'2026-07-01',phase:'Foundation',progress:12,notes:'Foundation pour complete. Framing starts 3/16.' },
    { id:'PRJ-2026-005',name:'Chen Master Suite Addition',companyId:company.id,custId:5,estId:null,status:'complete',contractValue:31000,budgetLabor:16500,budgetMaterials:9500,actualLabor:16200,actualMaterials:9100,start:'2026-01-05',end:'2026-02-28',phase:'Complete',progress:100,notes:'Signed off 2/28.' },
  ];
  for (var p of projects) { await prisma.project.upsert({ where: { id: p.id }, update: {}, create: p }); }
  console.log('  + 5 projects');

  // ── Estimates (6) ──────────────────────────────────
  var estimates = [
    { id:'EST-2026-001',number:'EST-2026-001',companyId:company.id,custId:1,projId:'PRJ-2026-001',name:'Thornton Kitchen Full Remodel',discount:0,status:'approved',date:'2026-01-20',expiry:'2026-02-20',taxRate:6.5,notes:'Includes demo, cabinets, countertops, flooring.',subtotal:32800,materialSubtotal:14200,lineItems:[{id:1,description:'Demo & Hauling',qty:1,unitPrice:2400,isMaterial:false},{id:2,description:'Cabinet Package (14 units)',qty:1,unitPrice:6200,isMaterial:true},{id:3,description:'Granite Countertop 22 LF',qty:22,unitPrice:180,isMaterial:true},{id:4,description:'LVP Flooring 280 SF',qty:280,unitPrice:4.5,isMaterial:true},{id:5,description:'Labor Install',qty:80,unitPrice:75,isMaterial:false},{id:6,description:'Electrical Materials',qty:1,unitPrice:620,isMaterial:true},{id:7,description:'Plumbing Fixtures',qty:1,unitPrice:480,isMaterial:true}] },
    { id:'EST-2026-002',number:'EST-2026-002',companyId:company.id,custId:2,projId:'PRJ-2026-002',name:'Rivera Bathroom Remodel',discount:0,status:'approved',date:'2026-02-01',expiry:'2026-03-01',taxRate:6.5,notes:'Tile shower, new vanity, fixtures.',subtotal:17400,materialSubtotal:8100,lineItems:[{id:1,description:'Demo & Prep',qty:1,unitPrice:1800,isMaterial:false},{id:2,description:'Shower Tile 90 SF',qty:90,unitPrice:6,isMaterial:true},{id:3,description:'Floor Tile 85 SF',qty:85,unitPrice:4.5,isMaterial:true},{id:4,description:'Vanity & Mirror',qty:1,unitPrice:850,isMaterial:true},{id:5,description:'Plumbing Labor',qty:16,unitPrice:100,isMaterial:false},{id:6,description:'Tile Labor',qty:32,unitPrice:85,isMaterial:false},{id:7,description:'Cement Board & Drywall',qty:1,unitPrice:420,isMaterial:true}] },
    { id:'EST-2026-003',number:'EST-2026-003',companyId:company.id,custId:3,projId:'PRJ-2026-003',name:'Goldberg Composite Deck',discount:0,status:'approved',date:'2026-02-20',expiry:'2026-03-20',taxRate:6.5,notes:'280 SF composite deck with rail system.',subtotal:11900,materialSubtotal:6200,lineItems:[{id:1,description:'Deck Framing Labor',qty:24,unitPrice:80,isMaterial:false},{id:2,description:'Composite Decking 280 SF',qty:280,unitPrice:12,isMaterial:true},{id:3,description:'Framing Lumber & Hardware',qty:1,unitPrice:1840,isMaterial:true},{id:4,description:'Rail System',qty:1,unitPrice:1080,isMaterial:true}] },
    { id:'EST-2026-004',number:'EST-2026-004',companyId:company.id,custId:4,projId:'PRJ-2026-004',name:'Park Detached ADU',discount:0,status:'approved',date:'2026-03-01',expiry:'2026-04-01',taxRate:6.5,notes:'Full detached ADU 640 SF.',subtotal:74000,materialSubtotal:32000,lineItems:[{id:1,description:'Foundation & Concrete',qty:1,unitPrice:12000,isMaterial:true},{id:2,description:'Framing Labor',qty:120,unitPrice:80,isMaterial:false},{id:3,description:'Framing Materials',qty:1,unitPrice:8200,isMaterial:true},{id:4,description:'Electrical Rough + Finish',qty:1,unitPrice:6800,isMaterial:false},{id:5,description:'Plumbing Rough + Finish',qty:1,unitPrice:5200,isMaterial:false},{id:6,description:'Drywall Materials',qty:1,unitPrice:3200,isMaterial:true},{id:7,description:'Roofing Material',qty:1,unitPrice:4800,isMaterial:true}] },
    { id:'EST-2026-005',number:'EST-2026-005',companyId:company.id,custId:6,projId:null,name:'Webb Kitchen Remodel',discount:0,status:'draft',date:'2026-03-10',expiry:'2026-04-10',taxRate:6.5,notes:'Granite, soft-close cabinets.',subtotal:35500,materialSubtotal:15800,lineItems:[{id:1,description:'Demo Labor',qty:1,unitPrice:2200,isMaterial:false},{id:2,description:'Cabinet Package',qty:1,unitPrice:7400,isMaterial:true},{id:3,description:'Granite 28 LF',qty:28,unitPrice:185,isMaterial:true},{id:4,description:'Install Labor',qty:88,unitPrice:75,isMaterial:false},{id:5,description:'Plumbing Fixtures',qty:1,unitPrice:920,isMaterial:true}] },
    { id:'EST-2026-006',number:'EST-2026-006',companyId:company.id,custId:7,projId:null,name:'Nair Basement Finish + Wet Bar',discount:0,status:'sent',date:'2026-03-09',expiry:'2026-04-09',taxRate:6.5,notes:'Full basement finish, wet bar.',subtotal:46000,materialSubtotal:18000,lineItems:[{id:1,description:'Framing',qty:60,unitPrice:80,isMaterial:false},{id:2,description:'Drywall Materials',qty:1,unitPrice:3600,isMaterial:true},{id:3,description:'Flooring Materials',qty:1,unitPrice:4200,isMaterial:true},{id:4,description:'Electrical',qty:1,unitPrice:5800,isMaterial:false},{id:5,description:'Wet Bar Materials',qty:1,unitPrice:6200,isMaterial:true},{id:6,description:'Plumbing',qty:1,unitPrice:4800,isMaterial:false}] },
  ];
  for (var e of estimates) { await prisma.estimate.upsert({ where: { id: e.id }, update: {}, create: e }); }
  console.log('  + 6 estimates');

  // ── Invoices (5) ───────────────────────────────────
  var invoices = [
    { id:'INV-2026-001',number:'INV-2026-001',companyId:company.id,custId:1,projId:'PRJ-2026-001',estId:'EST-2026-001',status:'paid',issueDate:'2026-02-01',dueDate:'2026-03-01',discount:0,paidDate:'2026-02-28',taxRate:6.5,notes:'Deposit 50%.',lineItems:[{id:1,description:'Kitchen Remodel Labor & Mgmt',qty:1,unitPrice:14200,isMaterial:false},{id:2,description:'Cabinet Package',qty:1,unitPrice:6200,isMaterial:true},{id:3,description:'Granite Countertop 22 LF',qty:1,unitPrice:3960,isMaterial:true},{id:4,description:'LVP Flooring 280 SF',qty:1,unitPrice:1260,isMaterial:true}] },
    { id:'INV-2026-002',number:'INV-2026-002',companyId:company.id,custId:1,projId:'PRJ-2026-001',estId:'EST-2026-001',status:'sent',issueDate:'2026-03-10',dueDate:'2026-03-25',discount:0,paidDate:null,taxRate:6.5,notes:'Final balance due on completion.',lineItems:[{id:1,description:'Kitchen Remodel Final Labor',qty:1,unitPrice:9800,isMaterial:false},{id:2,description:'Backsplash Tile 32 SF',qty:1,unitPrice:640,isMaterial:true},{id:3,description:'Hardware & Accessories',qty:1,unitPrice:420,isMaterial:true}] },
    { id:'INV-2026-003',number:'INV-2026-003',companyId:company.id,custId:2,projId:'PRJ-2026-002',estId:'EST-2026-002',status:'overdue',issueDate:'2026-02-20',dueDate:'2026-03-05',discount:0,paidDate:null,taxRate:6.5,notes:'50% deposit overdue.',lineItems:[{id:1,description:'Bathroom Remodel Labor',qty:1,unitPrice:7200,isMaterial:false},{id:2,description:'Shower Tile 90 SF',qty:1,unitPrice:540,isMaterial:true},{id:3,description:'Vanity & Mirror',qty:1,unitPrice:850,isMaterial:true},{id:4,description:'Toilet & Fixtures',qty:1,unitPrice:620,isMaterial:true}] },
    { id:'INV-2026-004',number:'INV-2026-004',companyId:company.id,custId:3,projId:'PRJ-2026-003',estId:'EST-2026-003',status:'draft',issueDate:'2026-03-12',dueDate:'2026-04-12',discount:0,paidDate:null,taxRate:6.5,notes:'Deposit work begins 3/15.',lineItems:[{id:1,description:'Deck Construction Labor',qty:1,unitPrice:5400,isMaterial:false},{id:2,description:'Composite Decking 280 SF',qty:1,unitPrice:3360,isMaterial:true},{id:3,description:'Framing Lumber & Hardware',qty:1,unitPrice:1840,isMaterial:true}] },
    { id:'INV-2026-005',number:'INV-2026-005',companyId:company.id,custId:5,projId:'PRJ-2026-005',estId:null,status:'paid',issueDate:'2026-02-20',dueDate:'2026-02-28',discount:0,paidDate:'2026-02-27',taxRate:6.5,notes:'Final invoice project complete.',lineItems:[{id:1,description:'Master Suite Full Labor',qty:1,unitPrice:16200,isMaterial:false},{id:2,description:'Framing Materials',qty:1,unitPrice:3200,isMaterial:true},{id:3,description:'Drywall & Insulation',qty:1,unitPrice:1800,isMaterial:true},{id:4,description:'Flooring 320 SF',qty:1,unitPrice:896,isMaterial:true},{id:5,description:'Electrical Materials',qty:1,unitPrice:980,isMaterial:true}] },
  ];
  for (var inv of invoices) { await prisma.invoice.upsert({ where: { id: inv.id }, update: {}, create: inv }); }
  console.log('  + 5 invoices');

  // ── Change Orders (3) ──────────────────────────────
  var cos = [
    { id:'CO-2026-001',number:'CO-2026-001',companyId:company.id,projId:'PRJ-2026-001',custId:1,discount:0,status:'approved',date:'2026-02-18',description:'Add under-cabinet lighting package',reason:'Customer request',laborAmt:1200,materialAmt:680,totalAmt:1880,approvedBy:'Customer',approvedDate:'2026-02-19',notes:'LED strip + transformer + install labor.' },
    { id:'CO-2026-002',number:'CO-2026-002',companyId:company.id,projId:'PRJ-2026-002',custId:2,discount:0,status:'pending',date:'2026-03-08',description:'Upgrade shower valve to thermostatic',reason:'Code requirement',laborAmt:400,materialAmt:520,totalAmt:920,approvedBy:null,approvedDate:null,notes:'Inspector flagged existing valve.' },
    { id:'CO-2026-003',number:'CO-2026-003',companyId:company.id,projId:'PRJ-2026-004',custId:4,discount:0,status:'approved',date:'2026-03-12',description:'Add mini-split HVAC to ADU',reason:'Customer request',laborAmt:2800,materialAmt:3200,totalAmt:6000,approvedBy:'Customer',approvedDate:'2026-03-13',notes:'Mitsubishi 12K BTU wall mount.' },
  ];
  for (var co of cos) { await prisma.changeOrder.upsert({ where: { id: co.id }, update: {}, create: co }); }
  console.log('  + 3 change orders');

  // ── Expenses (8) ───────────────────────────────────
  var expenses = [
    { companyId:company.id,projId:'PRJ-2026-001',date:'2026-02-04',category:'Materials',vendor:'Home Depot',description:'Framing lumber & hardware',amount:1840,receipt:true,reimbursable:false,notes:'PO #4421' },
    { companyId:company.id,projId:'PRJ-2026-001',date:'2026-02-12',category:'Permits',vendor:'City of Austin',description:'Kitchen remodel permit',amount:385,receipt:true,reimbursable:false,notes:'Permit #KR-2026-0188' },
    { companyId:company.id,projId:'PRJ-2026-002',date:'2026-02-17',category:'Materials',vendor:'Floor & Decor',description:'Shower tile 90 SF + floor tile',amount:920,receipt:true,reimbursable:false,notes:'' },
    { companyId:company.id,projId:'PRJ-2026-003',date:'2026-03-03',category:'Equipment Rental',vendor:'Sunbelt Rentals',description:'Mini excavator 1-day',amount:450,receipt:true,reimbursable:true,notes:'Footing excavation' },
    { companyId:company.id,projId:'PRJ-2026-004',date:'2026-03-11',category:'Materials',vendor:'Home Depot',description:'Foundation concrete & rebar',amount:3200,receipt:true,reimbursable:false,notes:'12 yards ready-mix' },
    { companyId:company.id,projId:null,date:'2026-03-01',category:'Insurance',vendor:'State Farm',description:'Monthly GL premium',amount:680,receipt:true,reimbursable:false,notes:'Policy #GL-4492' },
    { companyId:company.id,projId:null,date:'2026-03-01',category:'Vehicle',vendor:'Shell',description:'Fuel - work trucks',amount:340,receipt:true,reimbursable:false,notes:'Fleet cards' },
    { companyId:company.id,projId:null,date:'2026-02-28',category:'Office',vendor:'QuickBooks',description:'Monthly subscription',amount:85,receipt:false,reimbursable:false,notes:'' },
  ];
  for (var ex of expenses) { await prisma.expense.upsert({ where: { id: expenses.indexOf(ex) + 1 }, update: {}, create: ex }); }
  console.log('  + 8 expenses');

  // ── Time Entries (15) ──────────────────────────────
  var hours = [
    { subId:1,projId:'PRJ-2026-001',date:'2026-02-05',hours:8,desc:'Cabinet demo & haul',approved:true },
    { subId:1,projId:'PRJ-2026-001',date:'2026-02-10',hours:8,desc:'Upper cabinet install',approved:true },
    { subId:1,projId:'PRJ-2026-001',date:'2026-02-11',hours:8,desc:'Lower cabinet install',approved:true },
    { subId:7,projId:'PRJ-2026-001',date:'2026-02-08',hours:8,desc:'Framing modifications',approved:true },
    { subId:4,projId:'PRJ-2026-001',date:'2026-02-18',hours:8,desc:'Backsplash tile set',approved:true },
    { subId:6,projId:'PRJ-2026-001',date:'2026-02-20',hours:7,desc:'Primer coat',approved:true },
    { subId:3,projId:'PRJ-2026-002',date:'2026-02-16',hours:8,desc:'Rough plumbing',approved:true },
    { subId:4,projId:'PRJ-2026-002',date:'2026-02-20',hours:8,desc:'Shower tile day 1',approved:true },
    { subId:4,projId:'PRJ-2026-002',date:'2026-02-21',hours:8,desc:'Shower tile day 2',approved:true },
    { subId:5,projId:'PRJ-2026-003',date:'2026-03-02',hours:8,desc:'Excavation & footings',approved:true },
    { subId:7,projId:'PRJ-2026-003',date:'2026-03-04',hours:8,desc:'Deck framing',approved:true },
    { subId:1,projId:'PRJ-2026-004',date:'2026-03-10',hours:8,desc:'Foundation prep',approved:true },
    { subId:7,projId:'PRJ-2026-004',date:'2026-03-11',hours:8,desc:'Wall framing day 1',approved:false },
    { subId:1,projId:'PRJ-2026-005',date:'2026-01-12',hours:8,desc:'Addition framing',approved:true },
    { subId:6,projId:'PRJ-2026-005',date:'2026-02-10',hours:8,desc:'Paint all surfaces',approved:true },
  ];
  for (var h of hours) { await prisma.timeEntry.upsert({ where: { id: hours.indexOf(h) + 1 }, update: {}, create: h }); }
  console.log('  + 15 time entries');

  console.log('\nSeed complete!\n');
  console.log('  Login: jason@jbconstruction.com / contractor123');
  console.log('  Records: 7 customers, 25 materials, 10 subs, 10 roles,');
  console.log('           5 projects, 6 estimates, 5 invoices,');
  console.log('           3 change orders, 8 expenses, 15 time entries\n');
}

main()
  .then(function() { return prisma.$disconnect(); })
  .catch(function(e) { console.error(e); process.exit(1); });
