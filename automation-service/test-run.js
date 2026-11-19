// Dry run of a sweep: no browser opens and nothing is claimed or recorded
// (LIVE_BROWSER is not "true"). Shows the order sites would run in, what is
// skipped and why, and that a dry run never changes your timers.
const DailyRolloverCollector = require('./src/main');

const collector = new DailyRolloverCollector('https://dailyrollover.com', {
    // The only domains the runner may visit.
    allowedDomains: ['chumbacasino.com', 'wowvegas.com', 'rolla.app', 'stake.us']
});

async function executeTest() {
    console.log('[TestRunner] Dry-run sweep...');
    const testAccount = { id: 'account_braxton_01', autoClick: false };

    // `name` must match the platform's name in your dailyrollover.com deck;
    // with Supabase on, the deck's reset rule and timers are used. The
    // resetHour / cooldownHours here are the fallback when it isn't.
    const sampleCatalog = [
        { id: 'wow-vegas', name: 'Wow Vegas', url: 'https://www.wowvegas.com', scTier: 'B', resetHour: 5 },
        { id: 'stake-us', name: 'Stake.us', url: 'https://stake.us', scTier: 'S', cooldownHours: 24 },
        { id: 'chumba', name: 'Chumba Casino', url: 'https://www.chumbacasino.com', scTier: 'A', resetHour: 0 },
        { id: 'not-allowed', name: 'Elsewhere', url: 'https://example.com', scTier: 'S', cooldownHours: 24 }
    ];

    const results = await collector.runTandemSweep(testAccount, sampleCatalog);
    console.log('\n[TestRunner] First pass (SC tier order S -> A -> B; example.com skipped):');
    console.dir(results.map(r => `${r.casinoId}: ${r.status}`), { depth: null });

    const secondPass = await collector.runTandemSweep(testAccount, sampleCatalog);
    console.log('[TestRunner] Second pass count (a dry run records nothing, so the same 3 are still due):', secondPass.length);
}

executeTest();
