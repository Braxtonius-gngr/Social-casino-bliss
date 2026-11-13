const DailyRolloverCollector = require('./src/main');

const config = {
    allowedCSPs: ['chumbacasino.com', 'wowvegas.com', 'rolla.app'],
    proxies: ['http://res-node-us-tx.provider.net:8080']
};

const collector = new DailyRolloverCollector('https://dailyrollover.com', config);

async function executeTest() {
    console.log('[TestRunner] Initializing dry run check...');
    const testAccount = { id: 'account_braxton_01' };

    const result = await collector.runAccountCheck(
        testAccount,
        'https://example.com',
        'test-casino-id'
    );

    console.log('[TestRunner] Execution Result:', result);
}

executeTest();
