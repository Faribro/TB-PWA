import { prisma } from '../lib/prisma';

interface StateSheetConfig {
  state: string;
  pcSheetId: string;
  spmSheetId: string;
}

const STATE_SHEETS: StateSheetConfig[] = [
  {
    state: 'Maharashtra',
    pcSheetId: '1DAlZODhgi1qT6cmEdYYdubvLjQERyhenfUPJ85BO2cU',
    spmSheetId: '1WVQmeHAF9dmDgOZPBDep5AgdcahCL-DuTC_76pagvxg',
  },
  {
    state: 'Gujarat',
    pcSheetId: '1YkhSNHBgNy9zdoLB9bE2ItQJAS51WVorAzfrlri3fEQ',
    spmSheetId: '12sH8QnzvlMCyCKEoMNS4A0Ud5zcWVkkNSfLwqCIEJ_4',
  },
  {
    state: 'Jammu & Kashmir',
    pcSheetId: '1_dol7gdFWVwafuA90FHt3TWdo4LuRx860TiS9_VFVh0',
    spmSheetId: '1ZAgpHYZv5D1Dojzn9IB7EjPseY9joopLlRs7pMdA3wo',
  },
  {
    state: 'Madhya Pradesh',
    pcSheetId: '1LBixjJWpqSeVc4WKU6uCKJAeBVasAIvYN4QYUgra1_U',
    spmSheetId: '16Oothn3pNA61s2V8cc9P32ywRqv2Cfv3ZJKvYa_Z5ag',
  },
  {
    state: 'Goa',
    pcSheetId: '1GV7KavaE8FrGSIKZFT50tGH3GQ7hls6CPS0m1NKCqnE',
    spmSheetId: '1o-nJcYhaKEVDKGGooWANFGcP_kXqHQ_Wp4BL-7KDyE4',
  },
  {
    state: 'Mizoram',
    pcSheetId: '1WvctV5n6jMYvdPIRJFKM0JSqkk3_YKq1Ce37wnHCh2g',
    spmSheetId: '1kNRGmyCfyRsshsgeZQ2NRpowOviW0xH1tso_V8-WrV4',
  },
  {
    state: 'Uttarakhand',
    pcSheetId: '1tn54AeY3gAQBMP9vpzRl-mTnxyHApAwKQzfir6VJUBw',
    spmSheetId: '1J1jZ3_Gpp6IxQkzGo_cSUv_ZPbJdpWVLxSgCIbAk-jQ',
  },
];

async function seed() {
  console.log('🌱 Seeding SheetRegistry with 7 States PC & SPM spreadsheets...');
  
  for (const item of STATE_SHEETS) {
    // Upsert PC Sheet
    await prisma.sheet_registry.upsert({
      where: {
        state_sheet_type: {
          state: item.state,
          sheet_type: 'PC',
        },
      },
      update: {
        spreadsheet_id: item.pcSheetId,
      },
      create: {
        state: item.state,
        sheet_type: 'PC',
        spreadsheet_id: item.pcSheetId,
      },
    });

    // Upsert SPM Sheet
    await prisma.sheet_registry.upsert({
      where: {
        state_sheet_type: {
          state: item.state,
          sheet_type: 'SPM',
        },
      },
      update: {
        spreadsheet_id: item.spmSheetId,
      },
      create: {
        state: item.state,
        sheet_type: 'SPM',
        spreadsheet_id: item.spmSheetId,
      },
    });

    console.log(`✅ Seeded ${item.state} (PC: ${item.pcSheetId.slice(0, 8)}..., SPM: ${item.spmSheetId.slice(0, 8)}...)`);
  }

  // Also seed default admin profile
  await prisma.profiles.upsert({
    where: { email: 'admin@allianceindia.org' },
    update: { role: 'Admin', staff_name: 'Alliance India Administrator' },
    create: {
      email: 'admin@allianceindia.org',
      role: 'Admin',
      staff_name: 'Alliance India Administrator',
      state: 'All',
      district: 'All',
    },
  });
  console.log('✅ Seeded default admin profile');

  const count = await prisma.sheet_registry.count();
  console.log(`✨ Successfully seeded ${count} sheet registry records.`);
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
