const DailyRolloverCollector = require('./src/main');

const collector = new DailyRolloverCollector('https://dailyrollover.com', {
    allowedCSPs: ['chumbacasino.com', 'wowvegas.com', 'rolla.app', 'stake.us']
});

async function executeTest() {
    console.log('[TestRunner] Initializing tandem sweep dry run...');
    const testAccount = { id: 'account_braxton_01', autoClick: false };

    const sampleCatalog = [
        { id: 'wow-vegas', url: 'https://www.wowvegas.com', scTier: 'B', resetType: 'fixed', targetHourCT: 5 },
        { id: 'stake-us', url: 'https://stake.us', scTier: 'S', resetType: 'rolling', intervalHours: 24 },
        { id: 'chumba', url: 'https://www.chumbacasino.com', scTier: 'A', resetType: 'fixed', targetHourCT: 5 }
    ];

    const results = await collector.runTandemSweep(testAccount, sampleCatalog);
    console.log('\n[TestRunner] Tandem Sweep Results (Ordered by SC Tier S -> A -> B):');
    console.dir(results, { depth: null });

    console.log('\n[TestRunner] Re-running immediately to verify collision guard skips already-claimed sites...');
    const secondPass = await collector.runTandemSweep(testAccount, sampleCatalog);
    console.log('[TestRunner] Second Pass Count (should be 0):', secondPass.length);
}

executeTest();
