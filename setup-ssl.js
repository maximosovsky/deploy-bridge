// Setup free SSL certificate for ali.osovsky.com via Alibaba Cloud CAS API
// Usage:
//   node setup-ssl.js check    — check free cert quota
//   node setup-ssl.js request  — request free DV cert
//   node setup-ssl.js status   — check cert status
//   node setup-ssl.js list     — list existing certs

require('dotenv').config();
const Cas = require('@alicloud/cas20200407');
const OpenApi = require('@alicloud/openapi-client');

const AK_ID = process.env.ALI_ACCESS_KEY_ID;
const AK_SECRET = process.env.ALI_ACCESS_KEY_SECRET;
const DOMAIN = 'ali.osovsky.com';

if (!AK_ID || !AK_SECRET) {
    console.error('ERROR: Set ALI_ACCESS_KEY_ID and ALI_ACCESS_KEY_SECRET in .env');
    process.exit(1);
}

function createClient() {
    const config = new OpenApi.Config({
        accessKeyId: AK_ID,
        accessKeySecret: AK_SECRET,
        endpoint: 'cas.aliyuncs.com',
    });
    return new Cas.default(config);
}

const client = createClient();

async function checkQuota() {
    console.log('1. Checking free certificate quota...');
    try {
        const req = new Cas.DescribePackageStateRequest({});
        const resp = await client.describePackageState(req);
        console.log('   Quota:', JSON.stringify(resp.body, null, 2));
    } catch (e) {
        console.log('   Error:', e.code || e.message);
        if (e.data) console.log('   Details:', JSON.stringify(e.data, null, 2));
    }
}

async function requestCert() {
    console.log('2. Requesting free DV certificate for ' + DOMAIN + '...');
    try {
        const req = new Cas.CreateCertificateForPackageRequestRequest({
            domain: DOMAIN,
            validateType: 'DNS',
        });
        const resp = await client.createCertificateForPackageRequest(req);
        console.log('   OK! OrderId:', JSON.stringify(resp.body, null, 2));
        console.log('\n   Next: run "node setup-ssl.js status" to check validation status');
    } catch (e) {
        console.log('   Error:', e.code || e.message);
        if (e.data) console.log('   Details:', JSON.stringify(e.data, null, 2));
    }
}

async function checkStatus() {
    console.log('3. Checking certificate status...');
    try {
        // First list certs to find the right one
        const listReq = new Cas.ListUserCertificateOrderRequest({
            currentPage: 1,
            showSize: 50,
        });
        const listResp = await client.listUserCertificateOrder(listReq);
        const orders = listResp.body.certificateOrderList || [];

        if (orders.length === 0) {
            console.log('   No certificates found. Run "request" first.');
            return;
        }

        for (const order of orders) {
            console.log('\n   Certificate:');
            console.log('     Domain:', order.domain);
            console.log('     Status:', order.status);
            console.log('     OrderId:', order.orderId);
            console.log('     CertId:', order.certificateId);

            if (order.orderId) {
                try {
                    const stateReq = new Cas.DescribeCertificateStateRequest({
                        orderId: order.orderId,
                    });
                    const stateResp = await client.describeCertificateState(stateReq);
                    console.log('     State details:', JSON.stringify(stateResp.body, null, 2));
                } catch (e2) {
                    console.log('     State check error:', e2.code || e2.message);
                }
            }
        }
    } catch (e) {
        console.log('   Error:', e.code || e.message);
        if (e.data) console.log('   Details:', JSON.stringify(e.data, null, 2));
    }
}

async function main() {
    console.log('=== SSL Certificate Setup for ' + DOMAIN + ' ===\n');

    const mode = process.argv[2] || 'check';

    switch (mode) {
        case 'check':
            await checkQuota();
            break;
        case 'request':
            await requestCert();
            break;
        case 'status':
            await checkStatus();
            break;
        case 'list':
            await checkStatus(); // same as status
            break;
        default:
            console.log('Usage: node setup-ssl.js [check|request|status|list]');
    }
}

main().catch(function (e) {
    console.error('FATAL:', e.message);
    if (e.data) console.error('Details:', JSON.stringify(e.data, null, 2));
    process.exit(1);
});
