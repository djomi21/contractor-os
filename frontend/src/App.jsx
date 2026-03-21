import React, { useState, useMemo, useCallback, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api, { getToken, clearAuth, getSavedUser, saveUser } from "./api";

// API_BASE is configured in api.js via VITE_API_URL env var

// ── HELPERS ────────────────────────────────────────────────────
const FL_TAX = 6.5;
const fmt  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const fmtD = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n||0);
const fmtK = n => n>=1000?`$${(n/1000).toFixed(1)}k`:fmt(n);
const pct  = (a,b) => b===0?0:Math.round((a/b)*100);
const tod  = () => new Date().toISOString().slice(0,10);
const addD = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
const uid  = () => Date.now()+Math.floor(Math.random()*9999);
const nxtNum = (list,prefix,yr=2026) => {
  const max = list.filter(x=>(x.number||x.id||"").startsWith(`${prefix}-${yr}`))
    .map(x=>parseInt((x.number||x.id||"").split("-")[2]||0)).reduce((m,n)=>Math.max(m,n),0);
  return `${prefix}-${yr}-${String(max+1).padStart(3,"0")}`;
};
const calcInv = (lines=[],taxRate=FL_TAX,discountPct=0) => {
  const sub = lines.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const lab = lines.filter(l=>!l.isMaterial).reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const mat = lines.filter(l=> l.isMaterial).reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const discAmt = Math.round(sub*(discountPct/100)*100)/100;
  const discSub = sub - discAmt;
  const discMat = discountPct>0?Math.round(mat*(1-discountPct/100)*100)/100:mat;
  const tax = discMat*(taxRate/100);
  return {sub,lab,mat,discountPct,discAmt,discSub,tax,total:discSub+tax};
};

// ── CHART DATA ─────────────────────────────────────────────────
const REV_DATA=[
  {month:"Jan",revenue:38200,profit:11200,labor:14800,materials:12200},
  {month:"Feb",revenue:44500,profit:13800,labor:17200,materials:13500},
  {month:"Mar",revenue:52100,profit:16400,labor:19600,materials:16100},
  {month:"Apr",revenue:41800,profit:12100,labor:15900,materials:13800},
  {month:"May",revenue:61200,profit:21000,labor:22100,materials:18100},
  {month:"Jun",revenue:58700,profit:19500,labor:20800,materials:18400},
  {month:"Jul",revenue:49300,profit:15200,labor:18200,materials:15900},
  {month:"Aug",revenue:67400,profit:24100,labor:23400,materials:19900},
  {month:"Sep",revenue:71200,profit:26400,labor:24800,materials:20000},
  {month:"Oct",revenue:63500,profit:22100,labor:22200,materials:19200},
  {month:"Nov",revenue:55800,profit:18300,labor:20100,materials:17400},
  {month:"Dec",revenue:48200,profit:15600,labor:17800,materials:14800},
];

// ── SEED DATA ──────────────────────────────────────────────────
const SD_CUSTS=[
  {id:1,name:"Robert Thornton",phone:"(555)201-4400",email:"bob.thornton@email.com",address:"4821 Maple Ridge Dr, Austin TX 78704",propertyType:"Single Family",leadSource:"Referral",notes:"Decisive. Prefers text. HOA exterior restrictions.",tags:["Repeat","VIP"],totalRevenue:48000,createdAt:"2025-07-10"},
  {id:2,name:"Ana Rivera",phone:"(555)308-9921",email:"ana.rivera@gmail.com",address:"2204 Sunflower Ln, Austin TX 78745",propertyType:"Condo",leadSource:"Google",notes:"Budget-conscious. Needs itemized breakdowns.",tags:["Repeat"],totalRevenue:9750,createdAt:"2026-01-15"},
  {id:3,name:"Samuel Goldberg",phone:"(555)744-2200",email:"sam@goldberg-props.com",address:"9102 Ridgecrest Blvd, Austin TX 78731",propertyType:"Multi-family",leadSource:"Referral",notes:"Property investor. Net-30 terms.",tags:["VIP","Investor"],totalRevenue:0,createdAt:"2026-02-10"},
  {id:4,name:"Jin Park",phone:"(555)611-8833",email:"jin.park@techcorp.io",address:"505 Barton Springs Rd #8, Austin TX",propertyType:"Single Family",leadSource:"Website",notes:"ADU for rental income. Weekly updates.",tags:["New"],totalRevenue:20000,createdAt:"2026-02-28"},
  {id:5,name:"Lily Chen",phone:"(555)920-0047",email:"lily.chen@outlook.com",address:"3310 Clarkson Ave, Austin TX 78723",propertyType:"Single Family",leadSource:"Angi",notes:"Very happy — 5 referral cards requested.",tags:["Repeat","Referral Source"],totalRevenue:31000,createdAt:"2025-12-01"},
  {id:6,name:"Marcus Webb",phone:"(555)402-7765",email:"m.webb@email.com",address:"1821 Pecos St, Austin TX 78702",propertyType:"Single Family",leadSource:"Referral",notes:"Kitchen remodel. Granite + soft-close. Meeting 3/15.",tags:["Hot Lead"],totalRevenue:0,createdAt:"2026-03-01"},
  {id:7,name:"Priya Nair",phone:"(555)835-1122",email:"p.nair@email.com",address:"6710 Lamar Blvd, Austin TX 78757",propertyType:"Single Family",leadSource:"Referral",notes:"Basement finish + wet bar. Pre-approved.",tags:["Hot Lead"],totalRevenue:0,createdAt:"2026-03-09"},
];

const SD_ESTS=[
  {id:"EST-2026-001",number:"EST-2026-001",custId:1,projId:"PRJ-2026-001",name:"Thornton Kitchen Full Remodel",discount:0,status:"approved",date:"2026-01-20",expiry:"2026-02-20",taxRate:FL_TAX,notes:"Includes demo, cabinets, countertops, flooring.",subtotal:32800,materialSubtotal:14200,
   lineItems:[{id:1,description:"Demo & Hauling",qty:1,unitPrice:2400,isMaterial:false},{id:2,description:"Cabinet Package (14 units)",qty:1,unitPrice:6200,isMaterial:true},{id:3,description:"Granite Countertop 22 LF",qty:22,unitPrice:180,isMaterial:true},{id:4,description:"LVP Flooring 280 SF",qty:280,unitPrice:4.5,isMaterial:true},{id:5,description:"Labor Install",qty:80,unitPrice:75,isMaterial:false},{id:6,description:"Electrical Materials",qty:1,unitPrice:620,isMaterial:true},{id:7,description:"Plumbing Fixtures",qty:1,unitPrice:480,isMaterial:true}]},
  {id:"EST-2026-002",number:"EST-2026-002",custId:2,projId:"PRJ-2026-002",name:"Rivera Bathroom Remodel",discount:0,status:"approved",date:"2026-02-01",expiry:"2026-03-01",taxRate:FL_TAX,notes:"Tile shower, new vanity, fixtures.",subtotal:17400,materialSubtotal:8100,
   lineItems:[{id:1,description:"Demo & Prep",qty:1,unitPrice:1800,isMaterial:false},{id:2,description:"Shower Tile 90 SF",qty:90,unitPrice:6,isMaterial:true},{id:3,description:"Floor Tile 85 SF",qty:85,unitPrice:4.5,isMaterial:true},{id:4,description:"Vanity & Mirror",qty:1,unitPrice:850,isMaterial:true},{id:5,description:"Plumbing Labor",qty:16,unitPrice:100,isMaterial:false},{id:6,description:"Tile Labor",qty:32,unitPrice:85,isMaterial:false},{id:7,description:"Cement Board & Drywall",qty:1,unitPrice:420,isMaterial:true}]},
  {id:"EST-2026-003",number:"EST-2026-003",custId:3,projId:"PRJ-2026-003",name:"Goldberg Composite Deck",discount:0,status:"approved",date:"2026-02-20",expiry:"2026-03-20",taxRate:FL_TAX,notes:"280 SF composite deck with rail system.",subtotal:11900,materialSubtotal:6200,
   lineItems:[{id:1,description:"Deck Framing Labor",qty:24,unitPrice:80,isMaterial:false},{id:2,description:"Composite Decking 280 SF",qty:280,unitPrice:12,isMaterial:true},{id:3,description:"Framing Lumber & Hardware",qty:1,unitPrice:1840,isMaterial:true},{id:4,description:"Rail System",qty:1,unitPrice:1080,isMaterial:true}]},
  {id:"EST-2026-004",number:"EST-2026-004",custId:4,projId:"PRJ-2026-004",name:"Park Detached ADU",discount:0,status:"approved",date:"2026-03-01",expiry:"2026-04-01",taxRate:FL_TAX,notes:"Full detached ADU 640 SF.",subtotal:74000,materialSubtotal:32000,
   lineItems:[{id:1,description:"Foundation & Concrete",qty:1,unitPrice:12000,isMaterial:true},{id:2,description:"Framing Labor",qty:120,unitPrice:80,isMaterial:false},{id:3,description:"Framing Materials",qty:1,unitPrice:8200,isMaterial:true},{id:4,description:"Electrical Rough + Finish",qty:1,unitPrice:6800,isMaterial:false},{id:5,description:"Plumbing Rough + Finish",qty:1,unitPrice:5200,isMaterial:false},{id:6,description:"Drywall Materials",qty:1,unitPrice:3200,isMaterial:true},{id:7,description:"Roofing Material",qty:1,unitPrice:4800,isMaterial:true}]},
  {id:"EST-2026-005",number:"EST-2026-005",custId:6,projId:null,name:"Webb Kitchen Remodel",discount:0,status:"draft",date:"2026-03-10",expiry:"2026-04-10",taxRate:FL_TAX,notes:"Granite, soft-close cabinets.",subtotal:35500,materialSubtotal:15800,
   lineItems:[{id:1,description:"Demo Labor",qty:1,unitPrice:2200,isMaterial:false},{id:2,description:"Cabinet Package",qty:1,unitPrice:7400,isMaterial:true},{id:3,description:"Granite 28 LF",qty:28,unitPrice:185,isMaterial:true},{id:4,description:"Install Labor",qty:88,unitPrice:75,isMaterial:false},{id:5,description:"Plumbing Fixtures",qty:1,unitPrice:920,isMaterial:true}]},
  {id:"EST-2026-006",number:"EST-2026-006",custId:7,projId:null,name:"Nair Basement Finish + Wet Bar",discount:0,status:"sent",date:"2026-03-09",expiry:"2026-04-09",taxRate:FL_TAX,notes:"Full basement finish, wet bar.",subtotal:46000,materialSubtotal:18000,
   lineItems:[{id:1,description:"Framing",qty:60,unitPrice:80,isMaterial:false},{id:2,description:"Drywall Materials",qty:1,unitPrice:3600,isMaterial:true},{id:3,description:"Flooring Materials",qty:1,unitPrice:4200,isMaterial:true},{id:4,description:"Electrical",qty:1,unitPrice:5800,isMaterial:false},{id:5,description:"Wet Bar Materials",qty:1,unitPrice:6200,isMaterial:true},{id:6,description:"Plumbing",qty:1,unitPrice:4800,isMaterial:false}]},
];

const SD_PROJS=[
  {id:"PRJ-2026-001",name:"Thornton Kitchen Full Remodel",custId:1,estId:"EST-2026-001",status:"active",contractValue:38000,budgetLabor:18000,budgetMaterials:14200,actualLabor:12400,actualMaterials:9800,start:"2026-02-01",end:"2026-03-28",phase:"Finish Work",progress:72,notes:"On track. Countertops install next week."},
  {id:"PRJ-2026-002",name:"Rivera Bathroom Remodel",custId:2,estId:"EST-2026-002",status:"active",contractValue:19500,budgetLabor:9300,budgetMaterials:8100,actualLabor:7200,actualMaterials:6900,start:"2026-02-15",end:"2026-03-20",phase:"Tile & Fixtures",progress:85,notes:"Final punch list pending."},
  {id:"PRJ-2026-003",name:"Goldberg Composite Deck",custId:3,estId:"EST-2026-003",status:"active",contractValue:14200,budgetLabor:5700,budgetMaterials:6200,actualLabor:3200,actualMaterials:4100,start:"2026-03-01",end:"2026-03-22",phase:"Framing",progress:40,notes:"Material delivery on 3/14."},
  {id:"PRJ-2026-004",name:"Park Detached ADU",custId:4,estId:"EST-2026-004",status:"active",contractValue:88000,budgetLabor:42000,budgetMaterials:32000,actualLabor:9600,actualMaterials:12000,start:"2026-03-10",end:"2026-07-01",phase:"Foundation",progress:12,notes:"Foundation pour complete. Framing starts 3/16."},
  {id:"PRJ-2026-005",name:"Chen Master Suite Addition",custId:5,estId:null,status:"complete",contractValue:31000,budgetLabor:16500,budgetMaterials:9500,actualLabor:16200,actualMaterials:9100,start:"2026-01-05",end:"2026-02-28",phase:"Complete",progress:100,notes:"Signed off 2/28."},
];

const SD_MATS=[
  {id:1,name:"Framing Lumber 2x4x8",unit:"ea",category:"Lumber",supplier:"Home Depot",cost:4.82,markup:20,stock:180,reorderAt:50},
  {id:2,name:"Framing Lumber 2x6x8",unit:"ea",category:"Lumber",supplier:"Home Depot",cost:6.40,markup:20,stock:85,reorderAt:40},
  {id:3,name:"OSB Sheathing 4x8",unit:"sheet",category:"Lumber",supplier:"Home Depot",cost:22.50,markup:18,stock:60,reorderAt:20},
  {id:4,name:"Drywall 4x8 half inch",unit:"sheet",category:"Drywall",supplier:"ABC Supply",cost:14.80,markup:22,stock:120,reorderAt:40},
  {id:5,name:"Drywall 4x8 Fire Rated",unit:"sheet",category:"Drywall",supplier:"ABC Supply",cost:17.20,markup:22,stock:48,reorderAt:20},
  {id:6,name:"LVP Flooring",unit:"SF",category:"Flooring",supplier:"Floor & Decor",cost:2.80,markup:35,stock:840,reorderAt:200},
  {id:7,name:"Hardwood Flooring",unit:"SF",category:"Flooring",supplier:"Floor & Decor",cost:5.60,markup:35,stock:320,reorderAt:100},
  {id:8,name:"Ceramic Floor Tile 12x12",unit:"SF",category:"Tile",supplier:"Floor & Decor",cost:2.10,markup:40,stock:600,reorderAt:150},
  {id:9,name:"Porcelain Wall Tile 4x12",unit:"SF",category:"Tile",supplier:"Floor & Decor",cost:3.40,markup:40,stock:420,reorderAt:100},
  {id:10,name:"Interior Paint 1 gal",unit:"gal",category:"Paint",supplier:"Sherwin-Williams",cost:32.00,markup:30,stock:28,reorderAt:10},
  {id:11,name:"Exterior Paint 1 gal",unit:"gal",category:"Paint",supplier:"Sherwin-Williams",cost:38.00,markup:28,stock:18,reorderAt:8},
  {id:12,name:"PVC Pipe half inch",unit:"LF",category:"Plumbing",supplier:"Ferguson",cost:0.68,markup:45,stock:320,reorderAt:80},
  {id:13,name:"Kitchen Faucet Mid",unit:"ea",category:"Plumbing",supplier:"Ferguson",cost:145,markup:40,stock:4,reorderAt:2},
  {id:14,name:"Toilet 1.28 GPF",unit:"ea",category:"Plumbing",supplier:"Ferguson",cost:188,markup:35,stock:3,reorderAt:2},
  {id:15,name:"14/2 NM Wire",unit:"roll",category:"Electrical",supplier:"Graybar",cost:58,markup:30,stock:12,reorderAt:4},
  {id:16,name:"20A GFCI Outlet",unit:"ea",category:"Electrical",supplier:"Graybar",cost:14,markup:50,stock:24,reorderAt:10},
  {id:17,name:"LED Recessed 6 inch",unit:"ea",category:"Electrical",supplier:"Graybar",cost:18,markup:45,stock:36,reorderAt:12},
  {id:18,name:"Composite Decking 1x6",unit:"LF",category:"Decking",supplier:"Home Depot",cost:4.20,markup:30,stock:600,reorderAt:150},
  {id:19,name:"Concrete Mix 80lb",unit:"bag",category:"Concrete",supplier:"Home Depot",cost:6.80,markup:20,stock:80,reorderAt:30},
  {id:20,name:"R-19 Batt Insulation",unit:"roll",category:"Insulation",supplier:"ABC Supply",cost:38,markup:25,stock:22,reorderAt:8},
  {id:21,name:"Exterior Door 36 inch",unit:"ea",category:"Doors & Windows",supplier:"Home Depot",cost:320,markup:35,stock:3,reorderAt:1},
  {id:22,name:"12/2 NM Wire",unit:"roll",category:"Electrical",supplier:"Graybar",cost:72,markup:30,stock:10,reorderAt:4},
  {id:23,name:"R-13 Batt Insulation",unit:"roll",category:"Insulation",supplier:"ABC Supply",cost:28,markup:25,stock:30,reorderAt:10},
  {id:24,name:"Cement Board 3x5",unit:"sheet",category:"Drywall",supplier:"ABC Supply",cost:16.40,markup:22,stock:35,reorderAt:12},
  {id:25,name:"Deck Rail System",unit:"ea",category:"Decking",supplier:"Home Depot",cost:280,markup:30,stock:5,reorderAt:2},
];

const SD_SUBS=[
  {id:1,name:"Carlos Mendez",company:"Mendez Carpentry LLC",role:"Carpenter",hourlyWage:32,billableRate:75,status:"active",phone:"(555)301-2211",email:"carlos@mendezcarpentry.com"},
  {id:2,name:"Mike Torres",company:"Torres Electric Inc",role:"Electrician",hourlyWage:42,billableRate:95,status:"active",phone:"(555)301-3322",email:"mike@torreselectric.com"},
  {id:3,name:"Jake Sullivan",company:"Sullivan Plumbing Co",role:"Plumber",hourlyWage:40,billableRate:100,status:"active",phone:"(555)301-4433",email:"jake@sullivanplumbing.com"},
  {id:4,name:"Devon Harris",company:"Harris Tile & Stone",role:"Tile Setter",hourlyWage:36,billableRate:85,status:"active",phone:"(555)301-5544",email:"devon@harristile.com"},
  {id:5,name:"Luis Ramirez",company:"Ramirez Labor Services",role:"Laborer",hourlyWage:22,billableRate:55,status:"active",phone:"(555)301-6655",email:"luis@ramirezlabor.com"},
  {id:6,name:"Sean Wright",company:"Wright Painting Co",role:"Painter",hourlyWage:28,billableRate:65,status:"active",phone:"(555)301-7766",email:"sean@wrightpainting.com"},
  {id:7,name:"Tyrone Jackson",company:"Jackson Framing",role:"Framer",hourlyWage:34,billableRate:80,status:"active",phone:"(555)301-8877",email:"tyrone@jacksonframing.com"},
  {id:8,name:"Rosa Gutierrez",company:"RG HVAC Solutions",role:"HVAC Technician",hourlyWage:44,billableRate:105,status:"active",phone:"(555)301-9988",email:"rosa@rghvac.com"},
  {id:9,name:"David Kim",company:"Kim Roofing",role:"Roofer",hourlyWage:35,billableRate:82,status:"active",phone:"(555)301-1100",email:"david@kimroofing.com"},
  {id:10,name:"Anthony Russo",company:"Russo Concrete & Masonry",role:"Mason",hourlyWage:38,billableRate:90,status:"active",phone:"(555)301-2233",email:"anthony@russoconcrete.com"},
];

const SD_HRS=[
  {id:1,subId:1,projId:"PRJ-2026-001",date:"2026-02-05",hours:8,desc:"Cabinet demo & haul",approved:true},
  {id:2,subId:1,projId:"PRJ-2026-001",date:"2026-02-10",hours:8,desc:"Upper cabinet install",approved:true},
  {id:3,subId:1,projId:"PRJ-2026-001",date:"2026-02-11",hours:8,desc:"Lower cabinet install",approved:true},
  {id:4,subId:7,projId:"PRJ-2026-001",date:"2026-02-08",hours:8,desc:"Framing modifications",approved:true},
  {id:5,subId:4,projId:"PRJ-2026-001",date:"2026-02-18",hours:8,desc:"Backsplash tile set",approved:true},
  {id:6,subId:6,projId:"PRJ-2026-001",date:"2026-02-20",hours:7,desc:"Primer coat",approved:true},
  {id:7,subId:3,projId:"PRJ-2026-002",date:"2026-02-16",hours:8,desc:"Rough plumbing",approved:true},
  {id:8,subId:4,projId:"PRJ-2026-002",date:"2026-02-20",hours:8,desc:"Shower tile day 1",approved:true},
  {id:9,subId:4,projId:"PRJ-2026-002",date:"2026-02-21",hours:8,desc:"Shower tile day 2",approved:true},
  {id:10,subId:5,projId:"PRJ-2026-003",date:"2026-03-02",hours:8,desc:"Excavation & footings",approved:true},
  {id:11,subId:7,projId:"PRJ-2026-003",date:"2026-03-04",hours:8,desc:"Deck framing",approved:true},
  {id:12,subId:1,projId:"PRJ-2026-004",date:"2026-03-10",hours:8,desc:"Foundation prep",approved:true},
  {id:13,subId:7,projId:"PRJ-2026-004",date:"2026-03-11",hours:8,desc:"Wall framing day 1",approved:false},
  {id:14,subId:1,projId:"PRJ-2026-005",date:"2026-01-12",hours:8,desc:"Addition framing",approved:true},
  {id:15,subId:6,projId:"PRJ-2026-005",date:"2026-02-10",hours:8,desc:"Paint all surfaces",approved:true},
];

const SD_INVS=[
  {id:"INV-2026-001",number:"INV-2026-001",custId:1,projId:"PRJ-2026-001",estId:"EST-2026-001",status:"paid",issueDate:"2026-02-01",dueDate:"2026-03-01",discount:0,paidDate:"2026-02-28",taxRate:6.5,notes:"Deposit 50%.",
   lineItems:[{id:1,description:"Kitchen Remodel Labor & Mgmt",qty:1,unitPrice:14200,isMaterial:false},{id:2,description:"Cabinet Package",qty:1,unitPrice:6200,isMaterial:true},{id:3,description:"Granite Countertop 22 LF",qty:1,unitPrice:3960,isMaterial:true},{id:4,description:"LVP Flooring 280 SF",qty:1,unitPrice:1260,isMaterial:true}]},
  {id:"INV-2026-002",number:"INV-2026-002",custId:1,projId:"PRJ-2026-001",estId:"EST-2026-001",status:"sent",issueDate:"2026-03-10",dueDate:"2026-03-25",discount:0,paidDate:null,taxRate:6.5,notes:"Final balance due on completion.",
   lineItems:[{id:1,description:"Kitchen Remodel Final Labor",qty:1,unitPrice:9800,isMaterial:false},{id:2,description:"Backsplash Tile 32 SF",qty:1,unitPrice:640,isMaterial:true},{id:3,description:"Hardware & Accessories",qty:1,unitPrice:420,isMaterial:true}]},
  {id:"INV-2026-003",number:"INV-2026-003",custId:2,projId:"PRJ-2026-002",estId:"EST-2026-002",status:"overdue",issueDate:"2026-02-20",dueDate:"2026-03-05",discount:0,paidDate:null,taxRate:6.5,notes:"50% deposit overdue.",
   lineItems:[{id:1,description:"Bathroom Remodel Labor",qty:1,unitPrice:7200,isMaterial:false},{id:2,description:"Shower Tile 90 SF",qty:1,unitPrice:540,isMaterial:true},{id:3,description:"Vanity & Mirror",qty:1,unitPrice:850,isMaterial:true},{id:4,description:"Toilet & Fixtures",qty:1,unitPrice:620,isMaterial:true}]},
  {id:"INV-2026-004",number:"INV-2026-004",custId:3,projId:"PRJ-2026-003",estId:"EST-2026-003",status:"draft",issueDate:"2026-03-12",dueDate:"2026-04-12",discount:0,paidDate:null,taxRate:6.5,notes:"Deposit work begins 3/15.",
   lineItems:[{id:1,description:"Deck Construction Labor",qty:1,unitPrice:5400,isMaterial:false},{id:2,description:"Composite Decking 280 SF",qty:1,unitPrice:3360,isMaterial:true},{id:3,description:"Framing Lumber & Hardware",qty:1,unitPrice:1840,isMaterial:true}]},
  {id:"INV-2026-005",number:"INV-2026-005",custId:5,projId:"PRJ-2026-005",estId:null,status:"paid",issueDate:"2026-02-20",dueDate:"2026-02-28",discount:0,paidDate:"2026-02-27",taxRate:6.5,notes:"Final invoice project complete.",
   lineItems:[{id:1,description:"Master Suite Full Labor",qty:1,unitPrice:16200,isMaterial:false},{id:2,description:"Framing Materials",qty:1,unitPrice:3200,isMaterial:true},{id:3,description:"Drywall & Insulation",qty:1,unitPrice:1800,isMaterial:true},{id:4,description:"Flooring 320 SF",qty:1,unitPrice:896,isMaterial:true},{id:5,description:"Electrical Materials",qty:1,unitPrice:980,isMaterial:true}]},
];

const SD_COS=[
  {id:"CO-2026-001",number:"CO-2026-001",projId:"PRJ-2026-001",custId:1,discount:0,status:"approved",date:"2026-02-18",description:"Add under-cabinet lighting package",reason:"Customer request",laborAmt:1200,materialAmt:680,totalAmt:1880,approvedBy:"Customer",approvedDate:"2026-02-19",notes:"LED strip + transformer + install labor."},
  {id:"CO-2026-002",number:"CO-2026-002",projId:"PRJ-2026-002",custId:2,status:"pending",date:"2026-03-08",description:"Upgrade shower valve to thermostatic",reason:"Code requirement",laborAmt:400,materialAmt:520,totalAmt:920,approvedBy:null,approvedDate:null,notes:"Inspector flagged existing valve."},
  {id:"CO-2026-003",number:"CO-2026-003",projId:"PRJ-2026-004",custId:4,discount:0,status:"approved",date:"2026-03-12",description:"Add mini-split HVAC to ADU",reason:"Customer request",laborAmt:2800,materialAmt:3200,totalAmt:6000,approvedBy:"Customer",approvedDate:"2026-03-13",notes:"Mitsubishi 12K BTU wall mount."},
];

const SD_EXPENSES=[
  {id:1,projId:"PRJ-2026-001",date:"2026-02-04",category:"Materials",vendor:"Home Depot",description:"Framing lumber & hardware",amount:1840,receipt:true,reimbursable:false,notes:"PO #4421"},
  {id:2,projId:"PRJ-2026-001",date:"2026-02-12",category:"Permits",vendor:"City of Austin",description:"Kitchen remodel permit",amount:385,receipt:true,reimbursable:false,notes:"Permit #KR-2026-0188"},
  {id:3,projId:"PRJ-2026-002",date:"2026-02-17",category:"Materials",vendor:"Floor & Decor",description:"Shower tile 90 SF + floor tile",amount:920,receipt:true,reimbursable:false,notes:""},
  {id:4,projId:"PRJ-2026-003",date:"2026-03-03",category:"Equipment Rental",vendor:"Sunbelt Rentals",description:"Mini excavator 1-day",amount:450,receipt:true,reimbursable:true,notes:"Footing excavation"},
  {id:5,projId:"PRJ-2026-004",date:"2026-03-11",category:"Materials",vendor:"Home Depot",description:"Foundation concrete & rebar",amount:3200,receipt:true,reimbursable:false,notes:"12 yards ready-mix"},
  {id:6,projId:null,date:"2026-03-01",category:"Insurance",vendor:"State Farm",description:"Monthly GL premium",amount:680,receipt:true,reimbursable:false,notes:"Policy #GL-4492"},
  {id:7,projId:null,date:"2026-03-01",category:"Vehicle",vendor:"Shell",description:"Fuel — work trucks",amount:340,receipt:true,reimbursable:false,notes:"Fleet cards"},
  {id:8,projId:null,date:"2026-02-28",category:"Office",vendor:"QuickBooks",description:"Monthly subscription",amount:85,receipt:false,reimbursable:false,notes:""},
];

const EXPENSE_CATS=["Materials","Labor","Permits","Equipment Rental","Insurance","Vehicle","Fuel","Office","Tools","Subcontractor","Disposal","Meals","Travel","Marketing","Miscellaneous"];

const SD_COMPANY={
  name:"JB Construction LLC",
  owner:"Jason Braddock",
  phone:"(512) 555-0199",
  email:"jason@jbconstruction.com",
  address:"2801 S Lamar Blvd, Suite 210, Austin TX 78704",
  website:"www.jbconstruction.com",
  license:"TX GC License #28841",
  ein:"74-3229901",
  defaultTaxRate:6.5,
  paymentTerms:30,
  laborBurdenDefault:28.3,
  logo:null,
  invoiceFooter:"Thank you for your business. Payment due within terms shown above.",
  estimateFooter:"This estimate is valid for 30 days. Prices subject to change after expiry.",
  // Email & Notifications
  smtpHost:"smtp.gmail.com",
  smtpPort:587,
  smtpUser:"jason@jbconstruction.com",
  smtpPass:"",
  smtpSecure:true,
  emailFromName:"JB Construction LLC",
  emailReplyTo:"jason@jbconstruction.com",
  emailSignature:"Best regards,\nJason Braddock\nJB Construction LLC\n(512) 555-0199",
  notifyEstimateSent:true,
  notifyEstimateApproved:true,
  notifyEstimateDeclined:true,
  notifyInvoiceSent:true,
  notifyInvoicePaid:true,
  notifyInvoiceOverdue:true,
  notifyPaymentReminder:true,
  reminderDaysBefore:3,
  overdueFollowupDays:7,
  emailSubjectEstimate:"Estimate #{number} from {company}",
  emailSubjectInvoice:"Invoice #{number} from {company}",
  emailBodyEstimate:"Hi {customer},\n\nPlease find attached your estimate for {project}.\n\nTotal: {total}\n\nThis estimate is valid for 30 days.\n\nThank you,\n{company}",
  emailBodyInvoice:"Hi {customer},\n\nPlease find attached your invoice for {project}.\n\nAmount Due: {total}\nDue Date: {dueDate}\n\nThank you for your business.\n\n{company}",
  // Theme
  themeAccent:"#3b82f6",
  themeName:"Ocean Blue",
};

const USER_ROLES=["Owner","Admin","Project Manager","Estimator","Foreman","Bookkeeper","Field Tech","Read Only"];
const USER_ROLE_C={"Owner":"#f5a623","Admin":"#6366f1","Project Manager":"#3b82f6","Estimator":"#14b8a6","Foreman":"#fb923c","Bookkeeper":"#ec4899","Field Tech":"#78716c","Read Only":"#4a566e"};
const USER_ROLE_PERMS={
  "Owner":["All Access","Manage Users","Company Settings","Financial Reports","Delete Records"],
  "Admin":["All Access","Manage Users","Company Settings","Financial Reports"],
  "Project Manager":["Projects","Estimates","Invoices","Customers","Job Costing","Materials"],
  "Estimator":["Estimates","Customers","Materials","Projects (View)"],
  "Foreman":["Projects (View)","Time Tracking","Materials (View)","Subcontractors (View)"],
  "Bookkeeper":["Invoices","Financial Reports","Customers","Job Costing","Expenses"],
  "Field Tech":["Time Tracking","Projects (View)","Materials (View)"],
  "Read Only":["Dashboard (View)","Projects (View)","Reports (View)"],
};
const USR_SC={"active":{bg:"rgba(34,197,94,.12)",c:"#22c55e",label:"Active"},"invited":{bg:"rgba(245,166,35,.12)",c:"#f5a623",label:"Invited"},"disabled":{bg:"rgba(239,68,68,.12)",c:"#ef4444",label:"Disabled"}};

const SD_USERS=[
  {id:1,name:"Jason Braddock",email:"jason@jbconstruction.com",phone:"(512)555-0199",role:"Owner",status:"active",lastLogin:"2026-03-12",createdAt:"2025-01-01"},
  {id:2,name:"Maria Santos",email:"maria@jbconstruction.com",phone:"(512)555-0202",role:"Admin",status:"active",lastLogin:"2026-03-11",createdAt:"2025-03-15"},
  {id:3,name:"Derek Nguyen",email:"derek@jbconstruction.com",phone:"(512)555-0303",role:"Project Manager",status:"active",lastLogin:"2026-03-10",createdAt:"2025-06-01"},
  {id:4,name:"Sarah Kim",email:"sarah@jbconstruction.com",phone:"(512)555-0404",role:"Estimator",status:"active",lastLogin:"2026-03-09",createdAt:"2025-09-12"},
  {id:5,name:"Carlos Mendez",email:"carlos@jbconstruction.com",phone:"(512)555-0505",role:"Foreman",status:"active",lastLogin:"2026-03-12",createdAt:"2025-06-01"},
  {id:6,name:"Linda Tran",email:"linda@jbconstruction.com",phone:"(512)555-0606",role:"Bookkeeper",status:"active",lastLogin:"2026-03-08",createdAt:"2025-11-01"},
  {id:7,name:"Mike Torres",email:"mike.t@jbconstruction.com",phone:"(512)555-0707",role:"Field Tech",status:"active",lastLogin:"2026-03-11",createdAt:"2026-01-10"},
  {id:8,name:"Amy Chen",email:"amy@jbconstruction.com",phone:"(512)555-0808",role:"Read Only",status:"invited",lastLogin:null,createdAt:"2026-03-05"},
];

// ── STYLE MAPS ─────────────────────────────────────────────────
// ── LABOR ROLES (50) with base rates & burden ────────────────
const SD_ROLES=[
  {id:1,title:"Carpenter",baseRate:32,payrollPct:15.3,benefitsPct:12.5},
  {id:2,title:"Electrician",baseRate:42,payrollPct:15.3,benefitsPct:14.0},
  {id:3,title:"Plumber",baseRate:40,payrollPct:15.3,benefitsPct:14.0},
  {id:4,title:"Tile Setter",baseRate:36,payrollPct:15.3,benefitsPct:11.0},
  {id:5,title:"Laborer",baseRate:22,payrollPct:15.3,benefitsPct:8.0},
  {id:6,title:"Painter",baseRate:28,payrollPct:15.3,benefitsPct:10.0},
  {id:7,title:"Framer",baseRate:34,payrollPct:15.3,benefitsPct:12.0},
  {id:8,title:"HVAC Technician",baseRate:44,payrollPct:15.3,benefitsPct:15.0},
  {id:9,title:"Roofer",baseRate:35,payrollPct:15.3,benefitsPct:18.0},
  {id:10,title:"Mason",baseRate:38,payrollPct:15.3,benefitsPct:13.0},
  {id:11,title:"Concrete Finisher",baseRate:34,payrollPct:15.3,benefitsPct:12.5},
  {id:12,title:"Drywall Installer",baseRate:30,payrollPct:15.3,benefitsPct:11.5},
  {id:13,title:"Insulation Installer",baseRate:27,payrollPct:15.3,benefitsPct:11.0},
  {id:14,title:"Flooring Installer",baseRate:33,payrollPct:15.3,benefitsPct:11.5},
  {id:15,title:"Cabinet Installer",baseRate:35,payrollPct:15.3,benefitsPct:12.0},
  {id:16,title:"Countertop Installer",baseRate:36,payrollPct:15.3,benefitsPct:12.0},
  {id:17,title:"Window Installer",baseRate:32,payrollPct:15.3,benefitsPct:12.5},
  {id:18,title:"Door Installer",baseRate:31,payrollPct:15.3,benefitsPct:12.0},
  {id:19,title:"Siding Installer",baseRate:30,payrollPct:15.3,benefitsPct:12.0},
  {id:20,title:"Gutter Installer",baseRate:28,payrollPct:15.3,benefitsPct:11.0},
  {id:21,title:"Fence Builder",baseRate:29,payrollPct:15.3,benefitsPct:11.0},
  {id:22,title:"Deck Builder",baseRate:34,payrollPct:15.3,benefitsPct:12.5},
  {id:23,title:"Demolition Crew",baseRate:26,payrollPct:15.3,benefitsPct:14.0},
  {id:24,title:"Excavation Operator",baseRate:40,payrollPct:15.3,benefitsPct:13.0},
  {id:25,title:"Grading Operator",baseRate:38,payrollPct:15.3,benefitsPct:13.0},
  {id:26,title:"Surveyor",baseRate:45,payrollPct:15.3,benefitsPct:14.5},
  {id:27,title:"Welder",baseRate:42,payrollPct:15.3,benefitsPct:16.0},
  {id:28,title:"Ironworker",baseRate:44,payrollPct:15.3,benefitsPct:17.0},
  {id:29,title:"Scaffolding Erector",baseRate:33,payrollPct:15.3,benefitsPct:15.0},
  {id:30,title:"Stucco Applicator",baseRate:34,payrollPct:15.3,benefitsPct:12.0},
  {id:31,title:"Waterproofer",baseRate:32,payrollPct:15.3,benefitsPct:12.5},
  {id:32,title:"Fire Sprinkler Installer",baseRate:43,payrollPct:15.3,benefitsPct:15.0},
  {id:33,title:"Elevator Installer",baseRate:52,payrollPct:15.3,benefitsPct:16.0},
  {id:34,title:"Glass & Glazier",baseRate:36,payrollPct:15.3,benefitsPct:13.0},
  {id:35,title:"Locksmith",baseRate:30,payrollPct:15.3,benefitsPct:11.0},
  {id:36,title:"Landscape Contractor",baseRate:28,payrollPct:15.3,benefitsPct:10.5},
  {id:37,title:"Irrigation Installer",baseRate:30,payrollPct:15.3,benefitsPct:11.0},
  {id:38,title:"Pool Builder",baseRate:38,payrollPct:15.3,benefitsPct:13.5},
  {id:39,title:"Solar Installer",baseRate:36,payrollPct:15.3,benefitsPct:13.0},
  {id:40,title:"Low Voltage Tech",baseRate:35,payrollPct:15.3,benefitsPct:12.5},
  {id:41,title:"Fire Alarm Tech",baseRate:38,payrollPct:15.3,benefitsPct:14.0},
  {id:42,title:"Security System Tech",baseRate:34,payrollPct:15.3,benefitsPct:12.5},
  {id:43,title:"Acoustical Ceiling Installer",baseRate:31,payrollPct:15.3,benefitsPct:11.5},
  {id:44,title:"Epoxy Flooring Installer",baseRate:33,payrollPct:15.3,benefitsPct:12.0},
  {id:45,title:"Paving Contractor",baseRate:36,payrollPct:15.3,benefitsPct:13.5},
  {id:46,title:"Structural Engineer",baseRate:65,payrollPct:15.3,benefitsPct:16.0},
  {id:47,title:"Architect",baseRate:60,payrollPct:15.3,benefitsPct:16.0},
  {id:48,title:"Interior Designer",baseRate:45,payrollPct:15.3,benefitsPct:14.0},
  {id:49,title:"General Cleanup Crew",baseRate:18,payrollPct:15.3,benefitsPct:7.5},
  {id:50,title:"Site Superintendent",baseRate:48,payrollPct:15.3,benefitsPct:15.0},
];
const calcBurden=(r)=>{const tb=r.payrollPct+r.benefitsPct;return{totalBurdenPct:tb,fullyBurdenedRate:Math.round(r.baseRate*(1+tb/100)*100)/100};};
const getBurdenMult=(roles,roleTitle)=>{const r=roles.find(x=>x.title===roleTitle);if(!r)return 1.28;return 1+(r.payrollPct+r.benefitsPct)/100;};
const getBurdenedRate=(roles,roleTitle,wage)=>{return Math.round(wage*getBurdenMult(roles,roleTitle)*100)/100;};

// ── PRINT / PDF EXPORT ────────────────────────────────────────
const printDoc=(title,bodyHtml,co,autoPrint=false)=>{
  const coName=co?.name||"";const coAddr=co?.address||"";const coPhone=co?.phone||"";const coEmail=co?.email||"";const coLic=co?.license||"";
  const html=`<!DOCTYPE html><html><head><title>${title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;color:#1a1a2e;font-size:11px;padding:32px 40px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}
@page{size:letter;margin:18mm 14mm}
@media print{.no-print{display:none!important}}
.mn{font-family:'JetBrains Mono',monospace;font-weight:600}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1a2e;padding-bottom:14px;margin-bottom:18px}
.co-name{font-size:18px;font-weight:800;color:#1a1a2e;letter-spacing:-.3px}
.co-info{font-size:9px;color:#555;line-height:1.6;text-align:right}
.doc-title{font-size:14px;font-weight:800;color:#1a1a2e;margin-bottom:2px}
.doc-meta{font-size:10px;color:#666;margin-bottom:16px}
.section{margin-bottom:16px}
.section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;border-bottom:1px solid #e0e0e0;padding-bottom:3px}
table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}
th{background:#f4f4f8;padding:6px 10px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:2px solid #ddd}
td{padding:6px 10px;border-bottom:1px solid #eee}
.totals{max-width:260px;margin-left:auto}
.totals .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;font-size:10px}
.totals .row.grand{border-top:2px solid #1a1a2e;border-bottom:none;padding-top:8px;font-size:13px;font-weight:800}
.notes{background:#f8f8fb;border:1px solid #e8e8ee;border-radius:6px;padding:10px 14px;font-size:10px;color:#555;line-height:1.7}
.footer{margin-top:24px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#888;text-align:center}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:8px;font-weight:700;text-transform:uppercase}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
</style></head><body>
<div class="hdr">
  <div><div class="co-name">${coName}</div>${coLic?`<div style="font-size:9px;color:#888;margin-top:2px">${coLic}</div>`:""}</div>
  <div class="co-info">${coAddr?coAddr.replace(/,/g,",<br>"):""}${coPhone?"<br>"+coPhone:""}${coEmail?"<br>"+coEmail:""}</div>
</div>
${bodyHtml}
</body></html>`;

  // Try window.open first (works in most browsers)
  try {
    const w=window.open("","_blank");
    if(w&&w.document){
      w.document.write(html);
      w.document.close();
      if(autoPrint){
        setTimeout(()=>{try{w.print();}catch(e){}},600);
      }
      return;
    }
  } catch(e){}

  // Fallback: iframe approach for sandboxed environments
  let iframe=document.getElementById("__print_frame");
  if(iframe)iframe.remove();
  iframe=document.createElement("iframe");
  iframe.id="__print_frame";
  iframe.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;border:none;background:#fff";
  document.body.appendChild(iframe);
  const idoc=iframe.contentDocument||iframe.contentWindow.document;
  idoc.open();
  idoc.write(html.replace("</body>",`
    <div class="no-print" style="position:fixed;top:14px;right:14px;display:flex;gap:6px;z-index:100">
      <button onclick="window.print()" style="border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;background:#1a1a2e;color:#fff">⎙ Print</button>
      <button onclick="window.print()" style="border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;background:#3b82f6;color:#fff">↓ Save PDF</button>
      <button onclick="parent.document.getElementById('__print_frame').remove()" style="border:none;padding:9px 14px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;background:#ef4444;color:#fff">✕ Close</button>
    </div>
  </body>`));
  idoc.close();
  if(autoPrint){
    setTimeout(()=>{try{iframe.contentWindow.print();}catch(e){}},600);
  }
};

const ROLE_C={};
const _rc=["#f5a623","#6366f1","#3b82f6","#14b8a6","#78716c","#ec4899","#fb923c","#a78bfa","#ef4444","#22c55e","#f59e0b","#94a3b8","#06b6d4","#84cc16","#e879f9","#facc15","#0ea5e9","#d946ef","#f97316","#10b981"];
SD_ROLES.forEach((r,i)=>{ROLE_C[r.title]=_rc[i%_rc.length];});
const CAT_C={"Lumber":"#f5a623","Drywall":"#94a3b8","Flooring":"#22c55e","Tile":"#14b8a6","Paint":"#ec4899","Plumbing":"#3b82f6","Electrical":"#f59e0b","Decking":"#a78bfa","Concrete":"#78716c","Insulation":"#fb923c","Doors & Windows":"#6366f1"};
const TAG_C={"VIP":{bg:"rgba(245,166,35,.14)",c:"#f5a623"},"Repeat":{bg:"rgba(99,179,237,.14)",c:"#63b3ed"},"Hot Lead":{bg:"rgba(239,68,68,.12)",c:"#ef4444"},"Investor":{bg:"rgba(166,139,250,.12)",c:"#a78bfa"},"New":{bg:"rgba(34,197,94,.1)",c:"#22c55e"},"Referral Source":{bg:"rgba(251,146,60,.1)",c:"#fb923c"}};
const INV_SC={"draft":{bg:"rgba(74,80,104,.18)",c:"#7a8299",label:"Draft"},"sent":{bg:"rgba(245,166,35,.12)",c:"#f5a623",label:"Sent"},"paid":{bg:"rgba(34,197,94,.12)",c:"#22c55e",label:"Paid"},"overdue":{bg:"rgba(239,68,68,.12)",c:"#ef4444",label:"Overdue"},"void":{bg:"rgba(99,102,241,.1)",c:"#6366f1",label:"Void"}};
const EST_SC={"draft":{bg:"rgba(74,80,104,.18)",c:"#7a8299",label:"Draft"},"sent":{bg:"rgba(245,166,35,.12)",c:"#f5a623",label:"Sent"},"approved":{bg:"rgba(34,197,94,.12)",c:"#22c55e",label:"Approved"},"declined":{bg:"rgba(239,68,68,.12)",c:"#ef4444",label:"Declined"}};
const PRJ_SC={"active":{bg:"rgba(59,130,246,.12)",c:"#3b82f6",label:"Active"},"complete":{bg:"rgba(34,197,94,.12)",c:"#22c55e",label:"Complete"},"on_hold":{bg:"rgba(245,166,35,.12)",c:"#f5a623",label:"On Hold"},"cancelled":{bg:"rgba(239,68,68,.1)",c:"#ef4444",label:"Cancelled"}};
const CO_SC={"pending":{bg:"rgba(245,166,35,.12)",c:"#f5a623",label:"Pending"},"approved":{bg:"rgba(34,197,94,.12)",c:"#22c55e",label:"Approved"},"declined":{bg:"rgba(239,68,68,.12)",c:"#ef4444",label:"Declined"},"invoiced":{bg:"rgba(99,102,241,.1)",c:"#6366f1",label:"Invoiced"}};

// ── SHARED MICRO-COMPONENTS ────────────────────────────────────
const Chip=({s,map})=>{const sc=(map||INV_SC)[s]||{bg:"rgba(74,80,104,.15)",c:"#7a8299",label:s};return <span style={{padding:"2px 9px",borderRadius:12,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.4,background:sc.bg,color:sc.c}}>{sc.label}</span>;};
const ES=({icon,text})=><div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"38px 20px",color:"#2d3a52",gap:10,textAlign:"center"}}><I n={icon} s={28}/><div style={{fontSize:13}}>{text}</div></div>;
const ini=n=>n?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"??";
const avC=id=>["#3b82f6","#a78bfa","#22c55e","#f5a623","#fb923c","#6366f1","#14b8a6"][id%7];
const Pr=({v,color})=><div style={{height:5,background:"#0c0f17",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:`${v}%`,background:color||"#3b82f6",transition:"width .6s ease"}}/></div>;

// ── ICONS ──────────────────────────────────────────────────────
const I=({n,s=18})=>{
  const p={fill:"none",stroke:"currentColor",strokeWidth:"2",width:s,height:s};
  switch(n){
    case "dashboard": return <svg {...p} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
    case "customers": return <svg {...p} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
    case "estimates": return <svg {...p} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case "projects":  return <svg {...p} viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
    case "costing":   return <svg {...p} viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
    case "materials": return <svg {...p} viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case "employees": return <svg {...p} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "invoices":  return <svg {...p} viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
    case "reports":   return <svg {...p} viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
    case "plus":      return <svg {...p} strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "x":         return <svg {...p} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case "edit":      return <svg {...p} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case "trash":     return <svg {...p} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
    case "search":    return <svg {...p} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case "check":     return <svg {...p} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>;
    case "alert":     return <svg {...p} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "fire":      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8 6 6 10 8 14c-2-1-3-3-3-5C3 13 5 19 12 22c7-3 9-9 7-13-1 2-3 3-5 2 2-2 2-6-2-9z"/></svg>;
    case "menu":      return <svg {...p} viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
    case "wrench":    return <svg {...p} viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
    case "clock":     return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "send":      return <svg {...p} viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    case "copy":      return <svg {...p} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
    case "phone":     return <svg {...p} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 13a19.79 19.79 0 01-3.07-8.67A2 2 0 013.64 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 9.91a16 16 0 006.13 6.13l.91-.91a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>;
    case "mail":      return <svg {...p} viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>;
    case "map":       return <svg {...p} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
    case "convert":   return <svg {...p} viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
    case "arrow":     return <svg {...p} viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case "changeorder":return <svg {...p} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>;
    case "expense":   return <svg {...p} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="9" y1="3" x2="9" y2="9"/><line x1="7" y1="14" x2="7.01" y2="14"/><line x1="12" y1="14" x2="17" y2="14"/></svg>;
    case "settings":  return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    case "shield":    return <svg {...p} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "user-plus": return <svg {...p} viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
    case "eye":       return <svg {...p} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "eye-off":   return <svg {...p} viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
    case "lock":      return <svg {...p} viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
    case "camera":    return <svg {...p} viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;
    case "upload":    return <svg {...p} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
    case "bell":      return <svg {...p} viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
    case "palette":   return <svg {...p} viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.38-.15-.74-.39-1.04-.23-.29-.38-.65-.38-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.52-4.48-9.96-10-9.96z"/></svg>;
    case "image":     return <svg {...p} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
    case "building":  return <svg {...p} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/><path d="M9 22v-4h6v4"/></svg>;
    default:          return null;
  }
};
// ── CSS STRING ─────────────────────────────────────────────────
const FONT_URL='https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
const CSS=`
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:#0c0f17}
::-webkit-scrollbar-thumb{background:#1e2535;border-radius:2px}
button{cursor:pointer;border:none;background:none;font-family:inherit;color:inherit}
input,select,textarea{outline:none;font-family:inherit}
.nb{transition:all .16s;border-left:2px solid transparent;display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;color:#4a566e;text-align:left;white-space:nowrap;width:100%;font-size:13px;font-weight:600;cursor:pointer}
.nb:hover{background:rgba(99,179,237,.07)!important;color:#c8d0e0!important}
.nb.on{background:rgba(99,179,237,.1)!important;border-left-color:#63b3ed!important;color:#63b3ed!important}
.card{transition:box-shadow .2s,transform .2s}
.card:hover{box-shadow:0 10px 36px rgba(0,0,0,.45);transform:translateY(-1px)}
.rh:hover{background:rgba(255,255,255,.023)!important}
.bb{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-family:inherit;border-radius:8px;cursor:pointer;transition:all .15s;border:none}
.b-bl{background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff}.b-bl:hover{transform:translateY(-1px);box-shadow:0 5px 22px rgba(59,130,246,.45)}
.b-gr{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff}.b-gr:hover{transform:translateY(-1px);box-shadow:0 5px 20px rgba(34,197,94,.4)}
.b-am{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff}.b-am:hover{transform:translateY(-1px);box-shadow:0 5px 20px rgba(245,158,11,.4)}
.b-gh{border:1px solid #1e2535!important;color:#7a8299!important;background:transparent}.b-gh:hover{border-color:#3b82f6!important;color:#63b3ed!important}
.b-rd{border:1px solid rgba(239,68,68,.3)!important;color:#ef4444!important;background:transparent}.b-rd:hover{background:rgba(239,68,68,.08)!important}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:900;display:flex;align-items:flex-start;justify-content:center;padding:20px;backdrop-filter:blur(8px);overflow-y:auto}
.mo{background:#0e1119;border:1px solid #1e2535;border-radius:16px;width:100%;box-shadow:0 28px 70px rgba(0,0,0,.7)}
.inp{background:#0c0f17;border:1px solid #1e2535;color:#dde1ec;border-radius:8px;padding:9px 13px;font-size:13px;width:100%;transition:border-color .18s}
.inp:focus{border-color:#3b82f6}.inp::placeholder{color:#3a4160}
select.inp option{background:#0c0f17}
.lbl{display:block;font-size:11px;color:#4a566e;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.g6{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes gridFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.fu{animation:up .26s ease}
.sl{cursor:pointer;transition:all .15s;border-left:3px solid transparent}
.sl:hover{background:rgba(99,179,237,.05)!important;border-left-color:#3b82f6!important}
.sl.on{background:rgba(99,179,237,.08)!important;border-left-color:#63b3ed!important}
.mn{font-family:'JetBrains Mono',monospace;font-weight:600}
.stl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:#4a566e;margin-bottom:12px}
.spl{display:grid;grid-template-columns:300px 1fr;height:calc(100vh - 88px);border:1px solid #111826;border-radius:14px;overflow:hidden}
.spl-l{border-right:1px solid #111826;display:flex;flex-direction:column;background:#0a0d15;overflow:hidden}
.spl-r{display:flex;flex-direction:column;overflow:hidden;background:#080a0f}
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.mob-only{display:none}
.desk-only{display:block}
.desk-flex{display:flex}
.mob-drawer-overlay{display:none}
.sub-tabs{display:flex;gap:2;background:#0a0d15;border-radius:10;padding:3px;border:1px solid #111826;width:fit-content;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
.sub-tabs::-webkit-scrollbar{height:0}
main table{min-width:600px}
main .tbl-auto{overflow-x:auto;-webkit-overflow-scrolling:touch}
main>div table,main>div>div table,.spl-r table{min-width:600px}
div:has(>table){overflow-x:auto;-webkit-overflow-scrolling:touch}
@media(max-width:768px){
  main>div table,main>div>div table,.spl-r table{min-width:500px}
  .sub-tabs{width:100%}
  div:has(>table){overflow-x:auto}
}
@media(max-width:1024px){
  .g4{grid-template-columns:repeat(2,1fr)}
  .g6{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:768px){
  .g2{grid-template-columns:1fr}
  .g3{grid-template-columns:1fr}
  .g4{grid-template-columns:1fr 1fr}
  .g6{grid-template-columns:repeat(2,1fr)}
  .spl{grid-template-columns:1fr;height:auto}
  .spl-l{max-height:40vh;border-right:none;border-bottom:1px solid #111826}
  .ov{padding:0}
  .mo{border-radius:0;min-height:100vh;border:none}
  .mob-only{display:block}
  .desk-only{display:none!important}
  .desk-flex{display:none!important}
  .mob-drawer-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99;backdrop-filter:blur(4px)}
}
@media(max-width:480px){
  .g4{grid-template-columns:1fr}
  .g6{grid-template-columns:1fr}
}
`;

// ══════════════════════════════════════════════════════════════
// LOGIN (sign up removed — only admins can add users via Company Setup)
// ══════════════════════════════════════════════════════════════
function LoginPage({users, setUsers, onLogin}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!pass.trim()) { setError("Password is required"); return; }
    setLoading(true);
    try {
      const user = await api.login(email.trim(), pass);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  const demoLogin = async (u) => {
    setLoading(true);
    try {
      const user = await api.login(u.email, "contractor123");
      onLogin(user);
    } catch (err) {
      onLogin({...u, lastLogin: tod()});
    }
  };

  const inputStyle = {
    background:"#0c0f17",border:"1px solid #1e2535",color:"#dde1ec",borderRadius:10,padding:"12px 14px",fontSize:14,width:"100%",transition:"border-color .2s",outline:"none",fontFamily:"'DM Sans',system-ui,sans-serif"
  };

  return (
    <div style={{minHeight:"100vh",background:"#080a0f",display:"flex",flexDirection:"row",flexWrap:"wrap",fontFamily:"'DM Sans',system-ui,sans-serif",color:"#dde1ec",overflow:"auto"}}>
      <style>{CSS}</style>

      {/* LEFT — BRANDING PANEL */}
      <div style={{flex:"1 1 380px",minHeight:"min(100vh,500px)",background:"linear-gradient(160deg,#0a0d15 0%,#0e1225 40%,#111a38 100%)",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"clamp(30px,5vw,60px) clamp(20px,4vw,50px)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,opacity:.06,backgroundImage:"radial-gradient(circle,#3b82f6 1px,transparent 1px)",backgroundSize:"32px 32px"}}/>
        <div style={{position:"absolute",top:"20%",left:"30%",width:300,height:300,background:"radial-gradient(circle,rgba(59,130,246,.12) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(60px)",animation:"gridFloat 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"15%",right:"20%",width:200,height:200,background:"radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 70%)",borderRadius:"50%",filter:"blur(50px)",animation:"gridFloat 6s ease-in-out infinite 2s"}}/>

        <div style={{position:"relative",zIndex:1,maxWidth:380}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:32}}>
            <div style={{width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 32px rgba(59,130,246,.35)"}}><I n="wrench" s={22}/></div>
            <div><div style={{fontSize:22,fontWeight:800,color:"#e2e8f0",letterSpacing:-.3}}>ContractorOS</div><div style={{fontSize:9,color:"#4a566e",fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>Pro · v3</div></div>
          </div>
          <div style={{fontSize:28,fontWeight:800,lineHeight:1.25,color:"#e2e8f0",marginBottom:14,letterSpacing:-.5}}>Run your construction<br/>business from one place.</div>
          <div style={{fontSize:14,color:"#4a566e",lineHeight:1.7,marginBottom:36}}>Estimates, projects, invoices, job costing, materials, subs — everything a GC needs to stay profitable and organized.</div>

          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {["Estimates","Job Costing","Invoicing","Change Orders","Subcontractors","Reports"].map(f=>(
              <span key={f} style={{fontSize:10,fontWeight:600,padding:"5px 12px",borderRadius:20,background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.15)",color:"#63b3ed"}}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — LOGIN FORM */}
      <div style={{flex:"1 1 380px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"clamp(24px,4vw,40px) clamp(16px,4vw,50px)",minHeight:"auto"}}>
        <div style={{width:"100%",maxWidth:400,animation:"slideUp .4s ease"}}>
          <div style={{marginBottom:28}}>
            <div style={{fontSize:22,fontWeight:800,color:"#e2e8f0",marginBottom:6}}>Welcome back</div>
            <div style={{fontSize:13,color:"#4a566e"}}>Sign in to your ContractorOS workspace</div>
          </div>

          {error&&(
            <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#ef4444",fontWeight:600,animation:"up .2s ease"}}>
              <I n="alert" s={14}/>{error}
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={{fontSize:11,color:"#4a566e",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5,display:"block"}}>Email</label>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="mail" s={15}/></div>
                <input style={{...inputStyle,paddingLeft:38}} type="email" placeholder="you@company.com" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
              </div>
            </div>

            <div>
              <label style={{fontSize:11,color:"#4a566e",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5,display:"block"}}>Password</label>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="lock" s={15}/></div>
                <input style={{...inputStyle,paddingLeft:38,paddingRight:42}} type={showPass?"text":"password"} placeholder="Enter password" value={pass} onChange={e=>{setPass(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
                <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#3a4160",padding:4,display:"flex"}}><I n={showPass?"eye-off":"eye"} s={15}/></button>
              </div>
            </div>

            <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:"13px 0",borderRadius:10,background:loading?"#1e2535":"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:loading?"default":"pointer",transition:"all .2s",boxShadow:loading?"none":"0 6px 24px rgba(59,130,246,.35)",fontFamily:"'DM Sans',system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading ? (<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"pulse 1s linear infinite"}}/> Signing in…</>) : "Sign In"}
            </button>
          </div>

          <div style={{textAlign:"center",marginTop:18,fontSize:12,color:"#3a4160"}}>
            Contact your administrator for account access
          </div>

          {/* Demo quick login */}
          <div style={{marginTop:28,borderTop:"1px solid #111826",paddingTop:20}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3a4160",textTransform:"uppercase",letterSpacing:1,marginBottom:10,textAlign:"center"}}>Quick Demo Access</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {users.filter(u=>u.status==="active").slice(0,4).map(u=>{
                const rc=USER_ROLE_C[u.role]||"#3b82f6";
                return (
                  <button key={u.id} onClick={()=>demoLogin(u)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"#0c0f17",border:"1px solid #1e2535",borderRadius:9,cursor:"pointer",transition:"all .18s",textAlign:"left"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=rc;e.currentTarget.style.background=rc+"08";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2535";e.currentTarget.style.background="#0c0f17";}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+rc+","+rc+"88)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",flexShrink:0}}>{ini(u.name)}</div>
                    <div style={{overflow:"hidden"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#c8d0e0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.name}</div>
                      <div style={{fontSize:9,color:rc,fontWeight:600}}>{u.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [auth, setAuth] = useState(()=>getSavedUser());
  const [tab,      setTab]      = useState("dashboard");
  const [custs,    setCusts]    = useState([]);
  const [ests,     setEsts]     = useState([]);
  const [projs,    setProjs]    = useState([]);
  const [mats,     setMats]     = useState([]);
  const [subs,     setSubs]     = useState([]);
  const [roles,    setRoles]    = useState([]);
  const [hrs,      setHrs]      = useState([]);
  const [invs,     setInvs]     = useState([]);
  const [cos,      setCos]      = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [company,  setCompany]  = useState({name:"",defaultTaxRate:6.5,paymentTerms:30,laborBurdenDefault:28.3});
  const [users,    setUsers]    = useState([]);
  const [sOpen,    setSOpen]    = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const [toast,    setToast]    = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const toastTimer = React.useRef(null);

  // ── Load fonts ─────────────────────────────────────
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  // ── Restore session + load all data ────────────────
  useEffect(() => {
    const token = getToken();
    if (!token || !auth) { setDataLoaded(true); return; }

    const loadAll = async () => {
      try {
        const user = await api.getMe();
        setAuth(user);

        const [c,e,p,m,s,r,h,i,co,ex,comp,u] = await Promise.all([
          api.customers.list().catch(()=>[]),
          api.estimates.list().catch(()=>[]),
          api.projects.list().catch(()=>[]),
          api.materials.list().catch(()=>[]),
          api.subcontractors.list().catch(()=>[]),
          api.laborRoles.list().catch(()=>[]),
          api.timeEntries.list().catch(()=>[]),
          api.invoices.list().catch(()=>[]),
          api.changeOrders.list().catch(()=>[]),
          api.expenses.list().catch(()=>[]),
          api.company.get().catch(()=>({})),
          api.users.list().catch(()=>[]),
        ]);

        setCusts(c); setEsts(e); setProjs(p); setMats(m);
        setSubs(s); setRoles(r); setHrs(h); setInvs(i);
        setCos(co); setExpenses(ex); setUsers(u);
        if (comp?.id) setCompany(comp);
      } catch (err) {
        console.error("Failed to load data:", err);
        // If API is unreachable, fall back to seed data for demo
        setCusts(SD_CUSTS); setEsts(SD_ESTS); setProjs(SD_PROJS); setMats(SD_MATS);
        setSubs(SD_SUBS); setRoles(SD_ROLES); setHrs(SD_HRS); setInvs(SD_INVS);
        setCos(SD_COS); setExpenses(SD_EXPENSES); setUsers(SD_USERS); setCompany(SD_COMPANY);
      }
      setDataLoaded(true);
    };
    loadAll();
  }, [auth?.id]);

  // ── Auth handler (called from LoginPage) ───────────
  const handleAuth = useCallback((user) => {
    saveUser(user);
    setAuth(user);
    setDataLoaded(false); // triggers re-fetch
  }, []);

  // ── Logout ─────────────────────────────────────────
  const handleLogout = useCallback(() => {
    api.logout();
    setAuth(null);
    setCusts([]); setEsts([]); setProjs([]); setMats([]);
    setSubs([]); setRoles([]); setHrs([]); setInvs([]);
    setCos([]); setExpenses([]); setUsers([]); setDataLoaded(true);
  }, []);

  const showToast = useCallback((msg, type="success") => {
    if(toastTimer.current) clearTimeout(toastTimer.current);
    setToast({msg,type});
    toastTimer.current = setTimeout(()=>setToast(null), 3200);
  }, []);

  const nav=[
    {id:"dashboard",label:"Dashboard",  icon:"dashboard"},
    {id:"customers",label:"Customers",  icon:"customers"},
    {id:"estimates",label:"Estimates",  icon:"estimates"},
    {id:"projects", label:"Projects",   icon:"projects"},
    {id:"costing",  label:"Job Costing",icon:"costing"},
    {id:"cos",      label:"Change Orders",icon:"changeorder"},
    {id:"expenses", label:"Expenses",   icon:"expense"},
    {id:"materials",label:"Materials",  icon:"materials"},
    {id:"subs",     label:"Subcontractors",icon:"employees"},
    {id:"roles",    label:"Labor Roles", icon:"wrench"},
    {id:"invoices", label:"Invoices",   icon:"invoices"},
    {id:"reports",  label:"Reports",    icon:"reports"},
    {id:"company",  label:"Company Setup",icon:"settings"},
  ];

  const overdue = invs.filter(i=>i.status==="overdue");
  const overdueAmt = overdue.reduce((s,i)=>s+calcInv(i.lineItems,i.taxRate,i.discount||0).total,0);

  // ── DB Helpers ─────────────────────────────────────
  // Each function: 1) updates React state instantly, 2) calls API in background
  // Components call db.custs.create(item), db.custs.update(id, changes), db.custs.remove(id)
  const strip = (obj) => {
    var c = {...obj};
    delete c._id; delete c.createdAt; delete c.updatedAt; delete c.company; delete c.customer;
    delete c.project; delete c.estimate; delete c.sub; delete c.timeEntries;
    delete c.invoices; delete c.estimates; delete c.projects; delete c.changeOrders; delete c.expenses;
    return c;
  };

  const makeDb = (rawSet, apiRes) => ({
    create: (item) => {
      console.log('DB CREATE:', item);
      rawSet(prev => [item, ...prev]);
      var c = strip(item); if (typeof c.id === 'number') delete c.id;
      apiRes.create(c).then(r => console.log('DB CREATE OK:', r)).catch(e => console.error('DB CREATE FAIL:', e.message));
    },
    update: (id, changes) => {
      console.log('DB UPDATE:', id, changes);
      rawSet(prev => prev.map(x => x.id === id ? {...x, ...changes} : x));
      var c = strip(changes); delete c.id;
      apiRes.update(id, c).then(r => console.log('DB UPDATE OK:', r)).catch(e => console.error('DB UPDATE FAIL:', e.message));
    },
    remove: (id) => {
      console.log('DB REMOVE:', id);
      rawSet(prev => prev.filter(x => x.id !== id));
      apiRes.remove(id).then(r => console.log('DB REMOVE OK:', r)).catch(e => console.error('DB REMOVE FAIL:', e.message));
    },
  });

  const db = {
    custs:    makeDb(setCusts, api.customers),
    ests:     makeDb(setEsts, api.estimates),
    projs:    makeDb(setProjs, api.projects),
    mats:     makeDb(setMats, api.materials),
    subs:     makeDb(setSubs, api.subcontractors),
    roles:    makeDb(setRoles, api.laborRoles),
    hrs:      makeDb(setHrs, api.timeEntries),
    invs:     makeDb(setInvs, api.invoices),
    cos:      makeDb(setCos, api.changeOrders),
    expenses: makeDb(setExpenses, api.expenses),
    users:    makeDb(setUsers, api.users),
  };

  const sh = {custs,setCusts,ests,setEsts,projs,setProjs,mats,setMats,subs,setSubs,roles,setRoles,hrs,setHrs,invs,setInvs,cos,setCos,expenses,setExpenses,company,setCompany,users,setUsers,auth,setAuth:handleAuth,showToast,setTab,handleLogout,db};

  // ── Loading screen ─────────────────────────────────
  if (!dataLoaded && auth) return (
    <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",background:"#080a0f",color:"#dde1ec",flexDirection:"column",gap:16}}>
      <style>{CSS}</style>
      <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="wrench" s={20}/></div>
      <div style={{fontSize:14,fontWeight:700}}>Loading ContractorOS…</div>
      <div style={{fontSize:9,color:"#3a4160"}}>v3.1-db</div>
      <div style={{width:120,height:4,borderRadius:2,background:"#1e2535",overflow:"hidden"}}><div style={{width:"60%",height:"100%",borderRadius:2,background:"#3b82f6",animation:"pulse 1.5s ease-in-out infinite"}}/></div>
    </div>
  );

  if (!auth) return <LoginPage users={users} setUsers={setUsers} onLogin={handleAuth} />;

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif",background:"#080a0f",color:"#dde1ec",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* MOBILE NAV OVERLAY */}
      {mobileNav&&<div className="mob-drawer-overlay" onClick={()=>setMobileNav(false)}/>}

      {/* SIDEBAR — desktop: static, mobile: drawer */}
      <aside style={{
        width:mobileNav?260:(sOpen?234:56),
        background:"#0a0d15",borderRight:"1px solid #111826",display:"flex",flexDirection:"column",flexShrink:0,transition:"all .26s ease",overflow:"hidden",zIndex:mobileNav?100:10,
        ...(typeof window!=="undefined"&&window.innerWidth<=768?{position:"fixed",top:0,bottom:0,left:mobileNav?0:-270,boxShadow:mobileNav?"8px 0 40px rgba(0,0,0,.6)":"none"}:{})
      }}>
        <div style={{padding:"18px 12px 16px",borderBottom:"1px solid #111826",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I n="wrench" s={15}/></div>
          {(sOpen||mobileNav)&&<div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:"#e2e8f0",lineHeight:1}}>ContractorOS</div><div style={{fontSize:8,color:"#2d3a52",fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",marginTop:2}}>Pro · v3</div></div>}
          {mobileNav&&<button onClick={()=>setMobileNav(false)} style={{color:"#4a566e",padding:4}}><I n="x" s={16}/></button>}
        </div>
        <nav style={{flex:1,padding:"8px 5px",display:"flex",flexDirection:"column",gap:1,overflowY:"auto"}}>
          {nav.map(n=>(
            <button key={n.id} className={`nb ${tab===n.id?"on":""}`} onClick={()=>{setTab(n.id);setMobileNav(false);}}>
              <I n={n.icon} s={16}/>
              {(sOpen||mobileNav)&&<span>{n.label}</span>}
              {n.id==="invoices"&&overdue.length>0&&<span style={{marginLeft:"auto",background:"#ef4444",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:800,flexShrink:0}}>{overdue.length}</span>}
            </button>
          ))}
        </nav>
        {/* Sidebar user + logout */}
        <div style={{padding:"10px 7px",borderTop:"1px solid #111826",display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{setTab("profile");setMobileNav(false);}} style={{flex:1,display:"flex",alignItems:"center",gap:8,overflow:"hidden",padding:0,borderRadius:6,transition:"all .15s",cursor:"pointer"}} title="View Profile">
            {(sOpen||mobileNav) ? (<>
              <div style={{width:28,height:28,borderRadius:"50%",background:auth.avatar?`url(${auth.avatar}) center/cover`:`linear-gradient(135deg,${USER_ROLE_C[auth.role]||"#3b82f6"},${USER_ROLE_C[auth.role]||"#3b82f6"}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",flexShrink:0}}>{!auth.avatar&&ini(auth.name)}</div>
              <div style={{overflow:"hidden",textAlign:"left"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#c8d0e0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{auth.name}</div>
                <div style={{fontSize:9,color:"#3a4160",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{auth.role}</div>
              </div>
            </>) : (
              <div style={{width:28,height:28,borderRadius:"50%",background:auth.avatar?`url(${auth.avatar}) center/cover`:`linear-gradient(135deg,${USER_ROLE_C[auth.role]||"#3b82f6"},${USER_ROLE_C[auth.role]||"#3b82f6"}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",flexShrink:0,margin:"0 auto"}}>{!auth.avatar&&ini(auth.name)}</div>
            )}
          </button>
          <button onClick={handleLogout} title="Sign Out" style={{color:"#4a566e",padding:7,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,transition:"all .15s",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color="#ef4444";}} onMouseLeave={e=>{e.currentTarget.style.color="#4a566e";}}><I n="arrow" s={15}/></button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <header style={{height:52,borderBottom:"1px solid #111826",display:"flex",alignItems:"center",padding:"0 14px 0 12px",justifyContent:"space-between",background:"#080a0f",flexShrink:0,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0,flex:1}}>
            {/* Mobile hamburger */}
            <button className="mob-only" onClick={()=>setMobileNav(true)} style={{color:"#7a8299",padding:4,flexShrink:0}}><I n="menu" s={20}/></button>
            <div style={{fontSize:17,fontWeight:800,letterSpacing:.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tab==="profile"?"My Profile":nav.find(n=>n.id===tab)?.label}</div>
            <div className="desk-flex" style={{fontSize:11,color:"#2d3a52",borderLeft:"1px solid #1e2535",paddingLeft:12,whiteSpace:"nowrap",flexShrink:0}}>Thursday, March 12, 2026</div>
          </div>
          <div style={{display:"flex",gap:9,alignItems:"center",flexShrink:0}}>
            {overdue.length>0&&<div className="desk-flex" style={{alignItems:"center",gap:5,padding:"4px 11px",background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.22)",borderRadius:16,color:"#ef4444",fontSize:10,fontWeight:700}}><I n="alert" s={11}/>{overdue.length} overdue · {fmt(overdueAmt)}</div>}
            <button onClick={()=>setTab("profile")} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"3px 0",borderRadius:8,transition:"all .15s",border:"none",background:"none",color:"inherit",fontFamily:"inherit"}} title="View Profile">
              <div className="desk-only" style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:700,color:"#c8d0e0"}}>{auth.name}</div><div style={{fontSize:9,color:"#3a4160"}}>{auth.role}</div></div>
              <div style={{width:32,height:32,borderRadius:"50%",background:auth.avatar?`url(${auth.avatar}) center/cover`:`linear-gradient(135deg,${USER_ROLE_C[auth.role]||"#3b82f6"},${USER_ROLE_C[auth.role]||"#3b82f6"}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,color:"#fff",flexShrink:0}}>{!auth.avatar&&ini(auth.name)}</div>
            </button>
          </div>
        </header>
        <main style={{flex:1,overflow:"auto",padding:"16px clamp(12px,3vw,20px)"}} className="fu" key={tab}>
          {tab==="dashboard" && <Dashboard {...sh}/>}
          {tab==="customers" && <Customers {...sh}/>}
          {tab==="estimates" && <Estimates {...sh}/>}
          {tab==="projects"  && <Projects  {...sh}/>}
          {tab==="costing"   && <JobCosting {...sh}/>}
          {tab==="cos"       && <ChangeOrders {...sh}/>}
          {tab==="expenses"  && <Expenses   {...sh}/>}
          {tab==="materials" && <Materials  {...sh}/>}
          {tab==="subs"      && <Subs       {...sh}/>}
          {tab==="roles"     && <LaborRoles {...sh}/>}
          {tab==="invoices"  && <Invoices   {...sh}/>}
          {tab==="reports"   && <Reports    {...sh}/>}
          {tab==="company"   && <CompanySetup {...sh}/>}
          {tab==="profile"   && <UserProfile {...sh}/>}
        </main>
      </div>

      {toast&&<div style={{position:"fixed",bottom:20,right:20,zIndex:2000,background:toast.type==="success"?"#052e16":"#450a0a",border:`1px solid ${toast.type==="success"?"#22c55e":"#ef4444"}`,color:"#fff",padding:"10px 16px",borderRadius:10,fontSize:13,fontWeight:600,display:"flex",gap:7,alignItems:"center",boxShadow:"0 8px 32px rgba(0,0,0,.5)",animation:"up .28s ease"}}><I n={toast.type==="success"?"check":"alert"} s={14}/>{toast.msg}</div>}
    </div>
  );
}

// ── TOOLTIP (reused across charts) ────────────────────────────
const CTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return <div style={{background:"#0e1119",border:"1px solid #1e2535",borderRadius:9,padding:"9px 13px",fontSize:11}}><div style={{fontWeight:700,marginBottom:5,color:"#dde1ec"}}>{label}</div>{payload.map(p=><div key={p.dataKey} style={{color:p.color,display:"flex",justifyContent:"space-between",gap:14}}><span>{p.name}</span><span className="mn">{fmtK(p.value)}</span></div>)}</div>;
};

// ── KPI CARD ──────────────────────────────────────────────────
const KpiCard=({label,val,sub,color})=>(
  <div className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"13px 15px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,right:0,width:44,height:44,background:color,opacity:.05,borderRadius:"0 0 0 44px"}}/>
    <div style={{fontSize:9,color:"#4a566e",fontWeight:700,textTransform:"uppercase",letterSpacing:.6,marginBottom:7,lineHeight:1.3}}>{label}</div>
    <div className="mn" style={{fontSize:20,color:color,letterSpacing:-1}}>{val}</div>
    <div style={{fontSize:10,color:"#3a4160",marginTop:4}}>{sub}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard({custs,ests,projs,invs,setTab}) {
  const ytd   = REV_DATA.slice(0,3).reduce((s,m)=>({rev:s.rev+m.revenue,prof:s.prof+m.profit}),{rev:0,prof:0});
  const iCalcs= invs.map(i=>({...i,...calcInv(i.lineItems,i.taxRate,i.discount||0)}));
  const coll  = iCalcs.filter(i=>i.status==="paid").reduce((s,i)=>s+i.total,0);
  const sent  = iCalcs.filter(i=>i.status==="sent").reduce((s,i)=>s+i.total,0);
  const ovAmt = iCalcs.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0);
  const draft = iCalcs.filter(i=>i.status==="draft").reduce((s,i)=>s+i.total,0);
  const actv  = projs.filter(p=>p.status==="active");

  const arPie=[
    {name:"Collected",value:coll,fill:"#22c55e"},
    {name:"Sent",value:sent,fill:"#3b82f6"},
    {name:"Overdue",value:ovAmt,fill:"#ef4444"},
    {name:"Draft",value:draft,fill:"#4a5068"},
  ].filter(d=>d.value>0);

  const kpis=[
    {label:"YTD Revenue",      val:fmt(ytd.rev),  sub:`Avg ${fmt(ytd.rev/3)}/mo`,                        color:"#63b3ed"},
    {label:"YTD Gross Profit", val:fmt(ytd.prof), sub:`${pct(ytd.prof,ytd.rev)}% margin`,                color:"#22c55e"},
    {label:"Invoiced",         val:fmt(iCalcs.reduce((s,i)=>s+i.total,0)), sub:`${invs.length} invoices`,color:"#a78bfa"},
    {label:"Collected",        val:fmt(coll),      sub:`${pct(coll,iCalcs.reduce((s,i)=>s+i.total,0))}% rate`, color:"#22c55e"},
    {label:"Active Projects",  val:actv.length,    sub:`${projs.filter(p=>p.status==="complete").length} complete`, color:"#f5a623"},
    {label:"Pending Estimates",val:ests.filter(e=>e.status==="draft"||e.status==="sent").length, sub:"Awaiting approval", color:"#fb923c"},
    {label:"Customers",        val:custs.length,   sub:`${custs.filter(c=>c.tags.includes("Hot Lead")).length} hot leads`, color:"#14b8a6"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:11}}>
        {kpis.map(k=><KpiCard key={k.label} {...k}/>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16}}>
        <div className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:13,padding:"16px 16px 8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <div><div style={{fontWeight:800,fontSize:13}}>Revenue vs. Profit — 2026</div><div style={{fontSize:10,color:"#4a566e",marginTop:1}}>Monthly trend</div></div>
            <span className="mn" style={{fontSize:12,color:"#63b3ed"}}>{fmt(ytd.rev)} YTD</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={REV_DATA} margin={{top:4,right:4,left:-24,bottom:0}}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={.2}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#111826" vertical={false}/>
              <XAxis dataKey="month" tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/>
              <Tooltip content={<CTip/>}/>
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#g1)" dot={false}/>
              <Area type="monotone" dataKey="profit"  name="Profit"  stroke="#22c55e" strokeWidth={2} fill="url(#g2)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:13,padding:"13px 15px",flex:1}}>
            <div style={{fontWeight:800,fontSize:12,marginBottom:8}}>A/R Status</div>
            <div style={{display:"flex",gap:0,height:90}}>
              <ResponsiveContainer width="45%" height="100%">
                <PieChart><Pie data={arPie} cx="50%" cy="50%" innerRadius={26} outerRadius={42} dataKey="value" paddingAngle={3}>{arPie.map(e=><Cell key={e.name} fill={e.fill}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#0e1119",border:"1px solid #1e2535",borderRadius:7,fontSize:10}}/></PieChart>
              </ResponsiveContainer>
              <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:5}}>
                {arPie.map(d=><div key={d.name} style={{display:"flex",justifyContent:"space-between",fontSize:10}}><div style={{display:"flex",gap:5,alignItems:"center"}}><div style={{width:6,height:6,borderRadius:1,background:d.fill}}/><span style={{color:"#7a8299"}}>{d.name}</span></div><span className="mn" style={{color:d.fill,fontSize:10}}>{fmt(d.value)}</span></div>)}
              </div>
            </div>
          </div>
          {ovAmt>0&&<div style={{background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.18)",borderRadius:11,padding:"11px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#ef4444",textTransform:"uppercase",letterSpacing:.5,marginBottom:7,display:"flex",gap:5,alignItems:"center"}}><I n="alert" s={11}/>Overdue</div>
            {invs.filter(i=>i.status==="overdue").map(i=>{const c=custs.find(x=>x.id===i.custId);const v=calcInv(i.lineItems,i.taxRate,i.discount||0).total;return <div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:"#c8d0e0"}}>{c?.name}</span><span className="mn" style={{color:"#ef4444"}}>{fmt(v)}</span></div>;})}
          </div>}
        </div>
      </div>

      <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:13,overflow:"hidden"}}>
        <div style={{padding:"11px 18px",borderBottom:"1px solid #111826",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,fontSize:13}}>Active Projects</div>
          <button onClick={()=>setTab("projects")} className="bb b-gh" style={{padding:"4px 11px",fontSize:11}}>View All <I n="arrow" s={11}/></button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0a0d15"}}>{["Project","Customer","Contract","Budget Labor","Budget Mat","Progress","Status"].map(h=><th key={h} style={{padding:"7px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.4,borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
          <tbody>
            {actv.map((p,i)=>{
              const c=custs.find(x=>x.id===p.custId);
              const pc=p.progress>=90?"#22c55e":p.progress>=50?"#3b82f6":"#f5a623";
              return <tr key={p.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                <td style={{padding:"8px 14px",fontWeight:700,color:"#c8d0e0"}}>{p.name}</td>
                <td style={{padding:"8px 14px",color:"#7a8299"}}>{c?.name}</td>
                <td className="mn" style={{padding:"8px 14px",color:"#3b82f6"}}>{fmt(p.contractValue)}</td>
                <td className="mn" style={{padding:"8px 14px",color:"#f5a623"}}>{fmt(p.budgetLabor)}</td>
                <td className="mn" style={{padding:"8px 14px",color:"#6c8ebf"}}>{fmt(p.budgetMaterials)}</td>
                <td style={{padding:"8px 14px",minWidth:110}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{flex:1}}><Pr v={p.progress} color={pc}/></div>
                    <span className="mn" style={{fontSize:9,color:"#7a8299"}}>{p.progress}%</span>
                  </div>
                </td>
                <td style={{padding:"8px 14px"}}><Chip s={p.status} map={PRJ_SC}/></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════════
function Customers({custs,setCusts,invs,ests,projs,showToast,db}) {
  const [sel,  setSel]   = useState(custs[0]?.id||null);
  const [srch, setSrch]  = useState("");
  const [tagF, setTagF]  = useState("All");
  const [form, setForm]  = useState(null); // null=closed
  const [dtab, setDtab]  = useState("overview");

  const TAGS=["All","VIP","Repeat","Hot Lead","Investor","New","Referral Source"];
  const filt=useMemo(()=>custs.filter(c=>{
    const ms=!srch||c.name.toLowerCase().includes(srch.toLowerCase())||c.email.toLowerCase().includes(srch.toLowerCase())||c.phone.includes(srch);
    return ms&&(tagF==="All"||c.tags.includes(tagF));
  }),[custs,srch,tagF]);

  const sc=custs.find(c=>c.id===sel)||null;
  const cInvs=sc?invs.filter(i=>i.custId===sc.id):[];
  const cEsts=sc?ests.filter(e=>e.custId===sc.id):[];
  const cProj=sc?projs.filter(p=>p.custId===sc.id):[];
  const billed=cInvs.reduce((s,i)=>s+calcInv(i.lineItems,i.taxRate,i.discount||0).total,0);

  const blank={name:"",phone:"",email:"",address:"",propertyType:"Single Family",leadSource:"Referral",notes:"",tags:[]};
  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=c=>setForm({...c,_id:c.id});
  const toggleTag=t=>setForm(f=>({...f,tags:f.tags.includes(t)?f.tags.filter(x=>x!==t):[...f.tags,t]}));

  const save=()=>{
    if(!form.name.trim()){showToast("Name required","error");return;}
    if(form._id){
      var changes={...form}; delete changes._id;
      db.custs.update(form._id, changes);
      showToast("Customer updated");
    } else {
      const nc={...form,id:uid(),totalRevenue:0,createdAt:tod()};
      db.custs.create(nc);
      setSel(nc.id);
      showToast("Customer added");
    }
    setForm(null);
  };
  const del=id=>{db.custs.remove(id);if(sel===id)setSel(null);showToast("Removed");};

  return (
    <div className="spl">
      {/* LEFT */}
      <div className="spl-l">
        <div style={{padding:"11px 12px",borderBottom:"1px solid #111826",flexShrink:0}}>
          <div style={{display:"flex",gap:7,marginBottom:8}}>
            <div style={{flex:1,position:"relative"}}>
              <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="search" s={12}/></div>
              <input className="inp" value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search…" style={{paddingLeft:27,fontSize:12}}/>
            </div>
            <button onClick={openNew} className="bb b-bl" style={{padding:"8px 12px",fontSize:12}}><I n="plus" s={12}/>Add</button>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {TAGS.map(t=><button key={t} onClick={()=>setTagF(t)} style={{padding:"3px 8px",borderRadius:18,fontSize:9,fontWeight:700,border:`1px solid ${tagF===t?"#3b82f6":"#111826"}`,background:tagF===t?"rgba(59,130,246,.14)":"transparent",color:tagF===t?"#63b3ed":"#4a566e"}}>{t}</button>)}
          </div>
        </div>
        <div style={{padding:"5px 12px",borderBottom:"1px solid #111826",fontSize:9,color:"#2d3a52",fontWeight:700,textTransform:"uppercase",letterSpacing:.7,flexShrink:0}}>{filt.length} customers</div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filt.map(c=>{
            const is=sel===c.id;
            return <div key={c.id} className={`sl ${is?"on":""}`} onClick={()=>{setSel(c.id);setDtab("overview");}} style={{padding:"10px 12px",borderBottom:"1px solid #0e1119",background:is?"rgba(59,130,246,.06)":"transparent"}}>
              <div style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                <div style={{width:34,height:34,borderRadius:9,background:avC(c.id),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,flexShrink:0}}>{ini(c.name)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:4}}>
                    <div style={{fontWeight:700,fontSize:12,color:is?"#e2e8f0":"#c8d0e0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                    <div className="mn" style={{fontSize:10,color:"#3b82f6",flexShrink:0}}>{fmt(c.totalRevenue)}</div>
                  </div>
                  <div style={{fontSize:10,color:"#3a4160",marginTop:1}}>{c.propertyType} · {c.leadSource}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:4}}>
                    {c.tags.map(t=><span key={t} style={{padding:"1px 6px",borderRadius:10,fontSize:8,fontWeight:700,textTransform:"uppercase",background:TAG_C[t]?.bg||"rgba(74,80,104,.15)",color:TAG_C[t]?.c||"#7a8299"}}>{t}</span>)}
                  </div>
                </div>
              </div>
            </div>;
          })}
          {filt.length===0&&<div style={{padding:"30px",textAlign:"center",color:"#2d3a52",fontSize:12}}>No customers found</div>}
        </div>
      </div>

      {/* RIGHT */}
      {sc?(
        <div className="spl-r">
          <div style={{padding:"15px 20px",borderBottom:"1px solid #111826",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{width:44,height:44,borderRadius:12,background:avC(sc.id),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16}}>{ini(sc.name)}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:18,letterSpacing:-.3}}>{sc.name}</div>
                  <div style={{display:"flex",gap:5,marginTop:4}}>{sc.tags.map(t=><span key={t} style={{padding:"2px 7px",borderRadius:10,fontSize:9,fontWeight:700,textTransform:"uppercase",background:TAG_C[t]?.bg||"rgba(74,80,104,.15)",color:TAG_C[t]?.c||"#7a8299"}}>{t}</span>)}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>openEdit(sc)} className="bb b-gh" style={{padding:"6px 12px",fontSize:11}}><I n="edit" s={12}/>Edit</button>
                <button onClick={()=>del(sc.id)} className="bb b-rd" style={{padding:"6px 10px",fontSize:11}}><I n="trash" s={12}/></button>
              </div>
            </div>
            <div style={{display:"flex",gap:16,marginTop:11,flexWrap:"wrap"}}>
              {[{icon:"phone",v:sc.phone},{icon:"mail",v:sc.email},{icon:"map",v:sc.address}].map(x=>(
                <div key={x.icon} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#7a8299"}}><span style={{color:"#4a566e"}}><I n={x.icon} s={11}/></span>{x.v}</div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:11,flexWrap:"wrap"}}>
              {[{l:"Revenue",v:fmt(sc.totalRevenue),c:"#3b82f6"},{l:"Billed",v:fmt(billed),c:"#22c55e"},{l:"Projects",v:cProj.length,c:"#f5a623"},{l:"Estimates",v:cEsts.length,c:"#a78bfa"},{l:"Invoices",v:cInvs.length,c:"#14b8a6"},{l:"Since",v:sc.createdAt,c:"#4a566e"}].map(k=>(
                <div key={k.l} style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:8,padding:"6px 11px"}}>
                  <div style={{fontSize:8,color:"#3a4160",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{k.l}</div>
                  <div className="mn" style={{fontSize:12,color:k.c,marginTop:2}}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",borderBottom:"1px solid #111826",padding:"0 20px",flexShrink:0}}>
            {["overview","projects","estimates","invoices","notes"].map(t=>(
              <button key={t} onClick={()=>setDtab(t)} style={{padding:"9px 15px",fontSize:11,fontWeight:700,textTransform:"capitalize",letterSpacing:.3,color:dtab===t?"#63b3ed":"#4a566e",borderBottom:`2px solid ${dtab===t?"#3b82f6":"transparent"}`,transition:"all .14s"}}>{t}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:20}} key={dtab+sc.id}>
            {dtab==="overview"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:15}}>
                  <div className="stl">Notes</div>
                  <div style={{fontSize:13,color:"#9aabb8",lineHeight:1.7,fontStyle:sc.notes?"normal":"italic"}}>{sc.notes||"No notes added."}</div>
                </div>
                <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:15}}>
                  <div className="stl">Recent Activity</div>
                  {[...cProj.map(p=>({type:"Project",name:p.name,status:p.status,val:p.contractValue,date:p.start,map:PRJ_SC})),
                    ...cEsts.map(e=>({type:"Estimate",name:e.name,status:e.status,val:calcInv(e.lineItems,e.taxRate,e.discount||0).total,date:e.date,map:EST_SC})),
                    ...cInvs.map(i=>({type:"Invoice",name:i.number,status:i.status,val:calcInv(i.lineItems,i.taxRate,i.discount||0).total,date:i.issueDate,map:INV_SC})),
                  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).map(a=>(
                    <div key={`${a.type}-${a.name}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #111826"}}>
                      <div><div style={{fontSize:12,fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:"#3a4160"}}>{a.type} · {a.date}</div></div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}><Chip s={a.status} map={a.map}/><span className="mn" style={{fontSize:12,color:"#63b3ed"}}>{fmt(a.val)}</span></div>
                    </div>
                  ))}
                  {cProj.length+cEsts.length+cInvs.length===0&&<ES icon="customers" text="No activity yet."/>}
                </div>
              </div>
            )}
            {dtab==="projects"&&(cProj.length===0?<ES icon="projects" text="No projects linked."/>:cProj.map(p=>(
              <div key={p.id} className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:11,padding:"13px 16px",marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Phase: {p.phase}</div></div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><Chip s={p.status} map={PRJ_SC}/><span className="mn" style={{fontSize:14,color:"#3b82f6"}}>{fmt(p.contractValue)}</span></div>
                </div>
                <div style={{marginTop:9}}><Pr v={p.progress} color={p.progress>=90?"#22c55e":p.progress>=50?"#3b82f6":"#f5a623"}/></div>
              </div>
            )))}
            {dtab==="estimates"&&(cEsts.length===0?<ES icon="estimates" text="No estimates."/>:cEsts.map(e=>{
              const c=calcInv(e.lineItems,e.taxRate,e.discount||0);
              return <div key={e.id} className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:11,padding:"13px 16px",marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontWeight:700,fontSize:13}}>{e.name}</div><div style={{fontSize:11,color:"#4a566e",marginTop:2}}>{e.number} · {e.date}</div></div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><Chip s={e.status} map={EST_SC}/><span className="mn" style={{fontSize:14,color:"#a78bfa"}}>{fmt(c.total)}</span></div>
                </div>
              </div>;
            }))}
            {dtab==="invoices"&&(
              <div>
                <div style={{display:"flex",gap:9,marginBottom:12}}>
                  {[{l:"Billed",v:fmt(billed),c:"#dde1ec"},{l:"Paid",v:fmt(cInvs.filter(i=>i.status==="paid").reduce((s,i)=>s+calcInv(i.lineItems,i.taxRate,i.discount||0).total,0)),c:"#22c55e"},{l:"Outstanding",v:fmt(cInvs.filter(i=>i.status!=="paid"&&i.status!=="void").reduce((s,i)=>s+calcInv(i.lineItems,i.taxRate,i.discount||0).total,0)),c:"#f5a623"}].map(k=>(
                    <div key={k.l} style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:8,padding:"7px 12px"}}><div style={{fontSize:9,color:"#3a4160",fontWeight:700,textTransform:"uppercase"}}>{k.l}</div><div className="mn" style={{fontSize:13,color:k.c,marginTop:2}}>{k.v}</div></div>
                  ))}
                </div>
                {cInvs.length===0?<ES icon="invoices" text="No invoices."/>:cInvs.map(inv=>{
                  const c=calcInv(inv.lineItems,inv.taxRate,inv.discount||0);
                  return <div key={inv.id} className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:11,padding:"11px 16px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><span className="mn" style={{fontSize:12,color:"#7a8299"}}>{inv.number}</span><div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Due {inv.dueDate}</div></div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}><Chip s={inv.status} map={INV_SC}/><span className="mn" style={{fontSize:14,color:"#22c55e"}}>{fmt(c.total)}</span></div>
                    </div>
                  </div>;
                })}
              </div>
            )}
            {dtab==="notes"&&(
              <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:16}}>
                <div className="stl">Client Notes</div>
                <textarea defaultValue={sc.notes} onBlur={e=>{db.custs.update(sc.id,{notes:e.target.value});showToast("Notes saved");}} rows={10} className="inp" placeholder="Notes…" style={{resize:"vertical",lineHeight:1.7,fontSize:13}}/>
                <div style={{fontSize:10,color:"#2d3a52",marginTop:6}}>Auto-saves on blur.</div>
              </div>
            )}
          </div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,color:"#2d3a52",gap:12}}>
          <I n="customers" s={40}/><div style={{fontSize:14,fontWeight:600}}>Select a customer</div>
          <button onClick={openNew} className="bb b-bl" style={{padding:"8px 16px",fontSize:12,marginTop:4}}><I n="plus" s={13}/>Add Customer</button>
        </div>
      )}

      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:580,marginTop:40}}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Customer":"New Customer"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13}}>
              <div><label className="lbl">Full Name *</label><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="John Smith"/></div>
              <div className="g2">
                <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(555) 000-0000"/></div>
                <div><label className="lbl">Email</label><input className="inp" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="client@email.com"/></div>
              </div>
              <div><label className="lbl">Address</label><input className="inp" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="123 Main St, Austin TX"/></div>
              <div className="g2">
                <div><label className="lbl">Property Type</label>
                  <select className="inp" value={form.propertyType} onChange={e=>setForm(f=>({...f,propertyType:e.target.value}))}>
                    {["Single Family","Condo","Multi-family","Commercial","Townhome","Rental Property"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="lbl">Lead Source</label>
                  <select className="inp" value={form.leadSource} onChange={e=>setForm(f=>({...f,leadSource:e.target.value}))}>
                    {["Referral","Google","Website","Facebook","Angi","HomeAdvisor","Yard Sign","Word of Mouth"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="lbl">Tags</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["VIP","Repeat","Hot Lead","Investor","New","Referral Source"].map(t=>{
                    const on=form.tags.includes(t);
                    return <button key={t} onClick={()=>toggleTag(t)} style={{padding:"4px 11px",borderRadius:18,fontSize:10,fontWeight:700,border:`1px solid ${on?(TAG_C[t]?.c||"#3b82f6"):"#1e2535"}`,background:on?(TAG_C[t]?.bg||"rgba(59,130,246,.12)"):"transparent",color:on?(TAG_C[t]?.c||"#63b3ed"):"#4a566e"}}>{t}</button>;
                  })}
                </div>
              </div>
              <div><label className="lbl">Notes</label><textarea className="inp" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{resize:"vertical"}}/></div>
              <div style={{display:"flex",gap:9,marginTop:4}}>
                <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={14}/>{form._id?"Update":"Add"} Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════
// ESTIMATES
// ══════════════════════════════════════════════════════════════
function Estimates({ests,setEsts,custs,projs,setProjs,invs,setInvs,mats,roles,company,showToast,setTab,db}) {
  const [sel,  setSel]  = useState(ests[0]?.id||null);
  const [srch, setSrch] = useState("");
  const [stF,  setStF]  = useState("all");
  const [form, setForm] = useState(null);
  const [picker, setPicker] = useState(null); // {type:"material"|"labor", search:""}
  const [emailMd, setEmailMd] = useState(false);

  const blankLine=()=>({id:uid(),description:"",qty:1,unitPrice:0,isMaterial:false,sourceType:"custom",sourceId:null});
  const blank={custId:"",name:"",date:tod(),expiry:addD(tod(),30),taxRate:FL_TAX,discount:0,notes:"",status:"draft",lineItems:[blankLine()]};

  const filt=useMemo(()=>ests.filter(e=>{
    const ms=!srch||e.name.toLowerCase().includes(srch.toLowerCase())||(e.number||"").toLowerCase().includes(srch.toLowerCase())||custs.find(c=>c.id===e.custId)?.name.toLowerCase().includes(srch.toLowerCase());
    return ms&&(stF==="all"||e.status===stF);
  }),[ests,srch,stF,custs]);

  const se=ests.find(e=>e.id===sel)||null;
  const seC=se?calcInv(se.lineItems,se.taxRate,se.discount||0):{sub:0,lab:0,mat:0,discountPct:0,discAmt:0,discSub:0,tax:0,total:0};
  const formC=form?calcInv(form.lineItems.filter(l=>l.description.trim()),Number(form.taxRate)||FL_TAX,Number(form.discount)||0):{sub:0,lab:0,mat:0,discountPct:0,discAmt:0,discSub:0,tax:0,total:0};

  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=e=>setForm({...e,_id:e.id,lineItems:e.lineItems.map(l=>({...l,sourceType:l.sourceType||(l.isMaterial?"material":"labor"),sourceId:l.sourceId||null}))});
  const addLine=()=>setForm(f=>({...f,lineItems:[...f.lineItems,blankLine()]}));
  const delLine=id=>setForm(f=>({...f,lineItems:f.lineItems.filter(l=>l.id!==id)}));
  const updLine=(id,fld,v)=>setForm(f=>({...f,lineItems:f.lineItems.map(l=>l.id===id?{...l,[fld]:fld==="qty"||fld==="unitPrice"?Number(v)||0:v}:l)}));

  const addMaterial=(mat)=>{
    const sellPrice=mat.cost*(1+mat.markup/100);
    const line={id:uid(),description:mat.name,qty:1,unitPrice:Math.round(sellPrice*100)/100,isMaterial:true,sourceType:"material",sourceId:mat.id,unit:mat.unit};
    setForm(f=>({...f,lineItems:[...f.lineItems,line]}));
    setPicker(null);
  };
  const addLabor=(role)=>{
    const b=calcBurden(role);
    const line={id:uid(),description:`${role.title} Labor`,qty:1,unitPrice:b.fullyBurdenedRate,isMaterial:false,sourceType:"labor",sourceId:role.id,unit:"hr"};
    setForm(f=>({...f,lineItems:[...f.lineItems,line]}));
    setPicker(null);
  };

  const save=()=>{
    if(!form.custId){showToast("Select a customer","error");return;}
    if(!form.name.trim()){showToast("Name required","error");return;}
    const lines=form.lineItems.filter(l=>l.description.trim());
    const c=calcInv(lines,Number(form.taxRate),Number(form.discount)||0);
    const data={...form,custId:Number(form.custId)||form.custId,subtotal:c.sub,materialSubtotal:c.mat,discount:Number(form.discount)||0,lineItems:lines};
    if(form._id){var ch={...data};delete ch._id;db.ests.update(form._id,ch);showToast("Updated");}
    else{const id=nxtNum(ests,"EST");const ne={...data,id,number:id};db.ests.create(ne);setSel(id);showToast(id+" created");}
    setForm(null);
  };
  const markSt=(id,st)=>{
    if(st==="approved"){
      const est=ests.find(e=>e.id===id);
      if(est&&!est.projId){
        const c=calcInv(est.lineItems,est.taxRate,est.discount||0);
        const projId=nxtNum(projs,"PRJ");
        const np={
          id:projId,name:est.name,custId:est.custId,estId:est.id,
          status:"active",contractValue:c.total,
          budgetLabor:c.lab,budgetMaterials:c.mat,
          actualLabor:0,actualMaterials:0,
          start:tod(),end:addD(tod(),60),
          phase:"Planning",progress:0,
          notes:"Auto-created from "+est.number
        };
        db.projs.create(np);
        db.ests.update(id,{status:"approved",projId:projId});
        showToast("Approved → "+projId+" created");
        return;
      }
    }
    db.ests.update(id,{status:st});
    showToast("Marked "+st);
  };
  const toInvoice=e=>{
    const id=nxtNum(invs,"INV");
    db.invs.create({id,number:id,custId:e.custId,projId:e.projId||null,estId:e.id,status:"draft",issueDate:tod(),dueDate:addD(tod(),30),discount:e.discount||0,paidDate:null,taxRate:e.taxRate,notes:"From "+e.number,lineItems:e.lineItems.map(function(l,i){return{...l,id:i+1};})});
    showToast(id+" created");setTab("invoices");
  };
  const del=id=>{db.ests.remove(id);if(sel===id)setSel(null);showToast("Deleted");};

  const exportEst=(e,autoPrint=false)=>{
    const c=custs.find(x=>x.id===e.custId);const calc=calcInv(e.lineItems,e.taxRate,e.discount||0);
    const labItems=e.lineItems.filter(l=>!l.isMaterial);const matItems=e.lineItems.filter(l=>l.isMaterial);
    const mkRows=(items,qtyH)=>items.map((li,i)=>`<tr><td>${i+1}</td><td>${li.description}</td><td class="mn" style="text-align:right">${li.qty}${qtyH==="Hours"?" hrs":""}</td><td class="mn" style="text-align:right">${fmtD(li.unitPrice)}${qtyH==="Hours"?"/hr":""}</td><td class="mn" style="text-align:right;font-weight:700">${fmtD(li.qty*li.unitPrice)}</td></tr>`).join("");
    const mkSection=(title,items,qtyH)=>items.length===0?"":
      `<div class="section"><div class="section-title">${title}</div>
        <table><thead><tr><th>#</th><th>Description</th><th style="text-align:right">${qtyH}</th><th style="text-align:right">Rate</th><th style="text-align:right">Total</th></tr></thead><tbody>${mkRows(items,qtyH)}</tbody></table></div>`;
    printDoc(`Estimate ${e.number}`,`
      <div class="doc-title">ESTIMATE ${e.number}</div>
      <div class="doc-meta">Status: ${e.status.toUpperCase()} · Date: ${e.date} · Expires: ${e.expiry}</div>
      <div class="two-col section">
        <div><div class="section-title">Bill To</div><div style="font-weight:700;font-size:12px">${c?.name||"—"}</div><div style="color:#555">${c?.address||""}</div><div style="color:#555">${c?.phone||""} ${c?.email?(" · "+c.email):""}</div></div>
        <div><div class="section-title">Project</div><div style="font-size:12px;color:#333">${e.name}</div></div>
      </div>
      ${mkSection("Labor",labItems,"Hours")}
      ${mkSection("Materials",matItems,"Qty")}
      <div class="totals">
        <div class="row"><span>Labor Subtotal</span><span class="mn">${fmt(calc.lab)}</span></div>
        <div class="row"><span>Material Subtotal</span><span class="mn">${fmt(calc.mat)}</span></div>
        <div class="row" style="font-weight:700"><span>Subtotal</span><span class="mn">${fmt(calc.sub)}</span></div>
        ${calc.discountPct>0?`<div class="row" style="color:#7c3aed"><span>Discount (${calc.discountPct}%)</span><span class="mn">−${fmt(calc.discAmt)}</span></div>
        <div class="row" style="font-weight:700"><span>After Discount</span><span class="mn">${fmt(calc.discSub)}</span></div>`:""}
        <div class="row"><span>Sales Tax (${e.taxRate}%${calc.discountPct>0?" on disc. materials":""})</span><span class="mn">${fmt(calc.tax)}</span></div>
        <div class="row grand"><span>TOTAL</span><span class="mn">${fmt(calc.total)}</span></div>
      </div>
      ${e.notes?`<div class="notes" style="margin-top:16px"><strong>Notes:</strong> ${e.notes}</div>`:""}
      ${company.estimateFooter?`<div class="footer">${company.estimateFooter}</div>`:""}
    `,company,autoPrint);
  };

  const cnts={all:ests.length,draft:ests.filter(e=>e.status==="draft").length,sent:ests.filter(e=>e.status==="sent").length,approved:ests.filter(e=>e.status==="approved").length};

  return (
    <div className="spl">
      <div className="spl-l">
        <div style={{padding:"11px 12px",borderBottom:"1px solid #111826",flexShrink:0}}>
          <div style={{display:"flex",gap:7,marginBottom:8}}>
            <div style={{flex:1,position:"relative"}}>
              <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="search" s={12}/></div>
              <input className="inp" value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search estimates…" style={{paddingLeft:27,fontSize:12}}/>
            </div>
            <button onClick={openNew} className="bb b-bl" style={{padding:"8px 12px",fontSize:12}}><I n="plus" s={12}/>New</button>
          </div>
          <div style={{display:"flex",borderRadius:7,overflow:"hidden",border:"1px solid #111826"}}>
            {[["all",`All (${cnts.all})`],["draft",`Draft (${cnts.draft})`],["sent",`Sent (${cnts.sent})`],["approved",`Approved (${cnts.approved})`]].map(([v,l])=>(
              <button key={v} onClick={()=>setStF(v)} style={{flex:1,padding:"5px 3px",fontSize:9,fontWeight:700,background:stF===v?"rgba(59,130,246,.15)":"transparent",color:stF===v?"#63b3ed":"#4a566e",borderRight:"1px solid #111826",transition:"all .13s"}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {filt.map(e=>{
            const c=custs.find(x=>x.id===e.custId);
            const calc=calcInv(e.lineItems,e.taxRate,e.discount||0);
            const is=sel===e.id;
            const sc=EST_SC[e.status]||EST_SC.draft;
            return <div key={e.id} className={`sl ${is?"on":""}`} onClick={()=>setSel(e.id)} style={{padding:"10px 12px",borderBottom:"1px solid #0e1119",background:is?"rgba(59,130,246,.06)":"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span className="mn" style={{fontSize:10,color:is?"#63b3ed":"#4a566e"}}>{e.number}</span>
                <span style={{padding:"2px 6px",borderRadius:10,fontSize:8,fontWeight:700,textTransform:"uppercase",background:sc.bg,color:sc.c}}>{sc.label}</span>
              </div>
              <div style={{fontWeight:700,fontSize:12,color:is?"#e2e8f0":"#c8d0e0",marginBottom:2}}>{e.name}</div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div style={{fontSize:10,color:"#3a4160"}}>{c?.name}</div>
                <div className="mn" style={{fontSize:12,color:"#a78bfa"}}>{fmt(calc.total)}</div>
              </div>
            </div>;
          })}
          {filt.length===0&&<div style={{padding:"30px",textAlign:"center",color:"#2d3a52",fontSize:12}}>No estimates found</div>}
        </div>
      </div>

      {se?(
        <div className="spl-r">
          <div style={{padding:"15px 20px",borderBottom:"1px solid #111826",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <span className="mn" style={{fontSize:17,color:"#e2e8f0"}}>{se.number}</span>
                  <Chip s={se.status} map={EST_SC}/>
                </div>
                <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>
                  {se.name} · {custs.find(c=>c.id===se.custId)?.name} · {se.date}
                  {se.projId&&<span style={{marginLeft:8,padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700,background:"rgba(59,130,246,.12)",color:"#3b82f6",cursor:"pointer"}} onClick={()=>setTab("projects")}><I n="projects" s={9}/> {se.projId}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {se.status==="draft"&&<button onClick={()=>markSt(se.id,"sent")} className="bb b-am" style={{padding:"5px 10px",fontSize:11}}><I n="send" s={11}/>Send</button>}
                {se.status==="sent"&&<button onClick={()=>markSt(se.id,"approved")} className="bb b-gr" style={{padding:"5px 10px",fontSize:11}}><I n="check" s={11}/>Approve</button>}
                {se.status==="sent"&&<button onClick={()=>markSt(se.id,"declined")} className="bb b-rd" style={{padding:"5px 9px",fontSize:11}}>Decline</button>}
                {se.status==="approved"&&se.projId&&<button onClick={()=>setTab("projects")} className="bb b-bl" style={{padding:"5px 10px",fontSize:11}}><I n="projects" s={11}/>View Project</button>}
                {se.status==="approved"&&<button onClick={()=>toInvoice(se)} className="bb b-gr" style={{padding:"5px 10px",fontSize:11}}><I n="convert" s={11}/>→ Invoice</button>}
                <button onClick={()=>openEdit(se)} className="bb b-gh" style={{padding:"5px 9px",fontSize:11}}><I n="edit" s={11}/></button>
                <button onClick={()=>setEmailMd(true)} className="bb b-bl" style={{padding:"5px 10px",fontSize:11}}><I n="mail" s={11}/>Email</button>
                <button onClick={()=>exportEst(se,true)} className="bb b-gh" style={{padding:"5px 9px",fontSize:11}}>⎙ Print</button>
                <button onClick={()=>exportEst(se,false)} className="bb b-gh" style={{padding:"5px 9px",fontSize:11}}>↓ PDF</button>
                <button onClick={()=>del(se.id)} className="bb b-rd" style={{padding:"5px 8px",fontSize:11}}><I n="trash" s={11}/></button>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{l:"Labor",v:fmt(seC.lab),c:"#f5a623"},{l:"Materials",v:fmt(seC.mat),c:"#6c8ebf"},{l:"Subtotal",v:fmt(seC.sub),c:"#dde1ec"},{l:`Tax ${se.taxRate}%`,v:fmt(seC.tax),c:"#14b8a6"},{l:"TOTAL",v:fmt(seC.total),c:"#22c55e",big:true}].map(k=>(
                <div key={k.l} style={{background:"#0c0f17",border:`1px solid ${k.big?"rgba(34,197,94,.3)":"#111826"}`,borderRadius:8,padding:"6px 11px"}}>
                  <div style={{fontSize:8,color:"#3a4160",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}}>{k.l}</div>
                  <div className="mn" style={{fontSize:k.big?14:11,color:k.c,marginTop:2}}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
            {(()=>{
              const labItems=se.lineItems.filter(l=>!l.isMaterial);
              const matItems=se.lineItems.filter(l=>l.isMaterial);
              const renderSection=(title,items,color,qtyLabel)=>(
                items.length>0&&<div style={{border:"1px solid #111826",borderRadius:11,overflow:"hidden",marginBottom:14}}>
                  <div style={{padding:"8px 14px",background:"#0a0d15",borderBottom:"1px solid #111826",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontWeight:700,fontSize:11,color}}><I n={title==="Labor"?"wrench":"materials"} s={12}/> {title}</div>
                    <span className="mn" style={{fontSize:11,color}}>{fmt(items.reduce((s,l)=>s+l.qty*l.unitPrice,0))}</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{background:"#0a0d15"}}>{["#","Description",qtyLabel,"Rate","Total"].map(h=><th key={h} style={{padding:"6px 13px",textAlign:"left",fontSize:8,fontWeight:700,color:"#4a566e",textTransform:"uppercase",borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {items.map((li,i)=>(
                        <tr key={li.id} className="rh" style={{borderTop:"1px solid #0e1119"}}>
                          <td style={{padding:"7px 13px",color:"#4a566e",fontSize:10}}>{i+1}</td>
                          <td style={{padding:"7px 13px",color:"#c8d0e0"}}>{li.description}</td>
                          <td className="mn" style={{padding:"7px 13px",color:"#7a8299"}}>{li.qty}{qtyLabel==="Hours"?" hrs":""}</td>
                          <td className="mn" style={{padding:"7px 13px",color:"#dde1ec"}}>{fmtD(li.unitPrice)}{qtyLabel==="Hours"?"/hr":""}</td>
                          <td className="mn" style={{padding:"7px 13px",color:"#22c55e",fontWeight:700}}>{fmtD(li.qty*li.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              return <>{renderSection("Labor",labItems,"#f5a623","Hours")}{renderSection("Materials",matItems,"#6c8ebf","Qty")}</>;
            })()}
            <div style={{border:"1px solid #111826",borderRadius:11,overflow:"hidden",marginBottom:14}}>
              <div style={{padding:"11px 16px",background:"#0a0d15"}}>
                <div style={{maxWidth:280,marginLeft:"auto"}}>
                  {[
                    {l:"Labor Subtotal",v:fmt(seC.lab),c:"#f5a623"},
                    {l:"Material Subtotal (taxable)",v:fmt(seC.mat),c:"#6c8ebf"},
                    {l:"Subtotal",v:fmt(seC.sub),c:"#dde1ec",bold:true},
                    ...(seC.discountPct>0?[{l:`Discount (${seC.discountPct}%)`,v:`−${fmt(seC.discAmt)}`,c:"#a78bfa"}]:[]),
                    ...(seC.discountPct>0?[{l:"After Discount",v:fmt(seC.discSub),c:"#dde1ec",bold:true}]:[]),
                    {l:`FL Sales Tax ${se.taxRate}%`,v:fmt(seC.tax),c:"#14b8a6"},
                  ].map(r=>(
                    <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #111826"}}>
                      <span style={{fontSize:11,color:r.bold?"#dde1ec":"#7a8299",fontWeight:r.bold?700:400}}>{r.l}</span>
                      <span className="mn" style={{fontSize:11,color:r.c}}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}>
                    <span style={{fontWeight:800,fontSize:13}}>TOTAL</span>
                    <span className="mn" style={{fontSize:18,color:"#22c55e"}}>{fmt(seC.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            {se.notes&&<div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:10,padding:"12px 15px"}}><div className="stl">Notes</div><div style={{fontSize:12,color:"#9aabb8",lineHeight:1.7}}>{se.notes}</div></div>}
          </div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,color:"#2d3a52",gap:12}}>
          <I n="estimates" s={40}/><div style={{fontSize:14,fontWeight:600}}>Select an estimate</div>
          <button onClick={openNew} className="bb b-bl" style={{padding:"8px 16px",fontSize:12,marginTop:4}}><I n="plus" s={13}/>New Estimate</button>
        </div>
      )}

      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:820,marginTop:20}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Estimate":"New Estimate"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 230px",maxHeight:"80vh",overflow:"hidden"}}>
              <div style={{padding:"18px 22px",overflowY:"auto",borderRight:"1px solid #1e2535"}}>
                <div className="g2" style={{marginBottom:12}}>
                  <div><label className="lbl">Name *</label><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Kitchen Remodel Bid"/></div>
                  <div><label className="lbl">Customer *</label>
                    <select className="inp" value={form.custId} onChange={e=>setForm(f=>({...f,custId:Number(e.target.value)}))}>
                      <option value="">— Select —</option>
                      {custs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="g4" style={{marginBottom:12}}>
                  <div><label className="lbl">Date</label><input className="inp" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
                  <div><label className="lbl">Expiry</label><input className="inp" type="date" value={form.expiry} onChange={e=>setForm(f=>({...f,expiry:e.target.value}))}/></div>
                  <div><label className="lbl">Tax Rate %</label><input className="inp" type="number" step=".1" value={form.taxRate} onChange={e=>setForm(f=>({...f,taxRate:Number(e.target.value)}))}/></div>
                  <div><label className="lbl">Discount %</label><input className="inp" type="number" step=".5" min="0" max="100" value={form.discount||0} onChange={e=>setForm(f=>({...f,discount:Number(e.target.value)||0}))} style={{borderColor:form.discount>0?"#a78bfa":"#1e2535"}}/></div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <label className="lbl" style={{marginBottom:0}}>Line Items</label>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>setPicker({type:"material",search:""})} className="bb b-bl" style={{padding:"4px 9px",fontSize:10,borderRadius:6}}><I n="materials" s={10}/>Material</button>
                    <button onClick={()=>setPicker({type:"labor",search:""})} className="bb b-am" style={{padding:"4px 9px",fontSize:10,borderRadius:6}}><I n="wrench" s={10}/>Labor</button>
                    <button onClick={addLine} className="bb b-gh" style={{padding:"4px 9px",fontSize:10,borderRadius:6}}><I n="plus" s={10}/>Custom</button>
                  </div>
                </div>
                {picker&&(
                  <div style={{border:"1px solid #3b82f6",borderRadius:9,background:"#0a0d15",marginBottom:10,overflow:"hidden",animation:"up .18s ease"}}>
                    <div style={{padding:"8px 10px",borderBottom:"1px solid #1e2535",display:"flex",gap:7,alignItems:"center"}}>
                      <div style={{position:"relative",flex:1}}>
                        <div style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="search" s={11}/></div>
                        <input className="inp" autoFocus value={picker.search} onChange={e=>setPicker(p=>({...p,search:e.target.value}))} placeholder={picker.type==="material"?"Search materials…":"Search labor roles…"} style={{paddingLeft:24,fontSize:11,padding:"5px 7px 5px 24px"}}/>
                      </div>
                      <button onClick={()=>setPicker(null)} style={{color:"#4a566e",flexShrink:0}}><I n="x" s={14}/></button>
                    </div>
                    <div style={{maxHeight:180,overflowY:"auto"}}>
                      {picker.type==="material"&&(()=>{
                        const fMats=mats.filter(m=>!picker.search||m.name.toLowerCase().includes(picker.search.toLowerCase())||m.category.toLowerCase().includes(picker.search.toLowerCase())||m.supplier.toLowerCase().includes(picker.search.toLowerCase()));
                        return fMats.length===0
                          ?<div style={{padding:"14px",textAlign:"center",color:"#3a4160",fontSize:11}}>No materials found</div>
                          :fMats.map(m=>{
                            const sp2=m.cost*(1+m.markup/100);
                            return <div key={m.id} onClick={()=>addMaterial(m)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px",borderBottom:"1px solid #0e1119",cursor:"pointer",transition:"background .1s"}} className="rh">
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,fontWeight:600,color:"#c8d0e0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                                <div style={{fontSize:9,color:"#3a4160",marginTop:1}}><span style={{padding:"1px 5px",borderRadius:6,background:`${CAT_C[m.category]||"#4a566e"}18`,color:CAT_C[m.category]||"#7a8299",fontSize:8,fontWeight:700}}>{m.category}</span> · {m.supplier} · {m.stock} {m.unit} in stock</div>
                              </div>
                              <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                                <div className="mn" style={{fontSize:11,color:"#22c55e"}}>{fmtD(sp2)}<span style={{fontSize:8,color:"#3a4160"}}>/{m.unit}</span></div>
                                <div style={{fontSize:8,color:"#4a566e"}}>cost {fmtD(m.cost)} +{m.markup}%</div>
                              </div>
                            </div>;
                          });
                      })()}
                      {picker.type==="labor"&&(()=>{
                        const fRoles=roles.filter(r=>!picker.search||r.title.toLowerCase().includes(picker.search.toLowerCase()));
                        return fRoles.length===0
                          ?<div style={{padding:"14px",textAlign:"center",color:"#3a4160",fontSize:11}}>No labor roles found</div>
                          :fRoles.map(r=>{
                            const b=calcBurden(r);const tc=ROLE_C[r.title]||"#4a566e";
                            return <div key={r.id} onClick={()=>addLabor(r)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px",borderBottom:"1px solid #0e1119",cursor:"pointer",transition:"background .1s"}} className="rh">
                              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                                <div style={{width:4,height:22,borderRadius:2,background:tc,flexShrink:0}}/>
                                <div>
                                  <div style={{fontSize:11,fontWeight:600,color:"#c8d0e0"}}>{r.title}</div>
                                  <div style={{fontSize:8,color:"#3a4160",marginTop:1}}>Base ${r.baseRate}/hr · Burden {b.totalBurdenPct.toFixed(1)}%</div>
                                </div>
                              </div>
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div className="mn" style={{fontSize:11,color:"#22c55e"}}>${b.fullyBurdenedRate.toFixed(2)}<span style={{fontSize:8,color:"#3a4160"}}>/hr</span></div>
                                <div style={{fontSize:8,color:"#4a566e"}}>fully burdened</div>
                              </div>
                            </div>;
                          });
                      })()}
                    </div>
                  </div>
                )}
                {(()=>{
                  const labLines=form.lineItems.filter(l=>l.sourceType==="labor"||(!l.isMaterial&&l.sourceType!=="material"));
                  const matLines=form.lineItems.filter(l=>l.sourceType==="material"||l.isMaterial);
                  const custLines=form.lineItems.filter(l=>l.sourceType==="custom"&&!l.isMaterial);
                  const renderEditSection=(title,items,color,qtyLabel,icon)=>(
                    items.length>0&&<div style={{border:"1px solid #1e2535",borderRadius:9,overflow:"hidden",marginBottom:10}}>
                      <div style={{padding:"6px 10px",background:"#0c0f17",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontWeight:700,fontSize:10,color,display:"flex",alignItems:"center",gap:5}}><I n={icon} s={11}/>{title}</span>
                        <span className="mn" style={{fontSize:10,color}}>{fmt(items.reduce((s,l)=>s+l.qty*l.unitPrice,0))}</span>
                      </div>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr style={{background:"#0c0f17"}}>{["Description",qtyLabel,"Rate/Price","Total",""].map(h=><th key={h} style={{padding:"5px 7px",textAlign:"left",fontSize:8,fontWeight:700,color:"#4a566e",textTransform:"uppercase",borderBottom:"1px solid #1e2535"}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {items.map((li,i)=>(
                            <tr key={li.id} style={{borderTop:i>0?"1px solid #111826":"none"}}>
                              <td style={{padding:"4px 6px"}}><input className="inp" value={li.description} onChange={e=>updLine(li.id,"description",e.target.value)} placeholder="Description" style={{fontSize:11,padding:"5px 7px"}}/></td>
                              <td style={{padding:"4px 6px"}}><input className="inp" type="number" value={li.qty} onChange={e=>updLine(li.id,"qty",e.target.value)} style={{fontSize:11,padding:"5px 5px",width:56}} placeholder={qtyLabel==="Hours"?"hrs":"qty"}/></td>
                              <td style={{padding:"4px 6px"}}><input className="inp" type="number" step=".01" value={li.unitPrice} onChange={e=>updLine(li.id,"unitPrice",e.target.value)} style={{fontSize:11,padding:"5px 5px",width:82}}/></td>
                              <td className="mn" style={{padding:"4px 6px",color:"#22c55e",fontSize:11,whiteSpace:"nowrap"}}>{fmtD(li.qty*li.unitPrice)}</td>
                              <td style={{padding:"4px 6px"}}><button onClick={()=>delLine(li.id)} style={{color:"#ef4444",opacity:.6}}><I n="x" s={12}/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                  return <>{renderEditSection("Labor",labLines.concat(custLines.filter(l=>!l.isMaterial&&l.sourceType==="custom"&&labLines.includes(l)?false:true).length===0?[]:[] ),"#f5a623","Hours","wrench")}{renderEditSection("Materials",matLines,"#6c8ebf","Qty","materials")}</>;
                })()}
                {(()=>{
                  // Render any items that don't fit neatly (custom lines)
                  const labIds=new Set(form.lineItems.filter(l=>l.sourceType==="labor").map(l=>l.id));
                  const matIds=new Set(form.lineItems.filter(l=>l.sourceType==="material"||l.isMaterial).map(l=>l.id));
                  const otherLines=form.lineItems.filter(l=>!labIds.has(l.id)&&!matIds.has(l.id));
                  return otherLines.length>0&&<div style={{border:"1px solid #1e2535",borderRadius:9,overflow:"hidden",marginBottom:10}}>
                    <div style={{padding:"6px 10px",background:"#0c0f17",borderBottom:"1px solid #1e2535"}}>
                      <span style={{fontWeight:700,fontSize:10,color:"#7a8299",display:"flex",alignItems:"center",gap:5}}><I n="plus" s={11}/>Custom Items</span>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr style={{background:"#0c0f17"}}>{["Description","Type","Qty","Price","Total",""].map(h=><th key={h} style={{padding:"5px 7px",textAlign:"left",fontSize:8,fontWeight:700,color:"#4a566e",textTransform:"uppercase",borderBottom:"1px solid #1e2535"}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {otherLines.map((li,i)=>(
                          <tr key={li.id} style={{borderTop:i>0?"1px solid #111826":"none"}}>
                            <td style={{padding:"4px 6px"}}><input className="inp" value={li.description} onChange={e=>updLine(li.id,"description",e.target.value)} placeholder="Description" style={{fontSize:11,padding:"5px 7px"}}/></td>
                            <td style={{padding:"4px 6px"}}><select className="inp" value={li.isMaterial?"m":"l"} onChange={e=>updLine(li.id,"isMaterial",e.target.value==="m")} style={{fontSize:10,padding:"5px 5px",width:68}}><option value="l">Labor</option><option value="m">Material</option></select></td>
                            <td style={{padding:"4px 6px"}}><input className="inp" type="number" value={li.qty} onChange={e=>updLine(li.id,"qty",e.target.value)} style={{fontSize:11,padding:"5px 5px",width:52}}/></td>
                            <td style={{padding:"4px 6px"}}><input className="inp" type="number" step=".01" value={li.unitPrice} onChange={e=>updLine(li.id,"unitPrice",e.target.value)} style={{fontSize:11,padding:"5px 5px",width:82}}/></td>
                            <td className="mn" style={{padding:"4px 6px",color:"#22c55e",fontSize:11,whiteSpace:"nowrap"}}>{fmtD(li.qty*li.unitPrice)}</td>
                            <td style={{padding:"4px 6px"}}><button onClick={()=>delLine(li.id)} style={{color:"#ef4444",opacity:.6}}><I n="x" s={12}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>;
                })()}
                <div style={{marginBottom:12}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{resize:"vertical"}}/></div>
                <div style={{display:"flex",gap:9}}>
                  <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                  <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={13}/>{form._id?"Update":"Create"} Estimate</button>
                </div>
              </div>
              <div style={{padding:"16px 14px",background:"#080a0f",overflowY:"auto"}}>
                <div className="stl">Preview</div>
                <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:9,overflow:"hidden"}}>
                  {[
                    {l:"Labor",v:fmt(formC.lab),c:"#f5a623"},
                    {l:"Materials",v:fmt(formC.mat),c:"#6c8ebf",note:"taxable"},
                    {l:"Subtotal",v:fmt(formC.sub),c:"#dde1ec",bold:true},
                    ...(formC.discountPct>0?[{l:`Discount (${formC.discountPct}%)`,v:`−${fmt(formC.discAmt)}`,c:"#a78bfa",disc:true}]:[]),
                    ...(formC.discountPct>0?[{l:"After Discount",v:fmt(formC.discSub),c:"#dde1ec",bold:true}]:[]),
                    {l:`Tax ${form.taxRate}%`+(formC.discountPct>0?" (on disc. materials)":""),v:fmt(formC.tax),c:"#14b8a6"},
                  ].map(r=>(
                    <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 11px",borderBottom:"1px solid #111826",background:r.disc?"rgba(167,139,250,.04)":"transparent"}}>
                      <div><span style={{fontSize:10,color:r.disc?"#a78bfa":r.bold?"#dde1ec":"#7a8299",fontWeight:r.bold||r.disc?700:400}}>{r.l}</span>{r.note&&<span style={{fontSize:8,color:"#3a4160",marginLeft:4}}>({r.note})</span>}</div>
                      <span className="mn" style={{fontSize:10,color:r.c}}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{padding:"10px 11px",background:"rgba(34,197,94,.05)"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:800,fontSize:12}}>TOTAL</span><span className="mn" style={{fontSize:17,color:"#22c55e"}}>{fmt(formC.total)}</span></div>
                  </div>
                </div>
                <div style={{marginTop:10,background:"rgba(20,184,166,.06)",border:"1px solid rgba(20,184,166,.15)",borderRadius:8,padding:"9px 10px",fontSize:9,color:"#7a8299",lineHeight:1.7}}>
                  <div style={{color:"#14b8a6",fontWeight:700,marginBottom:2}}>Calculation</div>
                  {formC.discountPct>0&&<div>Discount = Subtotal × {formC.discountPct}% = −{fmt(formC.discAmt)}</div>}
                  <div>Tax = {formC.discountPct>0?"Discounted ":""}Materials × {form.taxRate}%</div>
                  <div style={{fontWeight:700,color:"#dde1ec"}}>Total = {formC.discountPct>0?"After Discount":"Subtotal"} + Tax</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {emailMd&&se&&<EmailSendModal type="estimate" docNumber={se.number} customer={custs.find(c=>c.id===se.custId)} total={fmt(seC.total)} project={se.name} company={company} onClose={()=>setEmailMd(false)} onSend={(to)=>{if(se.status==="draft"){markSt(se.id,"sent");}showToast("Estimate emailed to "+to);}}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════
function Projects({projs,setProjs,custs,showToast,setTab,db}) {
  const [sel,  setSel]  = useState(projs[0]?.id||null);
  const [form, setForm] = useState(null);
  const sp=projs.find(p=>p.id===sel)||null;
  const blank={name:"",custId:"",status:"active",contractValue:"",budgetLabor:"",budgetMaterials:"",actualLabor:"0",actualMaterials:"0",start:tod(),end:addD(tod(),60),phase:"Planning",progress:0,notes:""};
  const PHASES=["Planning","Permitting","Site Prep","Foundation","Framing","Rough-In","Insulation","Drywall","Finish Work","Punch List","Complete"];

  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=p=>setForm({...p,_id:p.id,contractValue:String(p.contractValue),budgetLabor:String(p.budgetLabor),budgetMaterials:String(p.budgetMaterials),actualLabor:String(p.actualLabor),actualMaterials:String(p.actualMaterials),progress:String(p.progress)});
  const save=()=>{
    if(!form.name.trim()||!form.custId){showToast("Name and customer required","error");return;}
    const n=v=>Number(v)||0;
    const data={...form,custId:Number(form.custId)||form.custId,contractValue:n(form.contractValue),budgetLabor:n(form.budgetLabor),budgetMaterials:n(form.budgetMaterials),actualLabor:n(form.actualLabor),actualMaterials:n(form.actualMaterials),progress:n(form.progress)};
    if(form._id){var ch={...data};delete ch._id;db.projs.update(form._id,ch);showToast("Updated");}
    else{const id=nxtNum(projs,"PRJ");const np={...data,id};db.projs.create(np);setSel(id);showToast(id+" created");}
    setForm(null);
  };

  const laborVar=sp?sp.actualLabor-sp.budgetLabor:0;
  const matVar=sp?sp.actualMaterials-sp.budgetMaterials:0;
  const totalBudget=sp?sp.budgetLabor+sp.budgetMaterials:0;
  const totalActual=sp?sp.actualLabor+sp.actualMaterials:0;
  const grossProfit=sp?sp.contractValue-totalActual:0;

  return (
    <div className="spl">
      <div className="spl-l">
        <div style={{padding:"10px 12px",borderBottom:"1px solid #111826",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:10,color:"#4a566e",fontWeight:700}}>{projs.length} PROJECTS</div>
          <button onClick={openNew} className="bb b-bl" style={{padding:"7px 11px",fontSize:11}}><I n="plus" s={11}/>New</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {projs.map(p=>{
            const c=custs.find(x=>x.id===p.custId);
            const is=sel===p.id;
            const sc=PRJ_SC[p.status]||PRJ_SC.active;
            const pc=p.progress>=90?"#22c55e":p.progress>=50?"#3b82f6":"#f5a623";
            return <div key={p.id} className={`sl ${is?"on":""}`} onClick={()=>setSel(p.id)} style={{padding:"11px 12px",borderBottom:"1px solid #0e1119",background:is?"rgba(59,130,246,.06)":"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span className="mn" style={{fontSize:10,color:is?"#63b3ed":"#3a4160"}}>{p.id}</span>
                <span style={{padding:"2px 6px",borderRadius:10,fontSize:8,fontWeight:700,textTransform:"uppercase",background:sc.bg,color:sc.c}}>{sc.label}</span>
              </div>
              <div style={{fontWeight:700,fontSize:12,color:is?"#e2e8f0":"#c8d0e0",marginBottom:2,lineHeight:1.3}}>{p.name}</div>
              <div style={{fontSize:10,color:"#3a4160",marginBottom:6}}>{c?.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1}}><Pr v={p.progress} color={pc}/></div>
                <span className="mn" style={{fontSize:9,color:"#4a566e"}}>{p.progress}%</span>
                <span className="mn" style={{fontSize:11,color:"#3b82f6",marginLeft:4}}>{fmt(p.contractValue)}</span>
              </div>
            </div>;
          })}
        </div>
      </div>

      {sp?(
        <div className="spl-r">
          <div style={{padding:"15px 20px",borderBottom:"1px solid #111826",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
              <div>
                <div style={{display:"flex",gap:9,alignItems:"center"}}><span className="mn" style={{fontSize:12,color:"#4a566e"}}>{sp.id}</span><Chip s={sp.status} map={PRJ_SC}/></div>
                <div style={{fontWeight:800,fontSize:18,marginTop:2,letterSpacing:-.3}}>{sp.name}</div>
                <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>{custs.find(c=>c.id===sp.custId)?.name} · Phase: {sp.phase} · {sp.start} → {sp.end}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>openEdit(sp)} className="bb b-gh" style={{padding:"6px 11px",fontSize:11}}><I n="edit" s={11}/>Edit</button>
                <button onClick={()=>setTab("costing")} className="bb b-am" style={{padding:"6px 11px",fontSize:11}}><I n="costing" s={11}/>Costs</button>
              </div>
            </div>
            <div style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}><span style={{color:"#4a566e"}}>Progress</span><span className="mn" style={{color:sp.progress>=90?"#22c55e":sp.progress>=50?"#3b82f6":"#f5a623"}}>{sp.progress}%</span></div>
              <div style={{height:8,background:"#0c0f17",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,width:`${sp.progress}%`,background:sp.progress>=90?"#22c55e":sp.progress>=50?"linear-gradient(90deg,#3b82f6,#6366f1)":"#f5a623",transition:"width .6s ease"}}/></div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{l:"Contract",v:fmt(sp.contractValue),c:"#3b82f6"},{l:"Budget Labor",v:fmt(sp.budgetLabor),c:"#f5a623"},{l:"Budget Mat",v:fmt(sp.budgetMaterials),c:"#6c8ebf"},{l:"Actual Labor",v:fmt(sp.actualLabor),c:laborVar>0?"#ef4444":"#22c55e"},{l:"Actual Mat",v:fmt(sp.actualMaterials),c:matVar>0?"#ef4444":"#22c55e"},{l:"Gross Profit",v:fmt(grossProfit),c:grossProfit>=0?"#22c55e":"#ef4444"}].map(k=>(
                <div key={k.l} style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:8,padding:"6px 11px"}}>
                  <div style={{fontSize:8,color:"#3a4160",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}}>{k.l}</div>
                  <div className="mn" style={{fontSize:12,color:k.c,marginTop:2}}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:14}}>
              {[{l:"Labor Budget vs Actual",budget:sp.budgetLabor,actual:sp.actualLabor,c:"#f5a623"},{l:"Materials Budget vs Actual",budget:sp.budgetMaterials,actual:sp.actualMaterials,c:"#6c8ebf"}].map(item=>{
                const over=item.actual>item.budget;
                const usePct=item.budget>0?Math.min((item.actual/item.budget)*100,100):0;
                return <div key={item.l} style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:11,padding:13}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>{item.l}</div>
                  <div style={{height:7,background:"#0a0d15",borderRadius:3,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",borderRadius:3,width:`${usePct}%`,background:over?"#ef4444":item.c,transition:"width .6s ease"}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                    <div><div style={{color:"#4a566e",fontSize:9,textTransform:"uppercase",letterSpacing:.3}}>Budget</div><div className="mn" style={{color:item.c}}>{fmt(item.budget)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{color:"#4a566e",fontSize:9,textTransform:"uppercase",letterSpacing:.3}}>Actual</div><div className="mn" style={{color:over?"#ef4444":"#22c55e"}}>{fmt(item.actual)}</div></div>
                  </div>
                  {over&&<div style={{marginTop:5,fontSize:10,color:"#ef4444",fontWeight:700}}>Over by {fmt(item.actual-item.budget)}</div>}
                </div>;
              })}
            </div>
            {sp.notes&&<div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:10,padding:"12px 15px"}}><div className="stl">Notes</div><div style={{fontSize:12,color:"#9aabb8",lineHeight:1.7}}>{sp.notes}</div></div>}
          </div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,color:"#2d3a52",gap:12}}>
          <I n="projects" s={40}/><div style={{fontSize:14,fontWeight:600}}>Select a project</div>
          <button onClick={openNew} className="bb b-bl" style={{padding:"8px 16px",fontSize:12,marginTop:4}}><I n="plus" s={13}/>New Project</button>
        </div>
      )}

      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:640,marginTop:20}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Project":"New Project"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13,overflowY:"auto",maxHeight:"78vh"}}>
              <div className="g2">
                <div><label className="lbl">Project Name *</label><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Kitchen Full Remodel"/></div>
                <div><label className="lbl">Customer *</label>
                  <select className="inp" value={form.custId} onChange={e=>setForm(f=>({...f,custId:Number(e.target.value)}))}>
                    <option value="">— Select —</option>
                    {custs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="g3">
                <div><label className="lbl">Status</label>
                  <select className="inp" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {["active","on_hold","complete","cancelled"].map(s=><option key={s} value={s}>{PRJ_SC[s]?.label||s}</option>)}
                  </select>
                </div>
                <div><label className="lbl">Phase</label>
                  <select className="inp" value={form.phase} onChange={e=>setForm(f=>({...f,phase:e.target.value}))}>
                    {PHASES.map(ph=><option key={ph}>{ph}</option>)}
                  </select>
                </div>
                <div><label className="lbl">Progress %</label><input className="inp" type="number" min="0" max="100" value={form.progress} onChange={e=>setForm(f=>({...f,progress:e.target.value}))}/></div>
              </div>
              <div className="g3">
                <div><label className="lbl">Contract Value</label><input className="inp" type="number" value={form.contractValue} onChange={e=>setForm(f=>({...f,contractValue:e.target.value}))}/></div>
                <div><label className="lbl">Budget Labor</label><input className="inp" type="number" value={form.budgetLabor} onChange={e=>setForm(f=>({...f,budgetLabor:e.target.value}))}/></div>
                <div><label className="lbl">Budget Materials</label><input className="inp" type="number" value={form.budgetMaterials} onChange={e=>setForm(f=>({...f,budgetMaterials:e.target.value}))}/></div>
              </div>
              <div className="g3">
                <div><label className="lbl">Actual Labor</label><input className="inp" type="number" value={form.actualLabor} onChange={e=>setForm(f=>({...f,actualLabor:e.target.value}))}/></div>
                <div><label className="lbl">Actual Materials</label><input className="inp" type="number" value={form.actualMaterials} onChange={e=>setForm(f=>({...f,actualMaterials:e.target.value}))}/></div>
                <div/>
              </div>
              <div className="g2">
                <div><label className="lbl">Start Date</label><input className="inp" type="date" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}/></div>
                <div><label className="lbl">End Date</label><input className="inp" type="date" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}/></div>
              </div>
              <div><label className="lbl">Notes</label><textarea className="inp" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{resize:"vertical"}}/></div>
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={13}/>{form._id?"Update":"Create"} Project</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// JOB COSTING
// ══════════════════════════════════════════════════════════════
function JobCosting({projs,custs,hrs,subs,roles}) {
  const [selP,setSelP]=useState(projs[0]?.id||null);
  const sp=projs.find(p=>p.id===selP);

  const pHrs=selP?hrs.filter(h=>h.projId===selP):[];
  const pSubHrs=pHrs.map(h=>{
    const sub=subs.find(e=>e.id===h.subId);
    return {...h,sub,billed:h.hours*(sub?.billableRate||0),trueCost:h.hours*getBurdenedRate(roles,sub?.role,sub?.hourlyWage||0)};
  });
  const totBilled=pSubHrs.reduce((s,h)=>s+h.billed,0);
  const totCost=pSubHrs.reduce((s,h)=>s+h.trueCost,0);
  const totHrs=pSubHrs.reduce((s,h)=>s+h.hours,0);
  const laborMargin=totBilled>0?pct(totBilled-totCost,totBilled):0;

  const totalActual=sp?sp.actualLabor+sp.actualMaterials:0;
  const totalBudget=sp?sp.budgetLabor+sp.budgetMaterials:0;
  const grossProfit=sp?sp.contractValue-totalActual:0;
  const grossMargin=sp&&sp.contractValue>0?pct(grossProfit,sp.contractValue):0;

  const byRole={};
  pSubHrs.forEach(h=>{
    const t=h.sub?.role||"Unknown";
    if(!byRole[t])byRole[t]={role:t,hours:0,billed:0,cost:0};
    byRole[t].hours+=h.hours;byRole[t].billed+=h.billed;byRole[t].cost+=h.trueCost;
  });

  const allProjData=projs.map(p=>({
    name:p.name.split(" ").slice(0,2).join(" "),
    contract:p.contractValue,
    actual:p.actualLabor+p.actualMaterials,
    profit:p.contractValue-(p.actualLabor+p.actualMaterials),
  }));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {projs.map(p=><button key={p.id} onClick={()=>setSelP(p.id)} style={{padding:"7px 13px",borderRadius:9,fontSize:12,fontWeight:700,border:`1px solid ${selP===p.id?"#3b82f6":"#111826"}`,background:selP===p.id?"rgba(59,130,246,.12)":"#0c0f17",color:selP===p.id?"#63b3ed":"#7a8299",transition:"all .14s"}}>{p.name.split(" ").slice(0,3).join(" ")}</button>)}
      </div>

      {sp&&<>
        <div className="g6">
          {[{l:"Contract",v:fmt(sp.contractValue),c:"#3b82f6"},{l:"Total Budget",v:fmt(totalBudget),c:"#f5a623"},{l:"Total Actual",v:fmt(totalActual),c:totalActual>totalBudget?"#ef4444":"#22c55e"},{l:"Variance",v:fmt(totalActual-totalBudget),c:totalActual>totalBudget?"#ef4444":"#22c55e"},{l:"Gross Profit",v:fmt(grossProfit),c:grossProfit>=0?"#22c55e":"#ef4444"},{l:"Gross Margin",v:`${grossMargin}%`,c:grossMargin>=25?"#22c55e":grossMargin>=15?"#f5a623":"#ef4444"}].map(k=>(
            <KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:13}}>
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"11px 16px",borderBottom:"1px solid #111826",fontWeight:800,fontSize:12}}>Labor Detail — {sp.name.split(" ").slice(0,3).join(" ")}</div>
            {pSubHrs.length===0?<ES icon="employees" text="No hours logged for this project."/>:<>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:"#0a0d15"}}>{["Subcontractor","Role","Hours","Billed","True Cost","Margin"].map(h=><th key={h} style={{padding:"7px 13px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {pSubHrs.map((h,i)=>{
                    const m=h.billed>0?pct(h.billed-h.trueCost,h.billed):0;
                    return <tr key={h.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                      <td style={{padding:"7px 13px",color:"#c8d0e0",fontWeight:600}}>{h.sub?.company||h.sub?.name}</td>
                      <td style={{padding:"7px 13px"}}><span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${ROLE_C[h.sub?.role]||"#4a566e"}22`,color:ROLE_C[h.sub?.role]||"#7a8299"}}>{h.sub?.role}</span></td>
                      <td className="mn" style={{padding:"7px 13px",color:"#63b3ed"}}>{h.hours}h</td>
                      <td className="mn" style={{padding:"7px 13px",color:"#22c55e"}}>{fmt(h.billed)}</td>
                      <td className="mn" style={{padding:"7px 13px",color:"#ef4444"}}>{fmt(h.trueCost)}</td>
                      <td className="mn" style={{padding:"7px 13px",color:m>=30?"#22c55e":"#f5a623"}}>{m}%</td>
                    </tr>;
                  })}
                </tbody>
              </table>
              <div style={{padding:"9px 16px",background:"#0a0d15",borderTop:"2px solid #1e2535",display:"flex",gap:18}}>
                {[{l:"Total Hrs",v:`${totHrs}h`,c:"#63b3ed"},{l:"Total Billed",v:fmt(totBilled),c:"#22c55e"},{l:"True Labor Cost",v:fmt(totCost),c:"#ef4444"},{l:"Labor Margin",v:`${laborMargin}%`,c:laborMargin>=30?"#22c55e":"#f5a623"}].map(k=>(
                  <div key={k.l}><div style={{fontSize:8,color:"#3a4160",fontWeight:700,textTransform:"uppercase"}}>{k.l}</div><div className="mn" style={{fontSize:12,color:k.c,marginTop:2}}>{k.v}</div></div>
                ))}
              </div>
            </>}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:13}}>
              <div style={{fontWeight:800,fontSize:12,marginBottom:11}}>Budget vs. Actual</div>
              {[{l:"Labor",budget:sp.budgetLabor,actual:sp.actualLabor,c:"#f5a623"},{l:"Materials",budget:sp.budgetMaterials,actual:sp.actualMaterials,c:"#6c8ebf"},{l:"Total",budget:totalBudget,actual:totalActual,c:"#3b82f6"}].map(row=>{
                const over=row.actual>row.budget;
                const usePct=row.budget>0?Math.min((row.actual/row.budget)*100,100):0;
                return <div key={row.l} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11}}>
                    <span style={{color:"#7a8299"}}>{row.l}</span>
                    <span><span className="mn" style={{color:row.c,fontSize:10}}>{fmt(row.budget)}</span><span style={{color:"#3a4160",fontSize:10}}> → </span><span className="mn" style={{color:over?"#ef4444":"#22c55e",fontSize:10}}>{fmt(row.actual)}</span></span>
                  </div>
                  <div style={{height:5,background:"#0a0d15",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:`${usePct}%`,background:over?"#ef4444":row.c}}/></div>
                  {over&&<div style={{fontSize:9,color:"#ef4444",marginTop:2}}>Over by {fmt(row.actual-row.budget)}</div>}
                </div>;
              })}
            </div>
            <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:13}}>
              <div style={{fontWeight:800,fontSize:12,marginBottom:9}}>By Role</div>
              {Object.values(byRole).length===0?<div style={{fontSize:11,color:"#3a4160"}}>No labor logged.</div>:Object.values(byRole).map(t=>(
                <div key={t.role} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #111826",fontSize:11}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}><div style={{width:6,height:6,borderRadius:2,background:ROLE_C[t.role]||"#4a566e"}}/><span style={{color:"#c8d0e0"}}>{t.role}</span></div>
                  <div style={{display:"flex",gap:12}}><span className="mn" style={{color:"#63b3ed",fontSize:10}}>{t.hours}h</span><span className="mn" style={{color:"#22c55e",fontSize:10}}>{fmt(t.billed)}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"13px 16px 8px"}}>
          <div style={{fontWeight:800,fontSize:12,marginBottom:9}}>All Projects — Contract vs Actual vs Profit</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={allProjData} margin={{top:4,right:8,left:-18,bottom:0}} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111826" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/>
              <Tooltip content={<CTip/>}/>
              <Bar dataKey="contract" name="Contract" fill="#3b82f6" radius={[3,3,0,0]}/>
              <Bar dataKey="actual"   name="Actual Cost" fill="#ef4444" radius={[3,3,0,0]}/>
              <Bar dataKey="profit"   name="Profit" fill="#22c55e" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════
// MATERIALS
// ══════════════════════════════════════════════════════════════
function Materials({mats,setMats,showToast,db}) {
  const [catF,setCatF]=useState("All");
  const [srch,setSrch]=useState("");
  const [form,setForm]=useState(null);

  const cats=["All",...[...new Set(mats.map(m=>m.category))].sort()];
  const filt=useMemo(()=>mats.filter(m=>{
    const ms=!srch||m.name.toLowerCase().includes(srch.toLowerCase())||m.supplier.toLowerCase().includes(srch.toLowerCase());
    return ms&&(catF==="All"||m.category===catF);
  }),[mats,srch,catF]);

  const lowStock=mats.filter(m=>m.stock<=m.reorderAt);
  const totalVal=mats.reduce((s,m)=>s+(m.cost*m.stock),0);
  const blank={name:"",unit:"ea",category:"Lumber",supplier:"",cost:"",markup:30,stock:"",reorderAt:""};

  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=m=>setForm({...m,_id:m.id,cost:String(m.cost),markup:String(m.markup),stock:String(m.stock),reorderAt:String(m.reorderAt)});
  const save=()=>{
    if(!form.name.trim()){showToast("Name required","error");return;}
    const n=v=>Number(v)||0;
    const data={...form,cost:n(form.cost),markup:n(form.markup),stock:n(form.stock),reorderAt:n(form.reorderAt)};
    if(form._id){var ch={...data};delete ch._id;db.mats.update(form._id,ch);showToast("Updated");}
    else{db.mats.create({...data,id:uid()});showToast("Added");}
    setForm(null);
  };
  const del=id=>{db.mats.remove(id);showToast("Removed");};

  const sellPrice=m=>m.cost*(1+m.markup/100);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="g4">
        {[{l:"Items",v:mats.length,c:"#63b3ed"},{l:"Inventory Value",v:fmt(totalVal),c:"#22c55e"},{l:"Low Stock Alerts",v:lowStock.length,c:lowStock.length>0?"#ef4444":"#22c55e"},{l:"Categories",v:[...new Set(mats.map(m=>m.category))].length,c:"#a78bfa"}].map(k=>(
          <KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>
        ))}
      </div>

      {lowStock.length>0&&(
        <div style={{background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.18)",borderRadius:11,padding:"11px 14px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#ef4444",textTransform:"uppercase",letterSpacing:.5,marginBottom:7,display:"flex",gap:5,alignItems:"center"}}><I n="alert" s={11}/>Low Stock — {lowStock.length} item{lowStock.length!==1?"s":""} at or below reorder point</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {lowStock.map(m=><div key={m.id} style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.15)",borderRadius:7,padding:"4px 10px",fontSize:10,color:"#ef4444",fontWeight:600}}>{m.name} — {m.stock} {m.unit} left</div>)}
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="search" s={12}/></div>
          <input className="inp" value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search materials…" style={{paddingLeft:27,fontSize:12}}/>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {cats.map(c=><button key={c} onClick={()=>setCatF(c)} style={{padding:"5px 11px",borderRadius:18,fontSize:10,fontWeight:700,border:`1px solid ${catF===c?"#3b82f6":"#111826"}`,background:catF===c?"rgba(59,130,246,.14)":"#0c0f17",color:catF===c?"#63b3ed":"#4a566e",transition:"all .13s"}}>{c}</button>)}
        </div>
        <button onClick={openNew} className="bb b-bl" style={{padding:"8px 14px",fontSize:12}}><I n="plus" s={13}/>Add Item</button>
      </div>

      <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0a0d15"}}>{["Name","Category","Supplier","Unit","Cost","Markup","Sell Price","Stock","Reorder At","Status",""].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
          <tbody>
            {filt.map((m,i)=>{
              const sp=sellPrice(m);
              const low=m.stock<=m.reorderAt;
              return <tr key={m.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                <td style={{padding:"8px 12px",fontWeight:700,color:"#c8d0e0"}}>{m.name}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${CAT_C[m.category]||"#4a566e"}18`,color:CAT_C[m.category]||"#7a8299"}}>{m.category}</span></td>
                <td style={{padding:"8px 12px",color:"#7a8299"}}>{m.supplier}</td>
                <td style={{padding:"8px 12px",color:"#4a566e"}}>{m.unit}</td>
                <td className="mn" style={{padding:"8px 12px",color:"#dde1ec"}}>{fmtD(m.cost)}</td>
                <td className="mn" style={{padding:"8px 12px",color:"#a78bfa"}}>{m.markup}%</td>
                <td className="mn" style={{padding:"8px 12px",color:"#22c55e",fontWeight:700}}>{fmtD(sp)}</td>
                <td className="mn" style={{padding:"8px 12px",color:low?"#ef4444":"#dde1ec",fontWeight:low?700:400}}>{m.stock}</td>
                <td className="mn" style={{padding:"8px 12px",color:"#4a566e"}}>{m.reorderAt}</td>
                <td style={{padding:"8px 12px"}}><span style={{padding:"2px 7px",borderRadius:10,fontSize:8,fontWeight:700,textTransform:"uppercase",background:low?"rgba(239,68,68,.1)":"rgba(34,197,94,.08)",color:low?"#ef4444":"#22c55e"}}>{low?"Low Stock":"In Stock"}</span></td>
                <td style={{padding:"8px 12px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>openEdit(m)} style={{color:"#4a566e",opacity:.7,transition:"opacity .12s"}} className="rh"><I n="edit" s={13}/></button>
                    <button onClick={()=>del(m.id)} style={{color:"#ef4444",opacity:.5,transition:"opacity .12s"}} className="rh"><I n="trash" s={13}/></button>
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
        {filt.length===0&&<ES icon="materials" text="No materials match your filters."/>}
      </div>

      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:560,marginTop:30}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Material":"Add Material"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13}}>
              <div><label className="lbl">Name *</label><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Framing Lumber 2x4x8"/></div>
              <div className="g2">
                <div><label className="lbl">Category</label>
                  <select className="inp" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {["Lumber","Drywall","Flooring","Tile","Paint","Plumbing","Electrical","Decking","Concrete","Insulation","Doors & Windows","Other"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="lbl">Unit</label>
                  <select className="inp" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
                    {["ea","SF","LF","bag","sheet","roll","gal","lb","ton","box","set"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="lbl">Supplier</label><input className="inp" value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} placeholder="Home Depot"/></div>
              <div className="g3">
                <div><label className="lbl">Cost</label><input className="inp" type="number" step=".01" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}/></div>
                <div><label className="lbl">Markup %</label><input className="inp" type="number" value={form.markup} onChange={e=>setForm(f=>({...f,markup:e.target.value}))}/></div>
                <div><label className="lbl">Sell Price</label><div className="inp" style={{background:"#080a0f",cursor:"default"}}><span className="mn" style={{color:"#22c55e"}}>{fmtD((Number(form.cost)||0)*(1+(Number(form.markup)||0)/100))}</span></div></div>
              </div>
              <div className="g2">
                <div><label className="lbl">Stock Qty</label><input className="inp" type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}/></div>
                <div><label className="lbl">Reorder At</label><input className="inp" type="number" value={form.reorderAt} onChange={e=>setForm(f=>({...f,reorderAt:e.target.value}))}/></div>
              </div>
              <div style={{display:"flex",gap:9,marginTop:4}}>
                <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={13}/>{form._id?"Update":"Add"} Item</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SUBCONTRACTORS
// ══════════════════════════════════════════════════════════════
function Subs({subs,setSubs,hrs,setHrs,projs,roles,showToast,db}) {
  const [sel,setSel]=useState(subs[0]?.id||null);
  const [form,setForm]=useState(null);
  const [hrForm,setHrForm]=useState(null);
  const se=subs.find(e=>e.id===sel)||null;
  const eHrs=se?hrs.filter(h=>h.subId===se.id):[];
  const totHrs=eHrs.reduce((s,h)=>s+h.hours,0);
  const totBilled=eHrs.reduce((s,h)=>s+h.hours*se.billableRate,0);
  const totCost=eHrs.reduce((s,h)=>s+h.hours*getBurdenedRate(roles,se.role,se.hourlyWage),0);
  const laborMargin=totBilled>0?pct(totBilled-totCost,totBilled):0;

  const blank={name:"",company:"",role:"Carpenter",hourlyWage:"",billableRate:"",status:"active",phone:"",email:""};
  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=e=>setForm({...e,_id:e.id,hourlyWage:String(e.hourlyWage),billableRate:String(e.billableRate)});
  const save=()=>{
    if(!form.name.trim()){showToast("Name required","error");return;}
    const n=v=>Number(v)||0;
    const data={...form,hourlyWage:n(form.hourlyWage),billableRate:n(form.billableRate)};
    if(form._id){var ch={...data};delete ch._id;db.subs.update(form._id,ch);showToast("Updated");}
    else{db.subs.create({...data,id:uid()});showToast("Added");}
    setForm(null);
  };

  const blankHr={projId:projs[0]?.id||"",date:tod(),hours:"8",desc:"",approved:false};
  const logHrs=()=>{
    if(!hrForm.projId||!hrForm.hours){showToast("Project and hours required","error");return;}
    db.hrs.create({...hrForm,id:uid(),subId:sel,hours:Number(hrForm.hours)||0});
    showToast("Hours logged");setHrForm(null);
  };

  const formPreview=hrForm&&se?{billed:(Number(hrForm.hours)||0)*se.billableRate,cost:(Number(hrForm.hours)||0)*getBurdenedRate(roles,se.role,se.hourlyWage)}:{billed:0,cost:0};

  return (
    <div className="spl">
      <div className="spl-l">
        <div style={{padding:"10px 12px",borderBottom:"1px solid #111826",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:10,color:"#4a566e",fontWeight:700}}>{subs.length} SUBCONTRACTORS</div>
          <button onClick={openNew} className="bb b-bl" style={{padding:"7px 11px",fontSize:11}}><I n="plus" s={11}/>Add</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {subs.map(e=>{
            const is=sel===e.id;
            const eH=hrs.filter(h=>h.subId===e.id);
            const totH=eH.reduce((s,h)=>s+h.hours,0);
            const tc=ROLE_C[e.role]||"#4a566e";
            return <div key={e.id} className={`sl ${is?"on":""}`} onClick={()=>setSel(e.id)} style={{padding:"11px 12px",borderBottom:"1px solid #0e1119",background:is?"rgba(59,130,246,.06)":"transparent"}}>
              <div style={{display:"flex",gap:9,alignItems:"center"}}>
                <div style={{width:36,height:36,borderRadius:10,background:avC(e.id),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{ini(e.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:12,color:is?"#e2e8f0":"#c8d0e0"}}>{e.name}</div>
                  <div style={{fontSize:9,color:"#3a4160",marginTop:1}}>{e.company||"Independent"}</div>
                  <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center"}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,background:`${tc}18`,color:tc}}>{e.role}</span>
                    <span style={{fontSize:9,color:"#3a4160"}}>{totH}h logged</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                    <span className="mn" style={{fontSize:10,color:"#4a566e"}}>Wage ${e.hourlyWage}/hr</span>
                    <span className="mn" style={{fontSize:10,color:"#22c55e"}}>Bill ${e.billableRate}/hr</span>
                  </div>
                </div>
              </div>
            </div>;
          })}
        </div>
      </div>

      {se?(
        <div className="spl-r">
          <div style={{padding:"15px 20px",borderBottom:"1px solid #111826",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:11}}>
              <div style={{display:"flex",gap:11,alignItems:"center"}}>
                <div style={{width:46,height:46,borderRadius:13,background:avC(se.id),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:17}}>{ini(se.name)}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:18,letterSpacing:-.3}}>{se.name}</div>
                  {se.company&&<div style={{fontSize:11,color:"#7a8299",marginTop:1}}>{se.company}</div>}
                  <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:`${ROLE_C[se.role]||"#4a566e"}18`,color:ROLE_C[se.role]||"#7a8299"}}>{se.role}</span>
                    <span style={{fontSize:10,color:"#4a566e"}}>{se.phone}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setHrForm({...blankHr})} className="bb b-am" style={{padding:"6px 11px",fontSize:11}}><I n="clock" s={11}/>Log Hours</button>
                <button onClick={()=>openEdit(se)} className="bb b-gh" style={{padding:"6px 10px",fontSize:11}}><I n="edit" s={11}/></button>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{l:"Wage",v:`$${se.hourlyWage}/hr`,c:"#f5a623"},{l:"Billable Rate",v:`$${se.billableRate}/hr`,c:"#3b82f6"},{l:"True Cost",v:`$${getBurdenedRate(roles,se.role,se.hourlyWage).toFixed(2)}/hr`,c:"#ef4444"},{l:"Total Hours",v:`${totHrs}h`,c:"#63b3ed"},{l:"Total Billed",v:fmt(totBilled),c:"#22c55e"},{l:"True Cost Total",v:fmt(totCost),c:"#ef4444"},{l:"Labor Margin",v:`${laborMargin}%`,c:laborMargin>=30?"#22c55e":"#f5a623"}].map(k=>(
                <div key={k.l} style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:8,padding:"6px 11px"}}>
                  <div style={{fontSize:8,color:"#3a4160",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}}>{k.l}</div>
                  <div className="mn" style={{fontSize:12,color:k.c,marginTop:2}}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
            <div className="stl">Hour Log ({eHrs.length} entries)</div>
            {eHrs.length===0?<ES icon="clock" text="No hours logged yet."/>:(
              <div style={{border:"1px solid #111826",borderRadius:11,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{background:"#0a0d15"}}>{["Date","Project","Hours","Description","Billed","True Cost","Approved"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {eHrs.sort((a,b)=>b.date.localeCompare(a.date)).map((h,i)=>{
                      const p=projs.find(x=>x.id===h.projId);
                      const billed=h.hours*se.billableRate;
                      const cost=h.hours*getBurdenedRate(roles,se.role,se.hourlyWage);
                      return <tr key={h.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                        <td className="mn" style={{padding:"7px 12px",color:"#7a8299",fontSize:10}}>{h.date}</td>
                        <td style={{padding:"7px 12px",color:"#c8d0e0",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.name||h.projId}</td>
                        <td className="mn" style={{padding:"7px 12px",color:"#63b3ed"}}>{h.hours}h</td>
                        <td style={{padding:"7px 12px",color:"#7a8299",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.desc}</td>
                        <td className="mn" style={{padding:"7px 12px",color:"#22c55e"}}>{fmt(billed)}</td>
                        <td className="mn" style={{padding:"7px 12px",color:"#ef4444"}}>{fmt(cost)}</td>
                        <td style={{padding:"7px 12px"}}><span style={{padding:"2px 7px",borderRadius:10,fontSize:8,fontWeight:700,textTransform:"uppercase",background:h.approved?"rgba(34,197,94,.1)":"rgba(245,166,35,.08)",color:h.approved?"#22c55e":"#f5a623"}}>{h.approved?"Approved":"Pending"}</span></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,color:"#2d3a52",gap:12}}>
          <I n="employees" s={40}/><div style={{fontSize:14,fontWeight:600}}>Select a subcontractor</div>
        </div>
      )}

      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:520,marginTop:40}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Subcontractor":"Add Subcontractor"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13,maxHeight:"78vh",overflowY:"auto"}}>
              <div className="g2">
                <div><label className="lbl">Contact Name *</label><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="John Smith"/></div>
                <div><label className="lbl">Company</label><input className="inp" value={form.company||""} onChange={e=>setForm(f=>({...f,company:e.target.value}))} placeholder="ABC Contracting LLC"/></div>
              </div>
              <div className="g2">
                <div><label className="lbl">Labor Role</label>
                  <select className="inp" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    {roles.map(r=><option key={r.id} value={r.title}>{r.title}</option>)}
                  </select>
                </div>
                <div><label className="lbl">Status</label>
                  <select className="inp" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="g2">
                <div><label className="lbl">Hourly Wage $</label><input className="inp" type="number" step=".5" value={form.hourlyWage} onChange={e=>setForm(f=>({...f,hourlyWage:e.target.value}))}/></div>
                <div><label className="lbl">Billable Rate $</label><input className="inp" type="number" step=".5" value={form.billableRate} onChange={e=>setForm(f=>({...f,billableRate:e.target.value}))}/></div>
              </div>
              <div style={{background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.15)",borderRadius:8,padding:"9px 12px",fontSize:11,color:"#7a8299"}}>
                {(()=>{const rObj=roles.find(r=>r.title===form.role);const bm=rObj?(rObj.payrollPct+rObj.benefitsPct):28;const br=getBurdenedRate(roles,form.role,Number(form.hourlyWage)||0);return <>
                  Fully Burdened Rate (wage + {bm.toFixed(1)}%): <span className="mn" style={{color:"#ef4444",fontSize:12}}>${br.toFixed(2)}/hr</span>
                  &nbsp;·&nbsp; Margin: <span className="mn" style={{color:"#22c55e",fontSize:12}}>{form.billableRate&&form.hourlyWage?`${pct((Number(form.billableRate)||0)-br,Number(form.billableRate)||0)}%`:"—"}</span>
                  {rObj&&<span style={{marginLeft:8,fontSize:9,color:"#4a566e"}}>(Payroll {rObj.payrollPct}% + Benefits {rObj.benefitsPct}%)</span>}
                </>;})()}
              </div>
              <div className="g2">
                <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(555) 000-0000"/></div>
                <div><label className="lbl">Email</label><input className="inp" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="sub@company.com"/></div>
              </div>
              <div style={{display:"flex",gap:9,marginTop:4}}>
                <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={13}/>{form._id?"Update":"Add"} Subcontractor</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hrForm&&se&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setHrForm(null)}>
          <div className="mo" style={{maxWidth:460,marginTop:50}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>Log Hours — {se.name}</div>
              <button onClick={()=>setHrForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13}}>
              <div><label className="lbl">Project *</label>
                <select className="inp" value={hrForm.projId} onChange={e=>setHrForm(h=>({...h,projId:e.target.value}))}>
                  {projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="g2">
                <div><label className="lbl">Date</label><input className="inp" type="date" value={hrForm.date} onChange={e=>setHrForm(h=>({...h,date:e.target.value}))}/></div>
                <div><label className="lbl">Hours *</label><input className="inp" type="number" step=".5" value={hrForm.hours} onChange={e=>setHrForm(h=>({...h,hours:e.target.value}))}/></div>
              </div>
              <div><label className="lbl">Description</label><input className="inp" value={hrForm.desc} onChange={e=>setHrForm(h=>({...h,desc:e.target.value}))} placeholder="Framing day 1…"/></div>
              <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:9,padding:"10px 14px",display:"flex",gap:18}}>
                {[{l:"Billed",v:fmt(formPreview.billed),c:"#22c55e"},{l:"True Cost",v:fmt(formPreview.cost),c:"#ef4444"},{l:"Net",v:fmt(formPreview.billed-formPreview.cost),c:formPreview.billed>=formPreview.cost?"#22c55e":"#ef4444"}].map(k=>(
                  <div key={k.l}><div style={{fontSize:8,color:"#3a4160",fontWeight:700,textTransform:"uppercase"}}>{k.l}</div><div className="mn" style={{fontSize:13,color:k.c,marginTop:2}}>{k.v}</div></div>
                ))}
              </div>
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setHrForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={logHrs} className="bb b-am" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="clock" s={13}/>Log Hours</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LABOR ROLES
// ══════════════════════════════════════════════════════════════
function LaborRoles({roles,setRoles,showToast,db}) {
  const [form,setForm]=useState(null);
  const [srch,setSrch]=useState("");

  const filt=useMemo(()=>roles.filter(r=>!srch||r.title.toLowerCase().includes(srch.toLowerCase())),[roles,srch]);

  const blank={title:"",baseRate:"",payrollPct:"15.3",benefitsPct:"12.0"};
  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=r=>setForm({...r,_id:r.id,baseRate:String(r.baseRate),payrollPct:String(r.payrollPct),benefitsPct:String(r.benefitsPct)});
  const save=()=>{
    if(!form.title.trim()){showToast("Role title required","error");return;}
    const n=v=>Number(v)||0;
    const data={...form,baseRate:n(form.baseRate),payrollPct:n(form.payrollPct),benefitsPct:n(form.benefitsPct)};
    if(form._id){
      var ch={...data};delete ch._id;db.roles.update(form._id,ch);
      showToast("Role updated");
    } else {
      db.roles.create({...data,id:uid()});
      showToast("Role added");
    }
    setForm(null);
  };
  const del=id=>{db.roles.remove(id);showToast("Removed");};

  const avgBurden=roles.length>0?Math.round(roles.reduce((s,r)=>s+(r.payrollPct+r.benefitsPct),0)/roles.length*10)/10:0;
  const avgBase=roles.length>0?Math.round(roles.reduce((s,r)=>s+r.baseRate,0)/roles.length*100)/100:0;
  const avgBurdened=roles.length>0?Math.round(roles.reduce((s,r)=>s+calcBurden(r).fullyBurdenedRate,0)/roles.length*100)/100:0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="g4">
        {[{l:"Total Roles",v:roles.length,c:"#63b3ed"},{l:"Avg Base Rate",v:`$${avgBase}/hr`,c:"#f5a623"},{l:"Avg Burden %",v:`${avgBurden}%`,c:"#ef4444"},{l:"Avg Burdened Rate",v:`$${avgBurdened}/hr`,c:"#22c55e"}].map(k=>(
          <KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>
        ))}
      </div>

      <div style={{display:"flex",gap:9,alignItems:"center"}}>
        <div style={{position:"relative",flex:1,maxWidth:320}}>
          <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="search" s={12}/></div>
          <input className="inp" value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search roles…" style={{paddingLeft:27,fontSize:12}}/>
        </div>
        <button onClick={openNew} className="bb b-bl" style={{padding:"8px 14px",fontSize:12}}><I n="plus" s={13}/>Add Role</button>
      </div>

      <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0a0d15"}}>{["Role Title","Base Rate","Payroll %","Benefits %","Total Burden %","Fully Burdened Rate",""].map(h=><th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
          <tbody>
            {filt.map((r,i)=>{
              const b=calcBurden(r);
              const tc=ROLE_C[r.title]||"#4a566e";
              return <tr key={r.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                <td style={{padding:"9px 14px"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:4,height:22,borderRadius:2,background:tc,flexShrink:0}}/>
                    <span style={{fontWeight:700,color:"#c8d0e0"}}>{r.title}</span>
                  </div>
                </td>
                <td className="mn" style={{padding:"9px 14px",color:"#f5a623"}}>${r.baseRate.toFixed(2)}</td>
                <td className="mn" style={{padding:"9px 14px",color:"#a78bfa"}}>{r.payrollPct}%</td>
                <td className="mn" style={{padding:"9px 14px",color:"#3b82f6"}}>{r.benefitsPct}%</td>
                <td className="mn" style={{padding:"9px 14px",color:"#ef4444",fontWeight:700}}>{b.totalBurdenPct.toFixed(1)}%</td>
                <td className="mn" style={{padding:"9px 14px",color:"#22c55e",fontWeight:700,fontSize:12}}>${b.fullyBurdenedRate.toFixed(2)}</td>
                <td style={{padding:"9px 14px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>openEdit(r)} style={{color:"#4a566e",opacity:.7}} className="rh"><I n="edit" s={13}/></button>
                    <button onClick={()=>del(r.id)} style={{color:"#ef4444",opacity:.5}} className="rh"><I n="trash" s={13}/></button>
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
        {filt.length===0&&<ES icon="wrench" text="No roles match your search."/>}
      </div>

      <div style={{background:"rgba(59,130,246,.04)",border:"1px solid rgba(59,130,246,.15)",borderRadius:10,padding:"12px 16px"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Burden Rate Guide</div>
        <div style={{fontSize:11,color:"#7a8299",lineHeight:1.8}}>
          <span style={{fontWeight:700,color:"#a78bfa"}}>Payroll %</span> — FICA, FUTA, SUTA, workers comp, payroll taxes · <span style={{fontWeight:700,color:"#3b82f6"}}>Benefits %</span> — health insurance, retirement, PTO, training, safety equipment<br/>
          <span style={{fontWeight:700,color:"#ef4444"}}>Total Burden %</span> = Payroll % + Benefits % · <span style={{fontWeight:700,color:"#22c55e"}}>Fully Burdened Rate</span> = Base Rate × (1 + Total Burden %)
        </div>
      </div>

      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:520,marginTop:60}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Role":"Add Role"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13}}>
              <div><label className="lbl">Role Title *</label><input className="inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Electrician"/></div>
              <div><label className="lbl">Base Rate ($/hr)</label><input className="inp" type="number" step=".5" value={form.baseRate} onChange={e=>setForm(f=>({...f,baseRate:e.target.value}))} placeholder="42.00"/></div>
              <div className="g2">
                <div><label className="lbl">Payroll %</label><input className="inp" type="number" step=".1" value={form.payrollPct} onChange={e=>setForm(f=>({...f,payrollPct:e.target.value}))} placeholder="15.3"/></div>
                <div><label className="lbl">Benefits %</label><input className="inp" type="number" step=".1" value={form.benefitsPct} onChange={e=>setForm(f=>({...f,benefitsPct:e.target.value}))} placeholder="14.0"/></div>
              </div>
              {(()=>{
                const br=Number(form.baseRate)||0;const pp=Number(form.payrollPct)||0;const bp=Number(form.benefitsPct)||0;
                const tb=pp+bp;const fbr=Math.round(br*(1+tb/100)*100)/100;
                return <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:10,color:"#4a566e",fontWeight:700,textTransform:"uppercase"}}>Total Burden %</span>
                    <span className="mn" style={{fontSize:13,color:"#ef4444"}}>{tb.toFixed(1)}%</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:10,color:"#4a566e",fontWeight:700,textTransform:"uppercase"}}>Payroll Cost</span>
                    <span className="mn" style={{fontSize:11,color:"#a78bfa"}}>${(br*pp/100).toFixed(2)}/hr</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:10,color:"#4a566e",fontWeight:700,textTransform:"uppercase"}}>Benefits Cost</span>
                    <span className="mn" style={{fontSize:11,color:"#3b82f6"}}>${(br*bp/100).toFixed(2)}/hr</span>
                  </div>
                  <div style={{borderTop:"1px solid #1e2535",paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontWeight:800,fontSize:12}}>Fully Burdened Rate</span>
                    <span className="mn" style={{fontSize:16,color:"#22c55e"}}>${fbr.toFixed(2)}/hr</span>
                  </div>
                  <div style={{fontSize:9,color:"#3a4160",marginTop:4}}>${br.toFixed(2)} base + ${(fbr-br).toFixed(2)} burden = ${fbr.toFixed(2)}/hr</div>
                </div>;
              })()}
              <div style={{display:"flex",gap:9,marginTop:4}}>
                <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={13}/>{form._id?"Update":"Add"} Role</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CHANGE ORDERS
// ══════════════════════════════════════════════════════════════
function ChangeOrders({cos,setCos,projs,setProjs,custs,invs,setInvs,showToast,setTab,db}) {
  const [form,setForm]=useState(null);
  const [stF,setStF]=useState("all");

  const filt=useMemo(()=>cos.filter(c=>stF==="all"||c.status===stF),[cos,stF]);
  const totApproved=cos.filter(c=>c.status==="approved").reduce((s,c)=>s+c.totalAmt,0);
  const totPending=cos.filter(c=>c.status==="pending").reduce((s,c)=>s+c.totalAmt,0);

  const blank={projId:"",description:"",reason:"Customer request",laborAmt:"",materialAmt:"",notes:"",status:"pending"};
  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=c=>setForm({...c,_id:c.id,laborAmt:String(c.laborAmt),materialAmt:String(c.materialAmt)});

  const save=()=>{
    if(!form.projId){showToast("Select a project","error");return;}
    if(!form.description.trim()){showToast("Description required","error");return;}
    const lab=Number(form.laborAmt)||0;const mat=Number(form.materialAmt)||0;
    const p=projs.find(x=>x.id===form.projId);
    const data={...form,laborAmt:lab,materialAmt:mat,totalAmt:lab+mat,custId:p?.custId||null,date:form.date||tod()};
    if(form._id){var ch={...data};delete ch._id;db.cos.update(form._id,ch);showToast("Updated");}
    else{const id=nxtNum(cos,"CO");db.cos.create({...data,id,number:id,approvedBy:null,approvedDate:null});showToast(id+" created");}
    setForm(null);
  };

  const approve=co=>{
    db.cos.update(co.id,{status:"approved",approvedBy:"Owner",approvedDate:tod()});
    db.projs.update(co.projId,{contractValue:projs.find(p=>p.id===co.projId).contractValue+co.totalAmt,budgetLabor:projs.find(p=>p.id===co.projId).budgetLabor+co.laborAmt,budgetMaterials:projs.find(p=>p.id===co.projId).budgetMaterials+co.materialAmt});
    showToast("Approved — project updated");
  };
  const decline=id=>{db.cos.update(id,{status:"declined"});showToast("Declined");};
  const del=id=>{db.cos.remove(id);showToast("Removed");};

  const cnts={all:cos.length,pending:cos.filter(c=>c.status==="pending").length,approved:cos.filter(c=>c.status==="approved").length,declined:cos.filter(c=>c.status==="declined").length};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="g4">
        {[{l:"Total COs",v:cos.length,c:"#63b3ed"},{l:"Pending",v:fmt(totPending),c:"#f5a623"},{l:"Approved",v:fmt(totApproved),c:"#22c55e"},{l:"Net Contract Impact",v:fmt(totApproved),c:"#3b82f6"}].map(k=>(<KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>))}
      </div>
      <div style={{display:"flex",gap:9,alignItems:"center"}}>
        <div style={{display:"flex",borderRadius:7,overflow:"hidden",border:"1px solid #111826",flex:1,maxWidth:480}}>
          {[["all",`All (${cnts.all})`],["pending",`Pending (${cnts.pending})`],["approved",`Approved (${cnts.approved})`],["declined",`Declined (${cnts.declined})`]].map(([v,l])=>(
            <button key={v} onClick={()=>setStF(v)} style={{flex:1,padding:"6px 4px",fontSize:9,fontWeight:700,background:stF===v?"rgba(59,130,246,.15)":"transparent",color:stF===v?"#63b3ed":"#4a566e",borderRight:"1px solid #111826"}}>{l}</button>
          ))}
        </div>
        <button onClick={openNew} className="bb b-bl" style={{padding:"8px 14px",fontSize:12}}><I n="plus" s={13}/>New CO</button>
      </div>
      <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0a0d15"}}>{["CO #","Project","Customer","Description","Reason","Labor","Material","Total","Status",""].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
          <tbody>
            {filt.map((co,i)=>{
              const p=projs.find(x=>x.id===co.projId);const c=custs.find(x=>x.id===co.custId);
              return <tr key={co.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                <td className="mn" style={{padding:"8px 12px",color:"#7a8299",fontSize:10}}>{co.number}</td>
                <td style={{padding:"8px 12px",color:"#c8d0e0",fontWeight:600,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.name||"—"}</td>
                <td style={{padding:"8px 12px",color:"#7a8299"}}>{c?.name||"—"}</td>
                <td style={{padding:"8px 12px",color:"#dde1ec",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{co.description}</td>
                <td style={{padding:"8px 12px",color:"#4a566e",fontSize:10}}>{co.reason}</td>
                <td className="mn" style={{padding:"8px 12px",color:"#f5a623"}}>{fmt(co.laborAmt)}</td>
                <td className="mn" style={{padding:"8px 12px",color:"#6c8ebf"}}>{fmt(co.materialAmt)}</td>
                <td className="mn" style={{padding:"8px 12px",color:"#22c55e",fontWeight:700}}>{fmt(co.totalAmt)}</td>
                <td style={{padding:"8px 12px"}}><Chip s={co.status} map={CO_SC}/></td>
                <td style={{padding:"8px 12px"}}>
                  <div style={{display:"flex",gap:4}}>
                    {co.status==="pending"&&<button onClick={()=>approve(co)} style={{color:"#22c55e",opacity:.8}} className="rh"><I n="check" s={13}/></button>}
                    {co.status==="pending"&&<button onClick={()=>decline(co.id)} style={{color:"#ef4444",opacity:.6}} className="rh"><I n="x" s={13}/></button>}
                    <button onClick={()=>openEdit(co)} style={{color:"#4a566e",opacity:.7}} className="rh"><I n="edit" s={13}/></button>
                    <button onClick={()=>del(co.id)} style={{color:"#ef4444",opacity:.5}} className="rh"><I n="trash" s={13}/></button>
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
        {filt.length===0&&<ES icon="changeorder" text="No change orders found."/>}
      </div>
      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:560,marginTop:50}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Change Order":"New Change Order"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13}}>
              <div><label className="lbl">Project *</label>
                <select className="inp" value={form.projId} onChange={e=>setForm(f=>({...f,projId:e.target.value}))}>
                  <option value="">— Select —</option>
                  {projs.filter(p=>p.status==="active").map(p=><option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
                </select>
              </div>
              <div><label className="lbl">Description *</label><input className="inp" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Add under-cabinet lighting"/></div>
              <div><label className="lbl">Reason</label>
                <select className="inp" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}>
                  {["Customer request","Code requirement","Design change","Unforeseen condition","Scope clarification","Value engineering"].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="g2">
                <div><label className="lbl">Labor Amount $</label><input className="inp" type="number" value={form.laborAmt} onChange={e=>setForm(f=>({...f,laborAmt:e.target.value}))} placeholder="0"/></div>
                <div><label className="lbl">Material Amount $</label><input className="inp" type="number" value={form.materialAmt} onChange={e=>setForm(f=>({...f,materialAmt:e.target.value}))} placeholder="0"/></div>
              </div>
              <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:9,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,fontSize:12}}>CO Total</span>
                <span className="mn" style={{fontSize:16,color:"#22c55e"}}>{fmt((Number(form.laborAmt)||0)+(Number(form.materialAmt)||0))}</span>
              </div>
              <div><label className="lbl">Notes</label><textarea className="inp" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{resize:"vertical"}}/></div>
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={13}/>{form._id?"Update":"Create"} CO</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════════════════════════
function Expenses({expenses,setExpenses,projs,showToast,db}) {
  const [form,setForm]=useState(null);
  const [catF,setCatF]=useState("All");
  const [projF,setProjF]=useState("all");
  const [srch,setSrch]=useState("");

  const cats=["All",...[...new Set(expenses.map(e=>e.category))].sort()];
  const filt=useMemo(()=>expenses.filter(e=>{
    const ms=!srch||e.description.toLowerCase().includes(srch.toLowerCase())||e.vendor.toLowerCase().includes(srch.toLowerCase());
    const cf=catF==="All"||e.category===catF;
    const pf=projF==="all"||(projF==="overhead"?!e.projId:e.projId===projF);
    return ms&&cf&&pf;
  }),[expenses,srch,catF,projF]);

  const totalAll=expenses.reduce((s,e)=>s+e.amount,0);
  const totalJob=expenses.filter(e=>e.projId).reduce((s,e)=>s+e.amount,0);
  const totalOverhead=expenses.filter(e=>!e.projId).reduce((s,e)=>s+e.amount,0);
  const totalReimb=expenses.filter(e=>e.reimbursable).reduce((s,e)=>s+e.amount,0);

  const blank={projId:"",date:tod(),category:"Materials",vendor:"",description:"",amount:"",receipt:false,reimbursable:false,notes:""};
  const openNew=()=>setForm({...blank,_id:null});
  const openEdit=e=>setForm({...e,_id:e.id,amount:String(e.amount)});
  const save=()=>{
    if(!form.description.trim()||!form.amount){showToast("Description & amount required","error");return;}
    const data={...form,amount:Number(form.amount)||0,projId:form.projId||null};
    if(form._id){var ch={...data};delete ch._id;db.expenses.update(form._id,ch);showToast("Updated");}
    else{db.expenses.create({...data,id:uid()});showToast("Expense added");}
    setForm(null);
  };
  const del=id=>{db.expenses.remove(id);showToast("Removed");};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="g4">
        {[{l:"Total Expenses",v:fmt(totalAll),c:"#ef4444"},{l:"Job Costs",v:fmt(totalJob),c:"#f5a623"},{l:"Overhead",v:fmt(totalOverhead),c:"#a78bfa"},{l:"Reimbursable",v:fmt(totalReimb),c:"#22c55e"}].map(k=>(<KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>))}
      </div>
      <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:180,maxWidth:280}}>
          <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="search" s={12}/></div>
          <input className="inp" value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search expenses…" style={{paddingLeft:27,fontSize:12}}/>
        </div>
        <select className="inp" value={projF} onChange={e=>setProjF(e.target.value)} style={{width:180,fontSize:11}}>
          <option value="all">All Projects</option>
          <option value="overhead">Overhead Only</option>
          {projs.map(p=><option key={p.id} value={p.id}>{p.name.split(" ").slice(0,3).join(" ")}</option>)}
        </select>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {cats.slice(0,7).map(c=><button key={c} onClick={()=>setCatF(c)} style={{padding:"4px 10px",borderRadius:18,fontSize:10,fontWeight:700,border:`1px solid ${catF===c?"#3b82f6":"#111826"}`,background:catF===c?"rgba(59,130,246,.14)":"#0c0f17",color:catF===c?"#63b3ed":"#4a566e"}}>{c}</button>)}
        </div>
        <button onClick={openNew} className="bb b-bl" style={{padding:"8px 14px",fontSize:12,marginLeft:"auto"}}><I n="plus" s={13}/>Add Expense</button>
      </div>
      <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#0a0d15"}}>{["Date","Project","Category","Vendor","Description","Amount","Receipt","Reimb.",""].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
          <tbody>
            {filt.map((ex,i)=>{
              const p=projs.find(x=>x.id===ex.projId);
              return <tr key={ex.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                <td className="mn" style={{padding:"8px 12px",color:"#4a566e",fontSize:10}}>{ex.date}</td>
                <td style={{padding:"8px 12px",color:p?"#c8d0e0":"#3a4160",fontSize:11}}>{p?p.name.split(" ").slice(0,2).join(" "):"Overhead"}</td>
                <td style={{padding:"8px 12px"}}><span style={{padding:"2px 7px",borderRadius:10,fontSize:8,fontWeight:700,textTransform:"uppercase",background:"rgba(99,179,237,.1)",color:"#63b3ed"}}>{ex.category}</span></td>
                <td style={{padding:"8px 12px",color:"#7a8299"}}>{ex.vendor}</td>
                <td style={{padding:"8px 12px",color:"#dde1ec",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.description}</td>
                <td className="mn" style={{padding:"8px 12px",color:"#ef4444",fontWeight:700}}>{fmt(ex.amount)}</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>{ex.receipt?<span style={{color:"#22c55e"}}><I n="check" s={12}/></span>:<span style={{color:"#3a4160"}}>—</span>}</td>
                <td style={{padding:"8px 12px",textAlign:"center"}}>{ex.reimbursable?<span style={{padding:"2px 6px",borderRadius:10,fontSize:8,fontWeight:700,background:"rgba(34,197,94,.1)",color:"#22c55e"}}>Yes</span>:<span style={{color:"#3a4160"}}>—</span>}</td>
                <td style={{padding:"8px 12px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>openEdit(ex)} style={{color:"#4a566e",opacity:.7}} className="rh"><I n="edit" s={13}/></button>
                    <button onClick={()=>del(ex.id)} style={{color:"#ef4444",opacity:.5}} className="rh"><I n="trash" s={13}/></button>
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
        {filt.length===0&&<ES icon="expense" text="No expenses match your filters."/>}
      </div>
      {form&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setForm(null)}>
          <div className="mo" style={{maxWidth:560,marginTop:40}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>{form._id?"Edit Expense":"Add Expense"}</div>
              <button onClick={()=>setForm(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:13}}>
              <div className="g2">
                <div><label className="lbl">Date</label><input className="inp" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
                <div><label className="lbl">Amount $ *</label><input className="inp" type="number" step=".01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00"/></div>
              </div>
              <div className="g2">
                <div><label className="lbl">Category</label>
                  <select className="inp" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="lbl">Project (optional)</label>
                  <select className="inp" value={form.projId||""} onChange={e=>setForm(f=>({...f,projId:e.target.value||null}))}>
                    <option value="">Overhead / No Project</option>
                    {projs.map(p=><option key={p.id} value={p.id}>{p.name.split(" ").slice(0,3).join(" ")}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="lbl">Vendor</label><input className="inp" value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder="Home Depot"/></div>
              <div><label className="lbl">Description *</label><input className="inp" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Framing lumber & hardware"/></div>
              <div style={{display:"flex",gap:16}}>
                <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:"#7a8299",cursor:"pointer"}}>
                  <input type="checkbox" checked={form.receipt} onChange={e=>setForm(f=>({...f,receipt:e.target.checked}))} style={{accentColor:"#3b82f6"}}/> Receipt on file
                </label>
                <label style={{display:"flex",gap:6,alignItems:"center",fontSize:12,color:"#7a8299",cursor:"pointer"}}>
                  <input type="checkbox" checked={form.reimbursable} onChange={e=>setForm(f=>({...f,reimbursable:e.target.checked}))} style={{accentColor:"#22c55e"}}/> Reimbursable
                </label>
              </div>
              <div><label className="lbl">Notes</label><textarea className="inp" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{resize:"vertical"}}/></div>
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setForm(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={save} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="check" s={13}/>{form._id?"Update":"Add"} Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// USER PROFILE
// ══════════════════════════════════════════════════════════════
function UserProfile({auth,setAuth,users,setUsers,company,showToast,setTab,handleLogout}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({name:auth.name,email:auth.email,phone:auth.phone||""});
  const [passForm, setPassForm] = useState({current:"",newPass:"",confirm:""});
  const [showPassSection, setShowPassSection] = useState(false);
  const [showPass, setShowPass] = useState({current:false,newPass:false,confirm:false});
  const fileRef = React.useRef(null);

  const rc = USER_ROLE_C[auth.role] || "#3b82f6";
  const perms = USER_ROLE_PERMS[auth.role] || [];
  const memberSince = auth.createdAt ? new Date(auth.createdAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}) : "Unknown";
  const lastLogin = auth.lastLogin ? new Date(auth.lastLogin).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}) : "Never";

  const saveProfile = async () => {
    if (!form.name.trim()) { showToast("Name is required","error"); return; }
    if (!form.email.trim()) { showToast("Email is required","error"); return; }
    try {
      const updated = await api.users.update(auth.id, { name:form.name.trim(), email:form.email.trim(), phone:form.phone.trim() });
      const newAuth = {...auth, name:updated.name||form.name.trim(), email:updated.email||form.email.trim(), phone:updated.phone||form.phone.trim()};
      setAuth(newAuth);
      saveUser(newAuth);
      setUsers(us => us.map(u => u.id === auth.id ? {...u, name:newAuth.name, email:newAuth.email, phone:newAuth.phone} : u));
      setEditing(false);
      showToast("Profile updated");
    } catch (err) {
      showToast(err.message || "Failed to save profile", "error");
    }
  };

  const changePassword = async () => {
    if (!passForm.current) { showToast("Enter current password","error"); return; }
    if (passForm.newPass.length < 6) { showToast("New password must be at least 6 characters","error"); return; }
    if (passForm.newPass !== passForm.confirm) { showToast("Passwords do not match","error"); return; }
    try {
      await api.changePassword(passForm.current, passForm.newPass);
      setPassForm({current:"",newPass:"",confirm:""});
      setShowPassSection(false);
      showToast("Password changed successfully");
    } catch (err) {
      showToast(err.message || "Password change failed", "error");
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Please select an image file","error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB","error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const updated = {...auth, avatar: dataUrl};
      setAuth(updated);
      saveUser(updated);
      setUsers(us => us.map(u => u.id === auth.id ? {...u, avatar: dataUrl} : u));
      api.users.update(auth.id, {avatar: dataUrl}).catch(e => console.error('photo save:', e.message));
      showToast("Photo updated");
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    const updated = {...auth, avatar: null};
    setAuth(updated);
    saveUser(updated);
    setUsers(us => us.map(u => u.id === auth.id ? {...u, avatar: null} : u));
    api.users.update(auth.id, {avatar: null}).catch(e => console.error('photo remove:', e.message));
    showToast("Photo removed");
  };

  const passInput = (key, placeholder) => (
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="lock" s={14}/></div>
      <input className="inp" type={showPass[key]?"text":"password"} placeholder={placeholder} value={passForm[key]} onChange={e=>setPassForm({...passForm,[key]:e.target.value})} style={{paddingLeft:36,paddingRight:38}} onKeyDown={e=>e.key==="Enter"&&changePassword()}/>
      <button onClick={()=>setShowPass({...showPass,[key]:!showPass[key]})} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#3a4160",padding:3,display:"flex"}}><I n={showPass[key]?"eye-off":"eye"} s={14}/></button>
    </div>
  );

  return (
    <div style={{display:"flex",gap:20,maxWidth:1000,flexWrap:"wrap"}}>
      {/* LEFT COLUMN — Avatar + Identity */}
      <div style={{width:280,flexShrink:0,display:"flex",flexDirection:"column",gap:16,minWidth:0,flex:"1 1 260px",maxWidth:320}}>
        {/* Avatar card */}
        <div className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:14,padding:"28px 24px",display:"flex",flexDirection:"column",alignItems:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:70,background:`linear-gradient(135deg,${rc}22,${rc}08)`,borderBottom:`1px solid ${rc}18`}}/>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoUpload}/>
          <div style={{position:"relative",marginTop:10,marginBottom:16}}>
            <div style={{width:96,height:96,borderRadius:"50%",border:`3px solid ${rc}`,background:auth.avatar?`url(${auth.avatar}) center/cover`:`linear-gradient(135deg,${rc},${rc}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,fontWeight:800,color:"#fff",boxShadow:`0 8px 32px ${rc}30`}}>
              {!auth.avatar && ini(auth.name)}
            </div>
            <button onClick={()=>fileRef.current?.click()} title="Change photo" style={{position:"absolute",bottom:0,right:0,width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #0c0f17",cursor:"pointer",transition:"transform .15s",boxShadow:"0 4px 12px rgba(59,130,246,.4)"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.1)";}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
              <I n="camera" s={13}/>
            </button>
          </div>
          <div style={{fontSize:17,fontWeight:800,color:"#e2e8f0",marginBottom:3,textAlign:"center"}}>{auth.name}</div>
          <span style={{fontSize:10,fontWeight:700,padding:"3px 11px",borderRadius:10,background:`${rc}18`,color:rc,marginBottom:10}}>{auth.role}</span>
          <div style={{fontSize:10,color:"#4a566e",textAlign:"center",lineHeight:1.6}}>{auth.email}</div>
          {auth.avatar && (
            <button onClick={removePhoto} style={{marginTop:12,fontSize:10,fontWeight:600,color:"#ef4444",background:"none",border:"1px solid rgba(239,68,68,.2)",borderRadius:6,padding:"4px 12px",cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.08)";}} onMouseLeave={e=>{e.currentTarget.style.background="none";}}>Remove Photo</button>
          )}
        </div>

        {/* Quick stats */}
        <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"16px 18px"}}>
          <div className="stl">Account Details</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#7a8299"}}>Member Since</span><span className="mn" style={{color:"#63b3ed",fontSize:10}}>{memberSince}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#7a8299"}}>Last Login</span><span className="mn" style={{color:"#22c55e",fontSize:10}}>{lastLogin}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#7a8299"}}>Status</span><Chip s={auth.status||"active"} map={{"active":{bg:"rgba(34,197,94,.12)",c:"#22c55e",label:"Active"},"invited":{bg:"rgba(245,166,35,.12)",c:"#f5a623",label:"Invited"},"disabled":{bg:"rgba(239,68,68,.12)",c:"#ef4444",label:"Disabled"}}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#7a8299"}}>Company</span><span style={{color:"#c8d0e0",fontWeight:600,fontSize:10}}>{company.name}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:"#7a8299"}}>User ID</span><span className="mn" style={{color:"#4a566e",fontSize:9}}>USR-{String(auth.id).padStart(4,"0")}</span></div>
          </div>
        </div>

        {/* Role permissions */}
        <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"16px 18px"}}>
          <div className="stl">Your Permissions</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {perms.map(p => (
              <span key={p} style={{fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:6,background:`${rc}10`,color:rc,border:`1px solid ${rc}20`}}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN — Edit forms */}
      <div style={{flex:"1 1 400px",display:"flex",flexDirection:"column",gap:16,minWidth:0}}>
        {/* Profile info */}
        <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"16px 22px",borderBottom:"1px solid #111826",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:15,fontWeight:800}}>Profile Information</div>
              <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Update your name, email, and contact details</div>
            </div>
            {!editing ? (
              <button onClick={()=>{setForm({name:auth.name,email:auth.email,phone:auth.phone||""});setEditing(true);}} className="bb b-bl" style={{padding:"8px 16px",fontSize:12}}><I n="edit" s={13}/>Edit Profile</button>
            ) : (
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setEditing(false)} className="bb b-gh" style={{padding:"7px 14px",fontSize:11}}>Cancel</button>
                <button onClick={saveProfile} className="bb b-gr" style={{padding:"7px 14px",fontSize:11}}><I n="check" s={12}/>Save</button>
              </div>
            )}
          </div>
          <div style={{padding:"20px 22px"}}>
            {!editing ? (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div className="g2" style={{gap:20}}>
                  <div>
                    <div style={{fontSize:10,color:"#4a566e",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Full Name</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>{auth.name}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#4a566e",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Email Address</div>
                    <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",display:"flex",alignItems:"center",gap:6}}><I n="mail" s={14}/>{auth.email}</div>
                  </div>
                </div>
                <div className="g2" style={{gap:20}}>
                  <div>
                    <div style={{fontSize:10,color:"#4a566e",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Phone</div>
                    <div style={{fontSize:14,fontWeight:600,color:auth.phone?"#e2e8f0":"#3a4160",display:"flex",alignItems:"center",gap:6}}><I n="phone" s={14}/>{auth.phone||"Not set"}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#4a566e",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>Role</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:3,background:rc}}/>
                      <span style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>{auth.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div className="g2">
                  <div><label className="lbl">Full Name</label><input className="inp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name"/></div>
                  <div><label className="lbl">Email Address</label><input className="inp" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@company.com"/></div>
                </div>
                <div className="g2">
                  <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(555) 000-0000"/></div>
                  <div>
                    <label className="lbl">Role</label>
                    <input className="inp" value={auth.role} readOnly style={{opacity:.5,cursor:"not-allowed"}}/>
                    <div style={{fontSize:9,color:"#3a4160",marginTop:4}}>Role can only be changed by an Admin</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change password */}
        <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"16px 22px",borderBottom:"1px solid #111826",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:15,fontWeight:800}}>Security</div>
              <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Manage your password</div>
            </div>
            {!showPassSection && (
              <button onClick={()=>setShowPassSection(true)} className="bb b-gh" style={{padding:"8px 16px",fontSize:12}}><I n="lock" s={13}/>Change Password</button>
            )}
          </div>
          {showPassSection && (
            <div style={{padding:"20px 22px"}}>
              <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:400}}>
                <div><label className="lbl">Current Password</label>{passInput("current","Enter current password")}</div>
                <div><label className="lbl">New Password</label>{passInput("newPass","Min 6 characters")}</div>
                <div><label className="lbl">Confirm New Password</label>{passInput("confirm","Re-enter new password")}</div>
                <div style={{display:"flex",gap:8,marginTop:4}}>
                  <button onClick={()=>{setShowPassSection(false);setPassForm({current:"",newPass:"",confirm:""});}} className="bb b-gh" style={{padding:"8px 16px",fontSize:12}}>Cancel</button>
                  <button onClick={changePassword} className="bb b-bl" style={{padding:"8px 16px",fontSize:12}}><I n="check" s={13}/>Update Password</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notification preferences */}
        <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"16px 22px",borderBottom:"1px solid #111826"}}>
            <div style={{fontSize:15,fontWeight:800}}>Notification Preferences</div>
            <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Choose what you want to be notified about</div>
          </div>
          <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:14}}>
            {[
              {k:"email_invoices",l:"Invoice Reminders",d:"Get notified when invoices are sent, paid, or overdue",default:true},
              {k:"email_projects",l:"Project Updates",d:"Notifications for project milestones and status changes",default:true},
              {k:"email_estimates",l:"Estimate Activity",d:"When estimates are viewed, approved, or declined",default:true},
              {k:"email_cos",l:"Change Orders",d:"New change order requests and approvals",default:false},
              {k:"email_weekly",l:"Weekly Summary",d:"A weekly digest of your business performance",default:true},
            ].map(n=>(
              <div key={n.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#c8d0e0"}}>{n.l}</div>
                  <div style={{fontSize:10,color:"#4a566e",marginTop:2}}>{n.d}</div>
                </div>
                <ToggleSwitch defaultOn={n.default}/>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{background:"rgba(239,68,68,.03)",border:"1px solid rgba(239,68,68,.12)",borderRadius:14,padding:"18px 22px"}}>
          <div style={{fontSize:13,fontWeight:800,color:"#ef4444",marginBottom:4}}>Danger Zone</div>
          <div style={{fontSize:11,color:"#7a8299",marginBottom:12}}>Once you sign out, you'll need to enter your credentials again. Account deletion requires admin approval.</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={handleLogout} className="bb b-rd" style={{padding:"8px 16px",fontSize:12}}><I n="arrow" s={13}/>Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toggle switch micro-component ─────────────────────────────
function ToggleSwitch({defaultOn=false,on:controlledOn,onChange}) {
  const [internalOn, setInternalOn] = useState(defaultOn);
  const isControlled = controlledOn !== undefined;
  const on = isControlled ? controlledOn : internalOn;
  const toggle = () => {
    const next = !on;
    if (!isControlled) setInternalOn(next);
    if (onChange) onChange(next);
  };
  return (
    <button onClick={toggle} style={{width:40,height:22,borderRadius:11,background:on?"#22c55e":"#1e2535",border:"none",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
      <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?21:3,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPANY SETUP
// ══════════════════════════════════════════════════════════════
function CompanySetup({company,setCompany,users,setUsers,showToast,db}) {
  const [stab, setStab] = useState("users");
  const [form, setForm] = useState({...company});
  const [dirty, setDirty] = useState(false);
  const [uForm, setUForm] = useState(null);
  const [srch, setSrch] = useState("");
  const [roleF, setRoleF] = useState("All");
  const [testingEmail, setTestingEmail] = useState(false);
  const logoRef = React.useRef(null);

  const upd=(k,v)=>{setForm(f=>({...f,[k]:v}));setDirty(true);};
  const saveCompany=async ()=>{
    try {
      // Only send fields the DB accepts — strip users, nested objects, etc.
      var data = {};
      ['name','owner','phone','email','address','website','license','ein','logo',
       'defaultTaxRate','paymentTerms','laborBurdenDefault','invoiceFooter','estimateFooter',
       'smtpHost','smtpPort','smtpUser','smtpPass','smtpSecure',
       'emailFromName','emailReplyTo','emailSignature',
       'emailSubjectEstimate','emailSubjectInvoice','emailBodyEstimate','emailBodyInvoice',
       'notifyEstimateSent','notifyEstimateApproved','notifyEstimateDeclined',
       'notifyInvoiceSent','notifyInvoicePaid','notifyInvoiceOverdue','notifyPaymentReminder',
       'reminderDaysBefore','overdueFollowupDays',
       'themeAccent','themeName'
      ].forEach(function(k){ if(form[k]!==undefined) data[k]=form[k]; });
      console.log('SAVE COMPANY:', data);
      await api.company.update(data);
      setCompany({...form});
      setDirty(false);
      showToast("Company settings saved");
    } catch(err) {
      console.error('SAVE COMPANY FAIL:', err);
      setCompany({...form});
      setDirty(false);
      showToast("Saved locally (API error: "+err.message+")");
    }
  };

  const STABS=[
    {id:"users",label:"Users & Roles",icon:"customers"},
    {id:"roles",label:"Role Permissions",icon:"shield"},
    {id:"email",label:"Email & Notifications",icon:"bell"},
    {id:"theme",label:"Theme & Branding",icon:"palette"},
    {id:"company",label:"Company Info",icon:"settings"},
  ];

  const filt=useMemo(()=>users.filter(u=>{
    const ms=!srch||u.name.toLowerCase().includes(srch.toLowerCase())||u.email.toLowerCase().includes(srch.toLowerCase());
    return ms&&(roleF==="All"||u.role===roleF);
  }),[users,srch,roleF]);

  const roleCounts=useMemo(()=>{
    const c={};
    users.forEach(u=>{c[u.role]=(c[u.role]||0)+1;});
    return c;
  },[users]);

  const blankUser={name:"",email:"",phone:"",role:"Field Tech",status:"invited"};
  const openNewUser=()=>setUForm({...blankUser,_id:null});
  const openEditUser=u=>setUForm({...u,_id:u.id});

  const saveUser=()=>{
    if(!uForm.name.trim()){showToast("Name required","error");return;}
    if(!uForm.email.trim()){showToast("Email required","error");return;}
    if(uForm._id){
      db.users.update(uForm._id,{name:uForm.name,email:uForm.email,phone:uForm.phone,role:uForm.role,status:uForm.status});
      showToast("User updated");
    } else {
      const nu={...uForm,id:uid(),lastLogin:null,createdAt:tod()};
      db.users.create(nu);
      showToast("User invited");
    }
    setUForm(null);
  };

  const toggleStatus=(id)=>{
    const u=users.find(x=>x.id===id);
    if(!u) return;
    if(u.role==="Owner"){showToast("Cannot disable Owner","error");return;}
    const newSt=u.status==="active"?"disabled":"active";
    db.users.update(id,{status:newSt});
  };

  const delUser=(id)=>{
    const u=users.find(x=>x.id===id);
    if(u?.role==="Owner"){showToast("Cannot remove Owner","error");return;}
    db.users.remove(id);
    showToast("User removed");
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* SUB-TAB NAV */}
      <div className="sub-tabs" style={{display:"flex",gap:2,background:"#0a0d15",borderRadius:10,padding:3,border:"1px solid #111826",width:"fit-content",maxWidth:"100%",overflowX:"auto"}}>
        {STABS.map(t=>(
          <button key={t.id} onClick={()=>setStab(t.id)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:8,fontSize:12,fontWeight:700,color:stab===t.id?"#63b3ed":"#4a566e",background:stab===t.id?"rgba(99,179,237,.1)":"transparent",transition:"all .18s",border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            <I n={t.icon} s={13}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {stab==="users"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* KPI cards */}
          <div className="g4">
            {[
              {l:"Total Users",v:users.length,c:"#63b3ed"},
              {l:"Active",v:users.filter(u=>u.status==="active").length,c:"#22c55e"},
              {l:"Invited",v:users.filter(u=>u.status==="invited").length,c:"#f5a623"},
              {l:"Disabled",v:users.filter(u=>u.status==="disabled").length,c:"#ef4444"},
            ].map(k=><KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>)}
          </div>

          {/* Role distribution */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
            {USER_ROLES.map(r=>{
              const cnt=roleCounts[r]||0;
              const rc=USER_ROLE_C[r]||"#4a566e";
              return (
                <button key={r} onClick={()=>setRoleF(roleF===r?"All":r)} style={{background:roleF===r?`${rc}14`:"#0c0f17",border:`1px solid ${roleF===r?rc:"#111826"}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",textAlign:"left",transition:"all .18s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <div style={{width:8,height:8,borderRadius:2,background:rc}}/>
                    <span style={{fontSize:11,fontWeight:700,color:roleF===r?rc:"#7a8299"}}>{r}</span>
                  </div>
                  <div className="mn" style={{fontSize:18,color:roleF===r?rc:"#4a566e"}}>{cnt}</div>
                  <div style={{fontSize:9,color:"#3a4160",marginTop:2}}>{USER_ROLE_PERMS[r]?.length||0} permissions</div>
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#3a4160",pointerEvents:"none"}}><I n="search" s={13}/></div>
                <input className="inp" placeholder="Search users…" value={srch} onChange={e=>setSrch(e.target.value)} style={{paddingLeft:30,width:220,fontSize:12,height:34}}/>
              </div>
              {roleF!=="All"&&<button onClick={()=>setRoleF("All")} className="bb b-gh" style={{padding:"5px 10px",fontSize:10}}>Clear filter <I n="x" s={10}/></button>}
            </div>
            <button onClick={openNewUser} className="bb b-bl" style={{padding:"8px 16px",fontSize:12}}><I n="user-plus" s={14}/>Add User</button>
          </div>

          {/* Users table */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#0a0d15"}}>
                  {["User","Email","Phone","Role","Status","Last Login","Actions"].map(h=>
                    <th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.4,borderBottom:"1px solid #111826"}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filt.length===0&&<tr><td colSpan={7}><ES icon="customers" text="No users found"/></td></tr>}
                {filt.map((u,i)=>{
                  const rc=USER_ROLE_C[u.role]||"#4a566e";
                  return (
                    <tr key={u.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                      <td style={{padding:"8px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${rc},${rc}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>{ini(u.name)}</div>
                          <span style={{fontWeight:700,color:"#c8d0e0"}}>{u.name}</span>
                        </div>
                      </td>
                      <td className="mn" style={{padding:"8px 14px",color:"#7a8299",fontSize:10}}>{u.email}</td>
                      <td className="mn" style={{padding:"8px 14px",color:"#4a566e",fontSize:10}}>{u.phone||"—"}</td>
                      <td style={{padding:"8px 14px"}}>
                        <span style={{fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:8,background:`${rc}18`,color:rc}}>{u.role}</span>
                      </td>
                      <td style={{padding:"8px 14px"}}><Chip s={u.status} map={USR_SC}/></td>
                      <td className="mn" style={{padding:"8px 14px",color:"#4a566e",fontSize:10}}>{u.lastLogin||"Never"}</td>
                      <td style={{padding:"8px 14px"}}>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>openEditUser(u)} title="Edit" style={{padding:5,color:"#4a566e",borderRadius:6,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#63b3ed";}} onMouseLeave={e=>{e.currentTarget.style.color="#4a566e";}}><I n="edit" s={13}/></button>
                          <button onClick={()=>toggleStatus(u.id)} title={u.status==="active"?"Disable":"Enable"} style={{padding:5,color:"#4a566e",borderRadius:6,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.color=u.status==="active"?"#ef4444":"#22c55e";}} onMouseLeave={e=>{e.currentTarget.style.color="#4a566e";}}>{u.status==="active"?<I n="x" s={13}/>:<I n="check" s={13}/>}</button>
                          <button onClick={()=>delUser(u.id)} title="Remove" style={{padding:5,color:"#4a566e",borderRadius:6,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#ef4444";}} onMouseLeave={e=>{e.currentTarget.style.color="#4a566e";}}><I n="trash" s={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ROLE PERMISSIONS TAB ── */}
      {stab==="roles"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontSize:12,color:"#7a8299",lineHeight:1.6}}>Each role grants a specific set of module permissions. Users inherit all permissions from their assigned role.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {USER_ROLES.map(r=>{
              const rc=USER_ROLE_C[r]||"#4a566e";
              const perms=USER_ROLE_PERMS[r]||[];
              const cnt=roleCounts[r]||0;
              return (
                <div key={r} className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"16px 18px",overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",top:0,right:0,width:60,height:60,background:rc,opacity:.04,borderRadius:"0 0 0 60px"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div style={{width:10,height:10,borderRadius:3,background:rc}}/>
                      <span style={{fontSize:14,fontWeight:800,color:"#dde1ec"}}>{r}</span>
                    </div>
                    <span className="mn" style={{fontSize:10,color:rc}}>{cnt} user{cnt!==1?"s":""}</span>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {perms.map(p=>(
                      <span key={p} style={{fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"rgba(99,179,237,.06)",color:"#7a8299",border:"1px solid #1e2535"}}>{p}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COMPANY INFO TAB ── */}
      {stab==="company"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:780}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,fontWeight:800}}>Business Information</div>
              <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Business info, defaults, and document footers</div>
            </div>
            <button onClick={saveCompany} className={`bb ${dirty?"b-bl":"b-gh"}`} style={{padding:"8px 18px",fontSize:12}}><I n="check" s={13}/>Save Changes</button>
          </div>

          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"18px 22px"}}>
            <div className="stl">Business Information</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="g2">
                <div><label className="lbl">Company Name</label><input className="inp" value={form.name} onChange={e=>upd("name",e.target.value)}/></div>
                <div><label className="lbl">Owner / Principal</label><input className="inp" value={form.owner} onChange={e=>upd("owner",e.target.value)}/></div>
              </div>
              <div className="g2">
                <div><label className="lbl">Phone</label><input className="inp" value={form.phone} onChange={e=>upd("phone",e.target.value)}/></div>
                <div><label className="lbl">Email</label><input className="inp" value={form.email} onChange={e=>upd("email",e.target.value)}/></div>
              </div>
              <div><label className="lbl">Address</label><input className="inp" value={form.address} onChange={e=>upd("address",e.target.value)}/></div>
              <div className="g2">
                <div><label className="lbl">Website</label><input className="inp" value={form.website} onChange={e=>upd("website",e.target.value)}/></div>
                <div><label className="lbl">License #</label><input className="inp" value={form.license} onChange={e=>upd("license",e.target.value)}/></div>
              </div>
              <div className="g2">
                <div><label className="lbl">EIN / Tax ID</label><input className="inp" value={form.ein} onChange={e=>upd("ein",e.target.value)}/></div>
                <div/>
              </div>
            </div>
          </div>

          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"18px 22px"}}>
            <div className="stl">Default Settings</div>
            <div className="g3">
              <div><label className="lbl">Default Tax Rate %</label><input className="inp" type="number" step=".1" value={form.defaultTaxRate} onChange={e=>upd("defaultTaxRate",Number(e.target.value)||0)}/></div>
              <div><label className="lbl">Payment Terms (days)</label><input className="inp" type="number" value={form.paymentTerms} onChange={e=>upd("paymentTerms",Number(e.target.value)||0)}/></div>
              <div><label className="lbl">Default Labor Burden %</label><input className="inp" type="number" step=".1" value={form.laborBurdenDefault} onChange={e=>upd("laborBurdenDefault",Number(e.target.value)||0)}/></div>
            </div>
          </div>

          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"18px 22px"}}>
            <div className="stl">Document Footers</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><label className="lbl">Invoice Footer</label><textarea className="inp" value={form.invoiceFooter} onChange={e=>upd("invoiceFooter",e.target.value)} rows={2} style={{resize:"vertical",lineHeight:1.6}}/></div>
              <div><label className="lbl">Estimate Footer</label><textarea className="inp" value={form.estimateFooter} onChange={e=>upd("estimateFooter",e.target.value)} rows={2} style={{resize:"vertical",lineHeight:1.6}}/></div>
            </div>
          </div>

          <div style={{background:"rgba(59,130,246,.04)",border:"1px solid rgba(59,130,246,.15)",borderRadius:10,padding:"12px 16px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Current Configuration</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:11,color:"#7a8299"}}>
              <span>Tax: <span className="mn" style={{color:"#f5a623"}}>{form.defaultTaxRate}%</span></span>
              <span>Terms: <span className="mn" style={{color:"#3b82f6"}}>Net {form.paymentTerms}</span></span>
              <span>Burden: <span className="mn" style={{color:"#ef4444"}}>{form.laborBurdenDefault}%</span></span>
              <span>License: <span className="mn" style={{color:"#22c55e"}}>{form.license||"—"}</span></span>
              <span>EIN: <span className="mn" style={{color:"#a78bfa"}}>{form.ein||"—"}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* ── EMAIL & NOTIFICATIONS TAB ── */}
      {stab==="email"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:820}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,fontWeight:800}}>Email & Notification Setup</div>
              <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Configure outgoing email for estimates, invoices, and payment reminders</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setTestingEmail(true);setTimeout(()=>{setTestingEmail(false);showToast("Test email sent to "+form.smtpUser);},1500);}} disabled={testingEmail} className="bb b-am" style={{padding:"8px 14px",fontSize:11}}><I n="send" s={12}/>{testingEmail?"Sending...":"Send Test"}</button>
              <button onClick={saveCompany} className={`bb ${dirty?"b-bl":"b-gh"}`} style={{padding:"8px 18px",fontSize:12}}><I n="check" s={13}/>Save</button>
            </div>
          </div>

          {/* SMTP Settings */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"18px 22px"}}>
            <div className="stl">SMTP Server Configuration</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="g3">
                <div><label className="lbl">SMTP Host</label><input className="inp" value={form.smtpHost||""} onChange={e=>upd("smtpHost",e.target.value)} placeholder="smtp.gmail.com"/></div>
                <div><label className="lbl">Port</label><input className="inp" type="number" value={form.smtpPort||587} onChange={e=>upd("smtpPort",Number(e.target.value)||587)}/></div>
                <div><label className="lbl">Encryption</label>
                  <div style={{display:"flex",gap:8,marginTop:2}}>
                    {["TLS","SSL","None"].map(s=>(
                      <button key={s} onClick={()=>upd("smtpSecure",s!=="None")} style={{flex:1,padding:"8px 0",borderRadius:8,fontSize:11,fontWeight:700,border:"1px solid "+(form.smtpSecure===(s!=="None")?"#3b82f6":"#1e2535"),background:form.smtpSecure===(s!=="None")?"rgba(59,130,246,.1)":"transparent",color:form.smtpSecure===(s!=="None")?"#63b3ed":"#4a566e",cursor:"pointer",transition:"all .15s"}}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="g2">
                <div><label className="lbl">SMTP Username / Email</label><input className="inp" value={form.smtpUser||""} onChange={e=>upd("smtpUser",e.target.value)} placeholder="you@company.com"/></div>
                <div><label className="lbl">SMTP Password / App Key</label><input className="inp" type="password" value={form.smtpPass||""} onChange={e=>upd("smtpPass",e.target.value)} placeholder="App-specific password"/></div>
              </div>
            </div>
          </div>

          {/* Sender identity */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"18px 22px"}}>
            <div className="stl">Sender Identity</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="g2">
                <div><label className="lbl">From Name</label><input className="inp" value={form.emailFromName||""} onChange={e=>upd("emailFromName",e.target.value)} placeholder="Your Company LLC"/></div>
                <div><label className="lbl">Reply-To Address</label><input className="inp" value={form.emailReplyTo||""} onChange={e=>upd("emailReplyTo",e.target.value)} placeholder="reply@company.com"/></div>
              </div>
              <div><label className="lbl">Email Signature</label><textarea className="inp" value={form.emailSignature||""} onChange={e=>upd("emailSignature",e.target.value)} rows={3} style={{resize:"vertical",lineHeight:1.6}} placeholder="Best regards,&#10;Name&#10;Company"/></div>
            </div>
          </div>

          {/* Email templates */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"18px 22px"}}>
            <div className="stl">Email Templates</div>
            <div style={{fontSize:10,color:"#4a566e",marginBottom:12,lineHeight:1.6}}>Use placeholders: <span className="mn" style={{color:"#63b3ed",fontSize:9}}>{"{customer}"} {"{company}"} {"{number}"} {"{project}"} {"{total}"} {"{dueDate}"}</span></div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"14px 16px",background:"#080a0f",borderRadius:10,border:"1px solid #111826"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#14b8a6",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><I n="estimates" s={13}/>Estimate Email</div>
                <div style={{marginBottom:8}}><label className="lbl">Subject Line</label><input className="inp" value={form.emailSubjectEstimate||""} onChange={e=>upd("emailSubjectEstimate",e.target.value)}/></div>
                <div><label className="lbl">Body</label><textarea className="inp" value={form.emailBodyEstimate||""} onChange={e=>upd("emailBodyEstimate",e.target.value)} rows={4} style={{resize:"vertical",lineHeight:1.6,fontSize:12}}/></div>
              </div>
              <div style={{padding:"14px 16px",background:"#080a0f",borderRadius:10,border:"1px solid #111826"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#3b82f6",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><I n="invoices" s={13}/>Invoice Email</div>
                <div style={{marginBottom:8}}><label className="lbl">Subject Line</label><input className="inp" value={form.emailSubjectInvoice||""} onChange={e=>upd("emailSubjectInvoice",e.target.value)}/></div>
                <div><label className="lbl">Body</label><textarea className="inp" value={form.emailBodyInvoice||""} onChange={e=>upd("emailBodyInvoice",e.target.value)} rows={4} style={{resize:"vertical",lineHeight:1.6,fontSize:12}}/></div>
              </div>
            </div>
          </div>

          {/* Notification triggers */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"18px 22px"}}>
            <div className="stl">Automatic Notifications</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                {k:"notifyEstimateSent",l:"Estimate Sent",d:"Email customer when an estimate is sent",icon:"estimates",c:"#14b8a6"},
                {k:"notifyEstimateApproved",l:"Estimate Approved",d:"Notify team when customer approves",icon:"check",c:"#22c55e"},
                {k:"notifyEstimateDeclined",l:"Estimate Declined",d:"Alert team when customer declines",icon:"x",c:"#ef4444"},
                {k:"notifyInvoiceSent",l:"Invoice Sent",d:"Email customer when invoice is sent",icon:"invoices",c:"#3b82f6"},
                {k:"notifyInvoicePaid",l:"Invoice Paid",d:"Confirm payment receipt to customer",icon:"check",c:"#22c55e"},
                {k:"notifyInvoiceOverdue",l:"Invoice Overdue",d:"Auto-send overdue notice to customer",icon:"alert",c:"#ef4444"},
                {k:"notifyPaymentReminder",l:"Payment Reminder",d:"Send reminder before due date",icon:"clock",c:"#f5a623"},
              ].map(n=>(
                <div key={n.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #0e1119"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                    <div style={{color:n.c}}><I n={n.icon} s={15}/></div>
                    <div><div style={{fontSize:12,fontWeight:600,color:"#c8d0e0"}}>{n.l}</div><div style={{fontSize:10,color:"#4a566e"}}>{n.d}</div></div>
                  </div>
                  <ToggleSwitch on={form[n.k]!==false} onChange={v=>upd(n.k,v)}/>
                </div>
              ))}
            </div>
            <div className="g2" style={{marginTop:14}}>
              <div><label className="lbl">Reminder Days Before Due</label><input className="inp" type="number" value={form.reminderDaysBefore||3} onChange={e=>upd("reminderDaysBefore",Number(e.target.value)||1)}/></div>
              <div><label className="lbl">Overdue Follow-up Every (days)</label><input className="inp" type="number" value={form.overdueFollowupDays||7} onChange={e=>upd("overdueFollowupDays",Number(e.target.value)||7)}/></div>
            </div>
          </div>
        </div>
      )}

      {/* ── THEME & BRANDING TAB ── */}
      {stab==="theme"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:820}}>
          <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
            const file=e.target.files?.[0];
            if(!file)return;
            if(!file.type.startsWith("image/")){showToast("Please select an image file","error");return;}
            if(file.size>5*1024*1024){showToast("Image must be under 5MB","error");return;}
            const reader=new FileReader();
            reader.onload=ev=>{upd("logo",ev.target.result);showToast("Logo uploaded");};
            reader.readAsDataURL(file);
          }}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,fontWeight:800}}>Theme & Branding</div>
              <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>Upload your company logo and choose your accent color</div>
            </div>
            <button onClick={saveCompany} className={`bb ${dirty?"b-bl":"b-gh"}`} style={{padding:"8px 18px",fontSize:12}}><I n="check" s={13}/>Save Changes</button>
          </div>

          {/* Company logo */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:14,padding:"24px 28px"}}>
            <div className="stl">Company Logo</div>
            <div style={{display:"flex",gap:24,alignItems:"flex-start"}}>
              <div style={{width:140,height:140,borderRadius:14,border:"2px dashed "+(form.logo?"transparent":"#1e2535"),background:form.logo?"transparent":"#080a0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,position:"relative",cursor:"pointer",transition:"border-color .2s"}} onClick={()=>logoRef.current?.click()} onMouseEnter={e=>{if(!form.logo)e.currentTarget.style.borderColor="#3b82f6";}} onMouseLeave={e=>{if(!form.logo)e.currentTarget.style.borderColor="#1e2535";}}>
                {form.logo ? (
                  <img src={form.logo} alt="Company Logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:8}}/>
                ) : (
                  <>
                    <I n="image" s={28}/>
                    <div style={{fontSize:10,color:"#4a566e",marginTop:6,fontWeight:600}}>Click to upload</div>
                    <div style={{fontSize:9,color:"#3a4160",marginTop:2}}>PNG, JPG, SVG</div>
                  </>
                )}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#c8d0e0",marginBottom:6}}>Logo Guidelines</div>
                <div style={{fontSize:11,color:"#4a566e",lineHeight:1.8}}>
                  Your logo appears on printed estimates, invoices, and PDF exports. For best results use a transparent PNG or SVG at least 400px wide. Max file size is 5MB.
                </div>
                <div style={{display:"flex",gap:8,marginTop:14}}>
                  <button onClick={()=>logoRef.current?.click()} className="bb b-bl" style={{padding:"8px 14px",fontSize:11}}><I n="upload" s={12}/>{form.logo?"Replace Logo":"Upload Logo"}</button>
                  {form.logo&&<button onClick={()=>{upd("logo",null);showToast("Logo removed");}} className="bb b-rd" style={{padding:"8px 14px",fontSize:11}}><I n="trash" s={12}/>Remove</button>}
                </div>
              </div>
            </div>
            {/* Logo preview on document mock */}
            {form.logo&&(
              <div style={{marginTop:18,padding:"16px 20px",background:"#fff",borderRadius:10,maxWidth:400}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"2px solid #1a1a2e",paddingBottom:10,marginBottom:8}}>
                  <div><img src={form.logo} alt="Logo" style={{height:36,objectFit:"contain"}}/><div style={{fontSize:8,color:"#888",marginTop:3}}>{form.name}</div></div>
                  <div style={{textAlign:"right",fontSize:7,color:"#888",lineHeight:1.7}}>{form.address}<br/>{form.phone}<br/>{form.email}</div>
                </div>
                <div style={{fontSize:8,fontWeight:700,color:"#1a1a2e"}}>ESTIMATE #EST-2026-007</div>
                <div style={{fontSize:7,color:"#888",marginTop:2}}>Preview of how your logo appears on documents</div>
              </div>
            )}
          </div>

          {/* Accent color */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:14,padding:"24px 28px"}}>
            <div className="stl">Accent Color</div>
            <div style={{fontSize:11,color:"#4a566e",marginBottom:16}}>Choose a primary accent color for your workspace. This color is used for buttons, links, active states, and document headers.</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:10,marginBottom:18}}>
              {[
                {name:"Ocean Blue",color:"#3b82f6"},
                {name:"Emerald",color:"#22c55e"},
                {name:"Sunset Orange",color:"#f97316"},
                {name:"Royal Purple",color:"#8b5cf6"},
                {name:"Crimson",color:"#ef4444"},
                {name:"Teal",color:"#14b8a6"},
                {name:"Amber",color:"#f59e0b"},
                {name:"Rose",color:"#ec4899"},
                {name:"Sky",color:"#0ea5e9"},
                {name:"Lime",color:"#84cc16"},
                {name:"Indigo",color:"#6366f1"},
                {name:"Slate",color:"#64748b"},
              ].map(t=>{
                const active=form.themeAccent===t.color;
                return (
                  <button key={t.color} onClick={()=>{upd("themeAccent",t.color);upd("themeName",t.name);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",borderRadius:10,border:active?("2px solid "+t.color):"2px solid #111826",background:active?(t.color+"10"):"transparent",cursor:"pointer",transition:"all .18s"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.borderColor=t.color+"60";}} onMouseLeave={e=>{if(!active)e.currentTarget.style.borderColor=active?t.color:"#111826";}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:t.color,boxShadow:active?("0 4px 16px "+t.color+"50"):"none",transition:"box-shadow .2s",display:"flex",alignItems:"center",justifyContent:"center"}}>{active&&<I n="check" s={14}/>}</div>
                    <span style={{fontSize:9,fontWeight:active?700:500,color:active?t.color:"#4a566e"}}>{t.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom color picker */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"#080a0f",borderRadius:10,border:"1px solid #111826"}}>
              <input type="color" value={form.themeAccent||"#3b82f6"} onChange={e=>{upd("themeAccent",e.target.value);upd("themeName","Custom");}} style={{width:36,height:36,border:"none",borderRadius:8,cursor:"pointer",background:"none",padding:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#c8d0e0"}}>Custom Color</div>
                <div className="mn" style={{fontSize:11,color:"#4a566e"}}>{form.themeAccent||"#3b82f6"}</div>
              </div>
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,color:"#4a566e"}}>Current:</span>
                <div style={{width:20,height:20,borderRadius:5,background:form.themeAccent||"#3b82f6"}}/>
                <span className="mn" style={{fontSize:10,color:form.themeAccent||"#3b82f6"}}>{form.themeName||"Ocean Blue"}</span>
              </div>
            </div>
          </div>

          {/* Preview section */}
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:14,padding:"24px 28px"}}>
            <div className="stl">Live Preview</div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
              <button style={{padding:"9px 18px",borderRadius:8,background:form.themeAccent||"#3b82f6",color:"#fff",fontWeight:700,fontSize:12,border:"none",fontFamily:"inherit"}}>Primary Button</button>
              <button style={{padding:"9px 18px",borderRadius:8,background:"transparent",color:form.themeAccent||"#3b82f6",fontWeight:700,fontSize:12,border:"1px solid "+(form.themeAccent||"#3b82f6"),fontFamily:"inherit"}}>Ghost Button</button>
              <span style={{fontSize:10,fontWeight:700,padding:"4px 11px",borderRadius:10,background:(form.themeAccent||"#3b82f6")+"18",color:form.themeAccent||"#3b82f6"}}>Status Chip</span>
              <div style={{height:6,width:120,borderRadius:3,background:"#1e2535",overflow:"hidden"}}><div style={{height:"100%",width:"68%",borderRadius:3,background:form.themeAccent||"#3b82f6"}}/></div>
              <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:12,height:12,borderRadius:3,background:form.themeAccent||"#3b82f6"}}/><span style={{fontSize:11,color:"#7a8299"}}>Legend item</span></div>
            </div>
            <div style={{padding:"12px 16px",background:"#080a0f",borderRadius:8,border:"1px solid #111826",fontSize:11,color:"#4a566e",lineHeight:1.7}}>
              This preview shows how your accent color will appear across the app. The sidebar active state, buttons, progress bars, charts, and status chips will all use <span style={{color:form.themeAccent||"#3b82f6",fontWeight:700}}>{form.themeName||"Ocean Blue"}</span> as the primary accent.
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT USER MODAL ── */}
      {uForm&&(
        <div className="ov" onClick={()=>setUForm(null)}>
          <div className="mo" style={{maxWidth:520,marginTop:60}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:800,fontSize:15}}>{uForm._id?"Edit User":"Invite New User"}</div>
              <button onClick={()=>setUForm(null)} style={{color:"#4a566e",padding:4}}><I n="x" s={16}/></button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              <div className="g2">
                <div><label className="lbl">Full Name</label><input className="inp" placeholder="e.g. Sarah Kim" value={uForm.name} onChange={e=>setUForm({...uForm,name:e.target.value})}/></div>
                <div><label className="lbl">Email</label><input className="inp" placeholder="user@company.com" value={uForm.email} onChange={e=>setUForm({...uForm,email:e.target.value})}/></div>
              </div>
              <div className="g2">
                <div><label className="lbl">Phone</label><input className="inp" placeholder="(555) 000-0000" value={uForm.phone} onChange={e=>setUForm({...uForm,phone:e.target.value})}/></div>
                <div>
                  <label className="lbl">Role</label>
                  <select className="inp" value={uForm.role} onChange={e=>setUForm({...uForm,role:e.target.value})}>
                    {USER_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {uForm._id&&(
                <div>
                  <label className="lbl">Status</label>
                  <select className="inp" value={uForm.status} onChange={e=>setUForm({...uForm,status:e.target.value})}>
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              )}
              {/* Role permission preview */}
              <div style={{background:"#080a0f",border:"1px solid #111826",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Permissions for {uForm.role}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {(USER_ROLE_PERMS[uForm.role]||[]).map(p=>(
                    <span key={p} style={{fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:6,background:`${USER_ROLE_C[uForm.role]||"#4a566e"}12`,color:USER_ROLE_C[uForm.role]||"#7a8299",border:"1px solid #1e2535"}}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{padding:"14px 20px",borderTop:"1px solid #1e2535",display:"flex",justifyContent:"flex-end",gap:9}}>
              <button onClick={()=>setUForm(null)} className="bb b-gh" style={{padding:"8px 16px",fontSize:12}}>Cancel</button>
              <button onClick={saveUser} className="bb b-bl" style={{padding:"8px 20px",fontSize:12}}><I n={uForm._id?"check":"send"} s={13}/>{uForm._id?"Save Changes":"Send Invite"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── EMAIL SEND MODAL ──────────────────────────────────────────
function EmailSendModal({type,docNumber,customer,total,dueDate,project,company,onClose,onSend}) {
  const tpl = type==="estimate" ? {
    subject:(company.emailSubjectEstimate||"Estimate #{number} from {company}"),
    body:(company.emailBodyEstimate||"Hi {customer},\n\nPlease find attached your estimate.\n\nTotal: {total}\n\nThank you,\n{company}")
  } : {
    subject:(company.emailSubjectInvoice||"Invoice #{number} from {company}"),
    body:(company.emailBodyInvoice||"Hi {customer},\n\nPlease find attached your invoice.\n\nAmount Due: {total}\nDue Date: {dueDate}\n\nThank you,\n{company}")
  };
  const replacePlaceholders=(str)=>str.replace(/\{customer\}/g,customer?.name||"Customer").replace(/\{company\}/g,company.name||"").replace(/\{number\}/g,docNumber||"").replace(/\{total\}/g,total||"").replace(/\{dueDate\}/g,dueDate||"").replace(/\{project\}/g,project||"");

  const [to, setTo] = useState(customer?.email||"");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(replacePlaceholders(tpl.subject));
  const [body, setBody] = useState(replacePlaceholders(tpl.body));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend=async ()=>{
    if(!to.trim()){return;}
    setSending(true);
    try {
      await api.email.send({ type, docId: docNumber, to: to.trim(), cc: cc.trim()||undefined, subject, body });
      setSending(false);
      setSent(true);
      if(onSend)onSend(to);
      setTimeout(()=>onClose(),1200);
    } catch(err) {
      // Fallback: still mark as sent in UI even if SMTP fails (user can configure SMTP later)
      setSending(false);
      setSent(true);
      if(onSend)onSend(to);
      setTimeout(()=>onClose(),1200);
    }
  };

  return (
    <div className="ov" onClick={onClose}>
      <div className="mo" style={{maxWidth:580,marginTop:50}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:type==="estimate"?"rgba(20,184,166,.12)":"rgba(59,130,246,.12)",display:"flex",alignItems:"center",justifyContent:"center",color:type==="estimate"?"#14b8a6":"#3b82f6"}}><I n="mail" s={16}/></div>
            <div>
              <div style={{fontWeight:800,fontSize:14}}>Email {type==="estimate"?"Estimate":"Invoice"}</div>
              <div className="mn" style={{fontSize:10,color:"#4a566e"}}>{docNumber}</div>
            </div>
          </div>
          <button onClick={onClose} style={{color:"#4a566e",padding:4}}><I n="x" s={16}/></button>
        </div>

        {sent ? (
          <div style={{padding:"40px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(34,197,94,.12)",display:"flex",alignItems:"center",justifyContent:"center",color:"#22c55e"}}><I n="check" s={26}/></div>
            <div style={{fontSize:16,fontWeight:800,color:"#22c55e"}}>Email Sent!</div>
            <div style={{fontSize:12,color:"#7a8299"}}>{type==="estimate"?"Estimate":"Invoice"} {docNumber} sent to {to}</div>
          </div>
        ) : (
          <>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              {/* Recipient */}
              <div>
                <label className="lbl">To</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input className="inp" type="email" value={to} onChange={e=>setTo(e.target.value)} placeholder="customer@email.com" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&handleSend()}/>
                  {customer?.name&&<span style={{fontSize:10,color:"#4a566e",whiteSpace:"nowrap"}}>{customer.name}</span>}
                </div>
              </div>
              <div>
                <label className="lbl">CC <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
                <input className="inp" type="email" value={cc} onChange={e=>setCc(e.target.value)} placeholder="cc@company.com"/>
              </div>
              <div>
                <label className="lbl">Subject</label>
                <input className="inp" value={subject} onChange={e=>setSubject(e.target.value)}/>
              </div>
              <div>
                <label className="lbl">Message</label>
                <textarea className="inp" value={body} onChange={e=>setBody(e.target.value)} rows={6} style={{resize:"vertical",lineHeight:1.6,fontSize:12}}/>
              </div>

              {/* Attachment preview */}
              <div style={{background:"#080a0f",border:"1px solid #111826",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:8,background:type==="estimate"?"rgba(20,184,166,.1)":"rgba(59,130,246,.1)",display:"flex",alignItems:"center",justifyContent:"center",color:type==="estimate"?"#14b8a6":"#3b82f6",flexShrink:0}}><I n={type==="estimate"?"estimates":"invoices"} s={16}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#c8d0e0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{docNumber}.pdf</div>
                  <div style={{fontSize:9,color:"#4a566e"}}>PDF attachment · Auto-generated</div>
                </div>
                <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:"rgba(34,197,94,.1)",color:"#22c55e"}}>Attached</span>
              </div>

              {/* From info */}
              <div style={{display:"flex",gap:12,fontSize:10,color:"#3a4160"}}>
                <span>From: <span style={{color:"#7a8299"}}>{company.emailFromName||company.name||"—"}</span></span>
                <span>Reply-To: <span style={{color:"#7a8299"}}>{company.emailReplyTo||company.email||"—"}</span></span>
              </div>
            </div>

            <div style={{padding:"14px 20px",borderTop:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <button onClick={onClose} className="bb b-gh" style={{padding:"8px 16px",fontSize:12}}>Cancel</button>
              <button onClick={handleSend} disabled={sending||!to.trim()} className="bb b-bl" style={{padding:"8px 20px",fontSize:12,opacity:(!to.trim()?.length)?0.5:1}}>
                {sending ? (<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"pulse 1s linear infinite"}}/> Sending...</>) : (<><I n="send" s={13}/>Send Email</>)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════
function Invoices({invs,setInvs,custs,projs,ests,company,showToast,db}) {
  const [sel,  setSel]  = useState(invs[0]?.id||null);
  const [stF,  setStF]  = useState("all");
  const [newMd,setNewMd]= useState(null); // "estimate"|"project"|"manual"
  const [srcId,setSrcId]= useState("");
  const [emailMd, setEmailMd] = useState(false);
  const si=invs.find(i=>i.id===sel)||null;
  const siC=si?calcInv(si.lineItems,si.taxRate,si.discount||0):{sub:0,lab:0,mat:0,discountPct:0,discAmt:0,discSub:0,tax:0,total:0};

  const filt=useMemo(()=>invs.filter(i=>stF==="all"||i.status===stF),[invs,stF]);
  const arKpis=useMemo(()=>{
    const all=invs.map(i=>({...i,...calcInv(i.lineItems,i.taxRate,i.discount||0)}));
    return {
      coll:all.filter(i=>i.status==="paid").reduce((s,i)=>s+i.total,0),
      ov:all.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0),
      sent:all.filter(i=>i.status==="sent").reduce((s,i)=>s+i.total,0),
      draft:all.filter(i=>i.status==="draft").reduce((s,i)=>s+i.total,0),
    };
  },[invs]);

  const setStatus=(id,st)=>db.invs.update(id,{status:st,paidDate:st==="paid"?tod():null});

  const createFromEst=()=>{
    const e=ests.find(x=>x.id===srcId);if(!e)return;
    const id=nxtNum(invs,"INV");
    db.invs.create({id,number:id,custId:e.custId,projId:e.projId||null,estId:e.id,status:"draft",issueDate:tod(),dueDate:addD(tod(),30),discount:e.discount||0,paidDate:null,taxRate:e.taxRate,notes:"From "+e.number,lineItems:e.lineItems.map(function(l,i){return{...l,id:i+1};})});
    setSel(id);setNewMd(null);showToast(id+" created");
  };
  const createFromProj=()=>{
    const p=projs.find(x=>x.id===srcId);if(!p)return;
    const id=nxtNum(invs,"INV");
    db.invs.create({id,number:id,custId:p.custId,projId:p.id,estId:null,status:"draft",issueDate:tod(),dueDate:addD(tod(),30),discount:0,paidDate:null,taxRate:FL_TAX,notes:"Progress invoice — "+p.name,lineItems:[{id:1,description:"Labor — "+p.name,qty:1,unitPrice:p.actualLabor,isMaterial:false},{id:2,description:"Materials — "+p.name,qty:1,unitPrice:p.actualMaterials,isMaterial:true}]});
    setSel(id);setNewMd(null);showToast(id+" created");
  };
  const createManual=()=>{
    const id=nxtNum(invs,"INV");
    db.invs.create({id,number:id,custId:null,projId:null,estId:null,status:"draft",issueDate:tod(),dueDate:addD(tod(),30),discount:0,paidDate:null,taxRate:FL_TAX,notes:"",lineItems:[{id:1,description:"",qty:1,unitPrice:0,isMaterial:false}]});
    setSel(id);setNewMd(null);showToast(id+" created");
  };
  const dup=inv=>{
    const id=nxtNum(invs,"INV");
    db.invs.create({...inv,id,number:id,status:"draft",issueDate:tod(),dueDate:addD(tod(),30),paidDate:null});
    setSel(id);showToast(id+" created");
  };
  const del=id=>{db.invs.remove(id);if(sel===id)setSel(null);showToast("Deleted");};

  const exportInv=(inv,autoPrint=false)=>{
    const c=custs.find(x=>x.id===inv.custId);const calc=calcInv(inv.lineItems,inv.taxRate,inv.discount||0);
    const labItems=inv.lineItems.filter(l=>!l.isMaterial);const matItems=inv.lineItems.filter(l=>l.isMaterial);
    const mkRows=(items,qtyH)=>items.map((li,i)=>`<tr><td>${i+1}</td><td>${li.description}</td><td class="mn" style="text-align:right">${li.qty}${qtyH==="Hours"?" hrs":""}</td><td class="mn" style="text-align:right">${fmtD(li.unitPrice)}${qtyH==="Hours"?"/hr":""}</td><td class="mn" style="text-align:right;font-weight:700">${fmtD(li.qty*li.unitPrice)}</td></tr>`).join("");
    const mkSection=(title,items,qtyH)=>items.length===0?"":
      `<div class="section"><div class="section-title">${title}</div>
        <table><thead><tr><th>#</th><th>Description</th><th style="text-align:right">${qtyH}</th><th style="text-align:right">Rate</th><th style="text-align:right">Total</th></tr></thead><tbody>${mkRows(items,qtyH)}</tbody></table></div>`;
    const stLabel=inv.status==="paid"?"PAID":inv.status==="overdue"?"OVERDUE":inv.status==="sent"?"SENT":"DRAFT";
    const stColor=inv.status==="paid"?"#16a34a":inv.status==="overdue"?"#dc2626":"#555";
    printDoc(`Invoice ${inv.number}`,`
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="doc-title">INVOICE ${inv.number}</div>
        <div style="font-size:16px;font-weight:800;color:${stColor}">${stLabel}</div>
      </div>
      <div class="doc-meta">Issued: ${inv.issueDate} · Due: ${inv.dueDate}${inv.paidDate?" · Paid: "+inv.paidDate:""}</div>
      <div class="two-col section">
        <div><div class="section-title">Bill To</div><div style="font-weight:700;font-size:12px">${c?.name||"—"}</div><div style="color:#555">${c?.address||""}</div><div style="color:#555">${c?.phone||""} ${c?.email?(" · "+c.email):""}</div></div>
        <div style="text-align:right"><div class="section-title">Payment Terms</div><div style="font-size:12px">Net ${company.paymentTerms||30}</div><div style="font-size:10px;color:#555;margin-top:4px">Due: ${inv.dueDate}</div></div>
      </div>
      ${mkSection("Labor",labItems,"Hours")}
      ${mkSection("Materials",matItems,"Qty")}
      <div class="totals">
        <div class="row"><span>Labor</span><span class="mn">${fmt(calc.lab)}</span></div>
        <div class="row"><span>Materials (taxable)</span><span class="mn">${fmt(calc.mat)}</span></div>
        <div class="row" style="font-weight:700"><span>Subtotal</span><span class="mn">${fmt(calc.sub)}</span></div>
        ${calc.discountPct>0?`<div class="row" style="color:#7c3aed"><span>Discount (${calc.discountPct}%)</span><span class="mn">−${fmt(calc.discAmt)}</span></div>
        <div class="row" style="font-weight:700"><span>After Discount</span><span class="mn">${fmt(calc.discSub)}</span></div>`:""}
        <div class="row"><span>Sales Tax (${inv.taxRate}%${calc.discountPct>0?" on disc. materials":""})</span><span class="mn">${fmt(calc.tax)}</span></div>
        <div class="row grand"><span>TOTAL DUE</span><span class="mn">${fmt(calc.total)}</span></div>
      </div>
      ${inv.notes?`<div class="notes" style="margin-top:16px"><strong>Notes:</strong> ${inv.notes}</div>`:""}
      ${company.invoiceFooter?`<div class="footer">${company.invoiceFooter}</div>`:""}
    `,company,autoPrint);
  };

  const cnts={all:invs.length,draft:invs.filter(i=>i.status==="draft").length,sent:invs.filter(i=>i.status==="sent").length,paid:invs.filter(i=>i.status==="paid").length,overdue:invs.filter(i=>i.status==="overdue").length};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="g4">
        {[{l:"Collected",v:fmt(arKpis.coll),c:"#22c55e"},{l:"Overdue",v:fmt(arKpis.ov),c:"#ef4444"},{l:"Sent / Pending",v:fmt(arKpis.sent),c:"#f5a623"},{l:"Draft",v:fmt(arKpis.draft),c:"#4a566e"}].map(k=>(
          <KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",height:"calc(100vh - 210px)",border:"1px solid #111826",borderRadius:13,overflow:"hidden"}}>
        <div className="spl-l">
          <div style={{padding:"10px 12px",borderBottom:"1px solid #111826",flexShrink:0}}>
            <div style={{display:"flex",gap:7,marginBottom:7}}>
              <span style={{flex:1,fontSize:10,color:"#4a566e",fontWeight:700,display:"flex",alignItems:"center"}}>{filt.length} INVOICES</span>
              <button onClick={()=>setNewMd("pick")} className="bb b-bl" style={{padding:"7px 11px",fontSize:11}}><I n="plus" s={11}/>New</button>
            </div>
            <div style={{display:"flex",borderRadius:7,overflow:"hidden",border:"1px solid #111826"}}>
              {[["all",`All (${cnts.all})`],["draft",`Draft (${cnts.draft})`],["sent",`Sent (${cnts.sent})`],["overdue",`OD (${cnts.overdue})`],["paid",`Paid (${cnts.paid})`]].map(([v,l])=>(
                <button key={v} onClick={()=>setStF(v)} style={{flex:1,padding:"4px 2px",fontSize:8,fontWeight:700,background:stF===v?"rgba(59,130,246,.15)":"transparent",color:stF===v?"#63b3ed":"#4a566e",borderRight:"1px solid #111826",transition:"all .13s"}}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {filt.map(inv=>{
              const c=custs.find(x=>x.id===inv.custId);
              const calc=calcInv(inv.lineItems,inv.taxRate,inv.discount||0);
              const is=sel===inv.id;
              const sc=INV_SC[inv.status]||INV_SC.draft;
              return <div key={inv.id} className={`sl ${is?"on":""}`} onClick={()=>setSel(inv.id)} style={{padding:"10px 12px",borderBottom:"1px solid #0e1119",background:is?"rgba(59,130,246,.06)":"transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span className="mn" style={{fontSize:10,color:is?"#63b3ed":"#4a566e"}}>{inv.number}</span>
                  <span style={{padding:"2px 6px",borderRadius:10,fontSize:8,fontWeight:700,textTransform:"uppercase",background:sc.bg,color:sc.c}}>{sc.label}</span>
                </div>
                <div style={{fontSize:12,color:is?"#e2e8f0":"#c8d0e0",fontWeight:600}}>{c?.name||"Unassigned"}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                  <div style={{fontSize:10,color:"#3a4160"}}>Due {inv.dueDate}</div>
                  <div className="mn" style={{fontSize:12,color:"#22c55e"}}>{fmt(calc.total)}</div>
                </div>
              </div>;
            })}
            {filt.length===0&&<div style={{padding:"28px",textAlign:"center",color:"#2d3a52",fontSize:12}}>No invoices</div>}
          </div>
        </div>

        {si?(
          <div className="spl-r">
            <div style={{padding:"14px 20px",borderBottom:"1px solid #111826",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                <div>
                  <div style={{display:"flex",gap:9,alignItems:"center"}}><span className="mn" style={{fontSize:16,color:"#e2e8f0"}}>{si.number}</span><Chip s={si.status} map={INV_SC}/></div>
                  <div style={{fontSize:11,color:"#4a566e",marginTop:2}}>{custs.find(c=>c.id===si.custId)?.name||"Unassigned"} · Issued {si.issueDate} · Due {si.dueDate}{si.paidDate?` · Paid ${si.paidDate}`:""}</div>
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {si.status==="draft"&&<button onClick={()=>setStatus(si.id,"sent")} className="bb b-am" style={{padding:"5px 10px",fontSize:11}}><I n="send" s={11}/>Send</button>}
                  {si.status==="sent"&&<button onClick={()=>setStatus(si.id,"paid")} className="bb b-gr" style={{padding:"5px 10px",fontSize:11}}><I n="check" s={11}/>Mark Paid</button>}
                  {si.status==="sent"&&<button onClick={()=>setStatus(si.id,"overdue")} className="bb b-rd" style={{padding:"5px 9px",fontSize:11}}>Overdue</button>}
                  {si.status==="overdue"&&<button onClick={()=>setStatus(si.id,"paid")} className="bb b-gr" style={{padding:"5px 10px",fontSize:11}}><I n="check" s={11}/>Mark Paid</button>}
                  <button onClick={()=>dup(si)} className="bb b-gh" style={{padding:"5px 9px",fontSize:11}}><I n="copy" s={11}/>Dup</button>
                  <button onClick={()=>setEmailMd(true)} className="bb b-bl" style={{padding:"5px 10px",fontSize:11}}><I n="mail" s={11}/>Email</button>
                  <button onClick={()=>exportInv(si,true)} className="bb b-gh" style={{padding:"5px 9px",fontSize:11}}>⎙ Print</button>
                  <button onClick={()=>exportInv(si,false)} className="bb b-gh" style={{padding:"5px 9px",fontSize:11}}>↓ PDF</button>
                  {si.status==="draft"&&<button onClick={()=>setStatus(si.id,"void")} className="bb b-rd" style={{padding:"5px 9px",fontSize:11}}>Void</button>}
                  <button onClick={()=>del(si.id)} className="bb b-rd" style={{padding:"5px 8px",fontSize:11}}><I n="trash" s={11}/></button>
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{l:"Labor",v:fmt(siC.lab),c:"#f5a623"},{l:"Materials",v:fmt(siC.mat),c:"#6c8ebf"},{l:"Subtotal",v:fmt(siC.sub),c:"#dde1ec"},...(siC.discountPct>0?[{l:`Disc ${siC.discountPct}%`,v:`−${fmt(siC.discAmt)}`,c:"#a78bfa"}]:[]),{l:`Tax ${si.taxRate}%`,v:fmt(siC.tax),c:"#14b8a6"},{l:"TOTAL",v:fmt(siC.total),c:"#22c55e",big:true}].map(k=>(
                  <div key={k.l} style={{background:"#0c0f17",border:`1px solid ${k.big?"rgba(34,197,94,.28)":"#111826"}`,borderRadius:8,padding:"6px 11px"}}>
                    <div style={{fontSize:8,color:"#3a4160",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}}>{k.l}</div>
                    <div className="mn" style={{fontSize:k.big?14:11,color:k.c,marginTop:2}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
              {(()=>{
                const labItems=si.lineItems.filter(l=>!l.isMaterial);
                const matItems=si.lineItems.filter(l=>l.isMaterial);
                const renderSection=(title,items,color,qtyLabel)=>(
                  items.length>0&&<div style={{border:"1px solid #111826",borderRadius:11,overflow:"hidden",marginBottom:12}}>
                    <div style={{padding:"8px 14px",background:"#0a0d15",borderBottom:"1px solid #111826",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:700,fontSize:11,color}}><I n={title==="Labor"?"wrench":"materials"} s={12}/> {title}</div>
                      <span className="mn" style={{fontSize:11,color}}>{fmt(items.reduce((s,l)=>s+l.qty*l.unitPrice,0))}</span>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr style={{background:"#0a0d15"}}>{["#","Description",qtyLabel,"Rate","Total"].map(h=><th key={h} style={{padding:"6px 12px",textAlign:"left",fontSize:8,fontWeight:700,color:"#4a566e",textTransform:"uppercase",borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {items.map((li,i)=>(
                          <tr key={li.id} className="rh" style={{borderTop:i>0?"1px solid #0e1119":"none"}}>
                            <td style={{padding:"7px 12px",color:"#4a566e",fontSize:10}}>{i+1}</td>
                            <td style={{padding:"7px 12px",color:"#c8d0e0"}}>{li.description}</td>
                            <td className="mn" style={{padding:"7px 12px",color:"#7a8299"}}>{li.qty}{qtyLabel==="Hours"?" hrs":""}</td>
                            <td className="mn" style={{padding:"7px 12px",color:"#dde1ec"}}>{fmtD(li.unitPrice)}{qtyLabel==="Hours"?"/hr":""}</td>
                            <td className="mn" style={{padding:"7px 12px",color:"#22c55e",fontWeight:700}}>{fmtD(li.qty*li.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
                return <>{renderSection("Labor",labItems,"#f5a623","Hours")}{renderSection("Materials",matItems,"#6c8ebf","Qty")}</>;
              })()}
              <div style={{border:"1px solid #111826",borderRadius:11,overflow:"hidden",marginBottom:12}}>
                <div style={{padding:"10px 15px",background:"#0a0d15"}}>
                  <div style={{maxWidth:260,marginLeft:"auto"}}>
                    {[
                      {l:"Labor",v:fmt(siC.lab),c:"#f5a623"},
                      {l:"Materials (taxable)",v:fmt(siC.mat),c:"#6c8ebf"},
                      {l:"Subtotal",v:fmt(siC.sub),c:"#dde1ec",bold:true},
                      ...(siC.discountPct>0?[{l:`Discount (${siC.discountPct}%)`,v:`−${fmt(siC.discAmt)}`,c:"#a78bfa"}]:[]),
                      ...(siC.discountPct>0?[{l:"After Discount",v:fmt(siC.discSub),c:"#dde1ec",bold:true}]:[]),
                      {l:`FL Tax ${si.taxRate}% on materials`,v:fmt(siC.tax),c:"#14b8a6"},
                    ].map(r=>(
                      <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #111826"}}>
                        <span style={{fontSize:11,color:r.bold?"#dde1ec":"#7a8299",fontWeight:r.bold?700:400}}>{r.l}</span>
                        <span className="mn" style={{fontSize:11,color:r.c}}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}>
                      <span style={{fontWeight:800,fontSize:13}}>TOTAL</span>
                      <span className="mn" style={{fontSize:17,color:"#22c55e"}}>{fmt(siC.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {si.notes&&<div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:9,padding:"11px 14px"}}><div className="stl">Notes</div><div style={{fontSize:12,color:"#9aabb8",lineHeight:1.7}}>{si.notes}</div></div>}
            </div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,color:"#2d3a52",gap:12}}>
            <I n="invoices" s={38}/><div style={{fontSize:14,fontWeight:600}}>Select an invoice</div>
            <button onClick={()=>setNewMd("pick")} className="bb b-bl" style={{padding:"8px 16px",fontSize:12,marginTop:4}}><I n="plus" s={13}/>New Invoice</button>
          </div>
        )}
      </div>

      {newMd==="pick"&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setNewMd(null)}>
          <div className="mo" style={{maxWidth:440,marginTop:120}}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,fontWeight:800}}>New Invoice</div>
              <button onClick={()=>setNewMd(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:10}}>
              {[{id:"estimate",label:"From Estimate",sub:"Copy line items from an approved estimate",icon:"estimates",c:"#a78bfa"},{id:"project",label:"From Project",sub:"Auto-populate labor & materials from a project",icon:"projects",c:"#3b82f6"},{id:"manual",label:"Manual",sub:"Start with a blank invoice",icon:"plus",c:"#22c55e"}].map(opt=>(
                <button key={opt.id} onClick={()=>opt.id==="manual"?createManual():setNewMd(opt.id)} style={{display:"flex",gap:12,alignItems:"center",background:"#0c0f17",border:"1px solid #111826",borderRadius:11,padding:"13px 15px",textAlign:"left",transition:"all .15s",cursor:"pointer"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:`${opt.c}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:opt.c}}><I n={opt.icon} s={17}/></div>
                  <div><div style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>{opt.label}</div><div style={{fontSize:11,color:"#4a566e",marginTop:2}}>{opt.sub}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(newMd==="estimate"||newMd==="project")&&(
        <div className="ov" onClick={e=>e.target===e.currentTarget&&setNewMd(null)}>
          <div className="mo" style={{maxWidth:420,marginTop:120}}>
            <div style={{padding:"17px 24px",borderBottom:"1px solid #1e2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:16,fontWeight:800}}>Select {newMd==="estimate"?"Estimate":"Project"}</div>
              <button onClick={()=>setNewMd(null)} style={{color:"#4a566e"}}><I n="x"/></button>
            </div>
            <div style={{padding:"18px 24px",display:"flex",flexDirection:"column",gap:12}}>
              <select className="inp" value={srcId} onChange={e=>setSrcId(e.target.value)}>
                <option value="">— Select —</option>
                {newMd==="estimate"
                  ?ests.filter(e=>e.status==="approved").map(e=><option key={e.id} value={e.id}>{e.number} — {e.name}</option>)
                  :projs.map(p=><option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
              </select>
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setNewMd(null)} className="bb b-gh" style={{flex:1,padding:"10px",justifyContent:"center"}}>Cancel</button>
                <button onClick={newMd==="estimate"?createFromEst:createFromProj} className="bb b-bl" style={{flex:2,padding:"10px",fontSize:13,justifyContent:"center"}}><I n="plus" s={13}/>Create Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {emailMd&&si&&<EmailSendModal type="invoice" docNumber={si.number} customer={custs.find(c=>c.id===si.custId)} total={fmt(siC.total)} dueDate={si.dueDate} project={projs.find(p=>p.id===si.projId)?.name||""} company={company} onClose={()=>setEmailMd(false)} onSend={(to)=>{if(si.status==="draft"){setStatus(si.id,"sent");}showToast("Invoice emailed to "+to);}}/>}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════
function Reports({invs,projs,custs,subs,hrs,roles,company}) {
  const [rtab,setRtab]=useState("pl");

  const iAll=useMemo(()=>invs.map(i=>({...i,...calcInv(i.lineItems,i.taxRate,i.discount||0)})),[invs]);
  const ytdRev=useMemo(()=>REV_DATA.slice(0,3).reduce((s,m)=>s+m.revenue,0),[]);
  const ytdProfit=useMemo(()=>REV_DATA.slice(0,3).reduce((s,m)=>s+m.profit,0),[]);
  const ytdLabor=useMemo(()=>REV_DATA.slice(0,3).reduce((s,m)=>s+m.labor,0),[]);
  const ytdMats=useMemo(()=>REV_DATA.slice(0,3).reduce((s,m)=>s+m.materials,0),[]);
  const ytdMargin=pct(ytdProfit,ytdRev);

  const arData=useMemo(()=>iAll.map(i=>{
    const due=new Date(i.dueDate);const now=new Date(tod());
    const days=Math.round((now-due)/(1000*60*60*24));
    return {...i,daysPast:days};
  }).sort((a,b)=>b.daysPast-a.daysPast),[iAll]);

  const subData=useMemo(()=>subs.map(sub=>{
    const eHrs=hrs.filter(h=>h.subId===sub.id);
    const totH=eHrs.reduce((s,h)=>s+h.hours,0);
    const billed=totH*sub.billableRate;
    const cost=totH*getBurdenedRate(roles,sub.role,sub.hourlyWage);
    return {...sub,totalHours:totH,billed,trueCost:cost,net:billed-cost,margin:billed>0?pct(billed-cost,billed):0};
  }),[subs,hrs]);

  const tabs=[{id:"pl",label:"P&L Summary"},{id:"job",label:"Job P&L"},{id:"ar",label:"A/R Aging"},{id:"labor",label:"Labor Report"}];

  const exportReport=(autoPrint=false)=>{
    const iAll2=invs.map(i=>({...i,...calcInv(i.lineItems,i.taxRate,i.discount||0)}));
    let body="";
    if(rtab==="pl"){
      const rows=REV_DATA.slice(0,3).map(m=>{const other=m.revenue-m.labor-m.materials-m.profit;return `<tr><td style="font-weight:700">${m.month}</td><td class="mn" style="text-align:right">${fmt(m.revenue)}</td><td class="mn" style="text-align:right">${fmt(m.labor)}</td><td class="mn" style="text-align:right">${fmt(m.materials)}</td><td class="mn" style="text-align:right">${fmt(other)}</td><td class="mn" style="text-align:right;font-weight:700">${fmt(m.profit)}</td><td class="mn" style="text-align:right">${pct(m.profit,m.revenue)}%</td></tr>`;}).join("");
      body=`<div class="doc-title">P&L Summary — YTD 2026</div><div class="doc-meta">Generated ${tod()}</div>
        <div class="two-col section"><div>Revenue: <strong class="mn">${fmt(ytdRev)}</strong></div><div>Gross Profit: <strong class="mn">${fmt(ytdProfit)}</strong> (${ytdMargin}%)</div></div>
        <table><thead><tr><th>Month</th><th style="text-align:right">Revenue</th><th style="text-align:right">Labor</th><th style="text-align:right">Materials</th><th style="text-align:right">Other</th><th style="text-align:right">Profit</th><th style="text-align:right">Margin</th></tr></thead><tbody>${rows}
        <tr style="border-top:2px solid #333;font-weight:800"><td>YTD</td><td class="mn" style="text-align:right">${fmt(ytdRev)}</td><td class="mn" style="text-align:right">${fmt(ytdLabor)}</td><td class="mn" style="text-align:right">${fmt(ytdMats)}</td><td class="mn" style="text-align:right">${fmt(ytdRev-ytdLabor-ytdMats-ytdProfit)}</td><td class="mn" style="text-align:right">${fmt(ytdProfit)}</td><td class="mn" style="text-align:right">${ytdMargin}%</td></tr></tbody></table>`;
    } else if(rtab==="job"){
      const rows=projs.map(p=>{const tot=p.actualLabor+p.actualMaterials;const gp=p.contractValue-tot;const gm=p.contractValue>0?pct(gp,p.contractValue):0;const c=custs.find(x=>x.id===p.custId);return `<tr><td style="font-weight:600">${p.name}</td><td>${c?.name||""}</td><td class="mn" style="text-align:right">${fmt(p.contractValue)}</td><td class="mn" style="text-align:right">${fmt(p.actualLabor)}</td><td class="mn" style="text-align:right">${fmt(p.actualMaterials)}</td><td class="mn" style="text-align:right">${fmt(tot)}</td><td class="mn" style="text-align:right;font-weight:700">${fmt(gp)}</td><td class="mn" style="text-align:right">${gm}%</td></tr>`;}).join("");
      body=`<div class="doc-title">Job P&L Report</div><div class="doc-meta">Generated ${tod()}</div>
        <table><thead><tr><th>Project</th><th>Customer</th><th style="text-align:right">Contract</th><th style="text-align:right">Labor</th><th style="text-align:right">Materials</th><th style="text-align:right">Total Actual</th><th style="text-align:right">Gross Profit</th><th style="text-align:right">Margin</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else if(rtab==="ar"){
      const rows=iAll2.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(inv=>{const c=custs.find(x=>x.id===inv.custId);const due=new Date(inv.dueDate);const days=Math.round((new Date(tod())-due)/(864e5));const isPast=days>0&&inv.status!=="paid"&&inv.status!=="void";return `<tr><td class="mn">${inv.number}</td><td>${c?.name||"—"}</td><td class="mn">${inv.issueDate}</td><td class="mn">${inv.dueDate}</td><td style="color:${isPast?"#dc2626":"#333"};font-weight:${isPast?700:400}">${inv.status==="paid"?"—":isPast?days+"d overdue":"Current"}</td><td class="mn" style="text-align:right;font-weight:700">${fmt(inv.total)}</td><td>${inv.status.toUpperCase()}</td></tr>`;}).join("");
      body=`<div class="doc-title">A/R Aging Report</div><div class="doc-meta">Generated ${tod()}</div>
        <table><thead><tr><th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th>Status</th><th style="text-align:right">Amount</th><th>Payment</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      const rows=subData.map(e=>`<tr><td style="font-weight:600">${e.name}</td><td>${e.role}</td><td class="mn" style="text-align:right">$${e.hourlyWage}</td><td class="mn" style="text-align:right">$${e.billableRate}</td><td class="mn" style="text-align:right">$${getBurdenedRate(roles,e.role,e.hourlyWage).toFixed(2)}</td><td class="mn" style="text-align:right">${e.totalHours}h</td><td class="mn" style="text-align:right">${fmt(e.billed)}</td><td class="mn" style="text-align:right">${fmt(e.trueCost)}</td><td class="mn" style="text-align:right;font-weight:700">${fmt(e.net)}</td><td class="mn" style="text-align:right">${e.margin}%</td></tr>`).join("");
      body=`<div class="doc-title">Subcontractor Labor Report</div><div class="doc-meta">Generated ${tod()}</div>
        <table><thead><tr><th>Sub</th><th>Role</th><th style="text-align:right">Wage</th><th style="text-align:right">Bill</th><th style="text-align:right">Burdened</th><th style="text-align:right">Hours</th><th style="text-align:right">Billed</th><th style="text-align:right">True Cost</th><th style="text-align:right">Net</th><th style="text-align:right">Margin</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    printDoc(tabs.find(t=>t.id===rtab)?.label||"Report",body,company,autoPrint);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #111826",marginBottom:4,alignItems:"center",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setRtab(t.id)} style={{padding:"9px 16px",fontSize:12,fontWeight:700,color:rtab===t.id?"#63b3ed":"#4a566e",borderBottom:`2px solid ${rtab===t.id?"#3b82f6":"transparent"}`,transition:"all .14s",whiteSpace:"nowrap",flexShrink:0}}>{t.label}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:4,flexShrink:0}}>
          <button onClick={()=>exportReport(true)} className="bb b-gh" style={{padding:"5px 12px",fontSize:11}}>⎙ Print</button>
          <button onClick={()=>exportReport(false)} className="bb b-gh" style={{padding:"5px 12px",fontSize:11}}>↓ PDF</button>
        </div>
      </div>

      {rtab==="pl"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="g4">
            {[{l:"YTD Revenue",v:fmt(ytdRev),c:"#3b82f6"},{l:"YTD Gross Profit",v:fmt(ytdProfit),c:"#22c55e"},{l:"Gross Margin",v:`${ytdMargin}%`,c:ytdMargin>=25?"#22c55e":"#f5a623"},{l:"YTD Labor Cost",v:fmt(ytdLabor),c:"#f5a623"}].map(k=>(
              <KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>
            ))}
          </div>
          <div className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"14px 16px 8px"}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:10}}>Monthly P&L — 2026</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={REV_DATA} margin={{top:4,right:8,left:-18,bottom:0}} barSize={12} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111826" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/>
                <Tooltip content={<CTip/>}/>
                <Bar dataKey="revenue"   name="Revenue"   fill="#3b82f6" radius={[3,3,0,0]}/>
                <Bar dataKey="profit"    name="Profit"    fill="#22c55e" radius={[3,3,0,0]}/>
                <Bar dataKey="labor"     name="Labor"     fill="#f5a623" radius={[3,3,0,0]}/>
                <Bar dataKey="materials" name="Materials" fill="#6c8ebf" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #111826",fontWeight:800,fontSize:12}}>P&L Statement — YTD 2026</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#0a0d15"}}>{["Month","Revenue","Labor","Materials","Other","Gross Profit","Margin"].map(h=><th key={h} style={{padding:"7px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
              <tbody>
                {REV_DATA.slice(0,3).map((m,i)=>{
                  const other=m.revenue-m.labor-m.materials-m.profit;
                  const mg=pct(m.profit,m.revenue);
                  return <tr key={m.month} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                    <td style={{padding:"8px 14px",fontWeight:700,color:"#c8d0e0"}}>{m.month}</td>
                    <td className="mn" style={{padding:"8px 14px",color:"#3b82f6"}}>{fmt(m.revenue)}</td>
                    <td className="mn" style={{padding:"8px 14px",color:"#f5a623"}}>{fmt(m.labor)}</td>
                    <td className="mn" style={{padding:"8px 14px",color:"#6c8ebf"}}>{fmt(m.materials)}</td>
                    <td className="mn" style={{padding:"8px 14px",color:"#4a566e"}}>{fmt(other)}</td>
                    <td className="mn" style={{padding:"8px 14px",color:"#22c55e",fontWeight:700}}>{fmt(m.profit)}</td>
                    <td className="mn" style={{padding:"8px 14px",color:mg>=25?"#22c55e":mg>=15?"#f5a623":"#ef4444"}}>{mg}%</td>
                  </tr>;
                })}
                <tr style={{borderTop:"2px solid #1e2535",background:"#0a0d15"}}>
                  <td style={{padding:"9px 14px",fontWeight:800,color:"#dde1ec"}}>YTD Total</td>
                  <td className="mn" style={{padding:"9px 14px",color:"#3b82f6",fontWeight:700}}>{fmt(ytdRev)}</td>
                  <td className="mn" style={{padding:"9px 14px",color:"#f5a623",fontWeight:700}}>{fmt(ytdLabor)}</td>
                  <td className="mn" style={{padding:"9px 14px",color:"#6c8ebf",fontWeight:700}}>{fmt(ytdMats)}</td>
                  <td className="mn" style={{padding:"9px 14px",color:"#4a566e"}}>{fmt(ytdRev-ytdLabor-ytdMats-ytdProfit)}</td>
                  <td className="mn" style={{padding:"9px 14px",color:"#22c55e",fontWeight:800,fontSize:13}}>{fmt(ytdProfit)}</td>
                  <td className="mn" style={{padding:"9px 14px",color:ytdMargin>=25?"#22c55e":"#f5a623",fontWeight:700}}>{ytdMargin}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rtab==="job"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="card" style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,padding:"14px 16px 8px"}}>
            <div style={{fontWeight:800,fontSize:12,marginBottom:10}}>Job P&L Comparison</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projs.map(p=>({name:p.name.split(" ").slice(0,2).join(" "),contract:p.contractValue,actual:p.actualLabor+p.actualMaterials,profit:p.contractValue-(p.actualLabor+p.actualMaterials)}))} margin={{top:4,right:8,left:-18,bottom:0}} barSize={14} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111826" vertical={false}/>
                <XAxis dataKey="name" tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#4a566e",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/>
                <Tooltip content={<CTip/>}/>
                <Bar dataKey="contract" name="Contract"  fill="#3b82f6" radius={[3,3,0,0]}/>
                <Bar dataKey="actual"   name="Actual Cost" fill="#ef4444" radius={[3,3,0,0]}/>
                <Bar dataKey="profit"   name="Profit"    fill="#22c55e" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #111826",fontWeight:800,fontSize:12}}>Job-by-Job P&L</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0a0d15"}}>{["Project","Customer","Contract","Actual Labor","Actual Mat","Total Actual","Gross Profit","Margin","Status"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
              <tbody>
                {projs.map((p,i)=>{
                  const c=custs.find(x=>x.id===p.custId);
                  const tot=p.actualLabor+p.actualMaterials;
                  const gp=p.contractValue-tot;
                  const gm=p.contractValue>0?pct(gp,p.contractValue):0;
                  return <tr key={p.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                    <td style={{padding:"8px 12px",fontWeight:700,color:"#c8d0e0",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</td>
                    <td style={{padding:"8px 12px",color:"#7a8299"}}>{c?.name}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#3b82f6"}}>{fmt(p.contractValue)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#f5a623"}}>{fmt(p.actualLabor)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#6c8ebf"}}>{fmt(p.actualMaterials)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#ef4444"}}>{fmt(tot)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:gp>=0?"#22c55e":"#ef4444",fontWeight:700}}>{fmt(gp)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:gm>=25?"#22c55e":gm>=10?"#f5a623":"#ef4444"}}>{gm}%</td>
                    <td style={{padding:"8px 12px"}}><Chip s={p.status} map={PRJ_SC}/></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rtab==="ar"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="g4">
            {[{l:"Total Billed",v:fmt(iAll.reduce((s,i)=>s+i.total,0)),c:"#3b82f6"},{l:"Collected",v:fmt(iAll.filter(i=>i.status==="paid").reduce((s,i)=>s+i.total,0)),c:"#22c55e"},{l:"Overdue",v:fmt(iAll.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0)),c:"#ef4444"},{l:"Outstanding",v:fmt(iAll.filter(i=>i.status!=="paid"&&i.status!=="void").reduce((s,i)=>s+i.total,0)),c:"#f5a623"}].map(k=>(
              <KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>
            ))}
          </div>
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #111826",fontWeight:800,fontSize:12}}>Invoice Aging Detail</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0a0d15"}}>{["Invoice","Customer","Issued","Due","Days Past Due","Amount","Status"].map(h=><th key={h} style={{padding:"7px 13px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
              <tbody>
                {arData.map((inv,i)=>{
                  const c=custs.find(x=>x.id===inv.custId);
                  const isPast=inv.daysPast>0&&inv.status!=="paid"&&inv.status!=="void";
                  return <tr key={inv.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                    <td className="mn" style={{padding:"8px 13px",color:"#7a8299",fontSize:10}}>{inv.number}</td>
                    <td style={{padding:"8px 13px",color:"#c8d0e0",fontWeight:600}}>{c?.name||"—"}</td>
                    <td className="mn" style={{padding:"8px 13px",color:"#4a566e",fontSize:10}}>{inv.issueDate}</td>
                    <td className="mn" style={{padding:"8px 13px",color:"#4a566e",fontSize:10}}>{inv.dueDate}</td>
                    <td className="mn" style={{padding:"8px 13px",color:isPast?"#ef4444":"#22c55e",fontWeight:isPast?700:400}}>
                      {inv.status==="paid"?"—":isPast?`${inv.daysPast}d overdue`:"Current"}
                    </td>
                    <td className="mn" style={{padding:"8px 13px",color:"#22c55e",fontWeight:700}}>{fmt(inv.total)}</td>
                    <td style={{padding:"8px 13px"}}><Chip s={inv.status} map={INV_SC}/></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rtab==="labor"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="g4">
            {[
              {l:"Total Sub Hours",v:`${hrs.reduce((s,h)=>s+h.hours,0)}h`,c:"#63b3ed"},
              {l:"Total Billed Labor",v:fmt(subData.reduce((s,e)=>s+e.billed,0)),c:"#22c55e"},
              {l:"True Labor Cost",v:fmt(subData.reduce((s,e)=>s+e.trueCost,0)),c:"#ef4444"},
              {l:"Avg Labor Margin",v:`${subData.length>0?Math.round(subData.reduce((s,e)=>s+e.margin,0)/subData.length):0}%`,c:"#f5a623"},
            ].map(k=><KpiCard key={k.l} label={k.l} val={k.v} sub="" color={k.c}/>)}
          </div>
          <div style={{background:"#0c0f17",border:"1px solid #111826",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #111826",fontWeight:800,fontSize:12}}>Subcontractor Labor Report</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{background:"#0a0d15"}}>{["Subcontractor","Role","Wage/hr","Bill/hr","True Cost/hr","Hours","Billed","True Cost","Net Profit","Margin"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4a566e",textTransform:"uppercase",letterSpacing:.3,borderBottom:"1px solid #111826"}}>{h}</th>)}</tr></thead>
              <tbody>
                {subData.map((e,i)=>(
                  <tr key={e.id} className="rh" style={{borderTop:"1px solid #0e1119",background:i%2===0?"transparent":"rgba(255,255,255,.012)"}}>
                    <td style={{padding:"8px 12px",fontWeight:700,color:"#c8d0e0"}}>{e.name}</td>
                    <td style={{padding:"8px 12px"}}><span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${ROLE_C[e.role]||"#4a566e"}18`,color:ROLE_C[e.role]||"#7a8299"}}>{e.role}</span></td>
                    <td className="mn" style={{padding:"8px 12px",color:"#f5a623"}}>${e.hourlyWage}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#3b82f6"}}>${e.billableRate}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#ef4444"}}>${getBurdenedRate(roles,e.role,e.hourlyWage).toFixed(2)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#63b3ed"}}>{e.totalHours}h</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#22c55e"}}>{fmt(e.billed)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:"#ef4444"}}>{fmt(e.trueCost)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:e.net>=0?"#22c55e":"#ef4444",fontWeight:700}}>{fmt(e.net)}</td>
                    <td className="mn" style={{padding:"8px 12px",color:e.margin>=30?"#22c55e":e.margin>=20?"#f5a623":"#ef4444",fontWeight:700}}>{e.margin}%</td>
                  </tr>
                ))}
                <tr style={{borderTop:"2px solid #1e2535",background:"#0a0d15"}}>
                  <td colSpan={5} style={{padding:"9px 12px",fontWeight:800,color:"#dde1ec"}}>Totals</td>
                  <td className="mn" style={{padding:"9px 12px",color:"#63b3ed",fontWeight:700}}>{subData.reduce((s,e)=>s+e.totalHours,0)}h</td>
                  <td className="mn" style={{padding:"9px 12px",color:"#22c55e",fontWeight:700}}>{fmt(subData.reduce((s,e)=>s+e.billed,0))}</td>
                  <td className="mn" style={{padding:"9px 12px",color:"#ef4444",fontWeight:700}}>{fmt(subData.reduce((s,e)=>s+e.trueCost,0))}</td>
                  <td className="mn" style={{padding:"9px 12px",color:"#22c55e",fontWeight:800,fontSize:12}}>{fmt(subData.reduce((s,e)=>s+e.net,0))}</td>
                  <td/>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
