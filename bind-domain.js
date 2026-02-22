// Bind custom domain to OSS bucket
// Usage: node bind-domain.js

require('dotenv').config();
const crypto = require('crypto');

const AK_ID = process.env.ALI_ACCESS_KEY_ID;
const AK_SECRET = process.env.ALI_ACCESS_KEY_SECRET;
const BUCKET = process.env.ALI_BUCKET || 'wallplan-deploy';
const REGION = process.env.ALI_REGION || 'oss-ap-southeast-1';
const GODADDY_KEY = process.env.GODADDY_KEY;
const GODADDY_SECRET = process.env.GODADDY_SECRET;

const SUBDOMAIN = 'ali';
const DOMAIN = 'osovsky.com';
const FULL_DOMAIN = SUBDOMAIN + '.' + DOMAIN;
const CNAME_TARGET = BUCKET + '.' + REGION + '.aliyuncs.com';

if (!AK_ID || !AK_SECRET) {
    console.error('ERROR: ALI_ACCESS_KEY_ID and ALI_ACCESS_KEY_SECRET must be set in .env');
    process.exit(1);
}

async function getVerificationToken() {
    console.log('1. Getting CNAME verification token...');

    var date = new Date().toUTCString();
    var body = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<BucketCnameConfiguration><Cname><Domain>' + FULL_DOMAIN + '</Domain></Cname></BucketCnameConfiguration>';

    var contentMd5 = crypto.createHash('md5').update(body).digest('base64');
    var contentType = 'application/xml';
    var stringToSign = 'POST\n' + contentMd5 + '\n' + contentType + '\n' + date + '\n/' + BUCKET + '/?cname&comp=token';
    var signature = crypto.createHmac('sha1', AK_SECRET).update(stringToSign).digest('base64');
    var url = 'https://' + BUCKET + '.' + REGION + '.aliyuncs.com/?cname&comp=token';

    var res = await fetch(url, {
        method: 'POST',
        headers: {
            'Date': date,
            'Content-Type': contentType,
            'Content-MD5': contentMd5,
            'Authorization': 'OSS ' + AK_ID + ':' + signature,
        },
        body: body,
    });

    var text = await res.text();
    if (res.ok) {
        var match = text.match(/<Token>(.*?)<\/Token>/);
        if (match) {
            console.log('   ✓ Token: ' + match[1]);
            console.log('   → Add TXT record: _dnsauth.' + SUBDOMAIN + '.' + DOMAIN + ' = ' + match[1]);
            return match[1];
        }
    }
    console.log('   ✗ ' + text);
    return null;
}

async function bindDomain() {
    console.log('\n2. Binding ' + FULL_DOMAIN + ' to bucket...');

    var date = new Date().toUTCString();
    var body = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<BucketCnameConfiguration><Cname><Domain>' + FULL_DOMAIN + '</Domain></Cname></BucketCnameConfiguration>';

    var contentMd5 = crypto.createHash('md5').update(body).digest('base64');
    var contentType = 'application/xml';
    var stringToSign = 'POST\n' + contentMd5 + '\n' + contentType + '\n' + date + '\n/' + BUCKET + '/?cname&comp=add';
    var signature = crypto.createHmac('sha1', AK_SECRET).update(stringToSign).digest('base64');
    var url = 'https://' + BUCKET + '.' + REGION + '.aliyuncs.com/?cname&comp=add';

    var res = await fetch(url, {
        method: 'POST',
        headers: {
            'Date': date,
            'Content-Type': contentType,
            'Content-MD5': contentMd5,
            'Authorization': 'OSS ' + AK_ID + ':' + signature,
        },
        body: body,
    });

    if (res.ok) {
        console.log('   ✓ Domain bound successfully!');
    } else {
        var text = await res.text();
        console.log('   ✗ ' + res.status + ': ' + text);
    }
}

async function main() {
    console.log('=== Domain Binding: ' + FULL_DOMAIN + ' ===\n');

    var mode = process.argv[2] || 'bind';

    if (mode === 'token') {
        await getVerificationToken();
    } else {
        await bindDomain();
    }

    console.log('\n→ http://' + FULL_DOMAIN + '/wallplan/@yka_yka/index.html');
}

main().catch(function (e) { console.error('FATAL:', e.message); process.exit(1); });
