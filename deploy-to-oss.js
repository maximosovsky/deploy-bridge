// Deploy WallPlan to Alibaba Cloud OSS
// Usage: node deploy-to-oss.js

require('dotenv').config();
const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');

// === CONFIG from .env ===
const ACCESS_KEY_ID = process.env.ALI_ACCESS_KEY_ID;
const ACCESS_KEY_SECRET = process.env.ALI_ACCESS_KEY_SECRET;
const REGION = process.env.ALI_REGION || 'oss-ap-southeast-1';
const BUCKET_NAME = process.env.ALI_BUCKET || 'wallplan-deploy';

if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET) {
    console.error('ERROR: ALI_ACCESS_KEY_ID and ALI_ACCESS_KEY_SECRET must be set in .env');
    process.exit(1);
}

const WALLPLAN_DIR = path.resolve(__dirname, '..', 'WallPlan');

// Files/folders to upload (relative to WallPlan root)
const INCLUDE_PATHS = [
    '@yka_yka/index.html',
    '@yka_yka/calendar-ru.js',
    'style.css',
    'manifest.json',
    'og-image.jpg',
    'wallplan.webp',
    'fonts',
];

// MIME types
const MIME_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
};

function getMime(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_MAP[ext] || 'application/octet-stream';
}

function listFiles(dir) {
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...listFiles(full));
        } else {
            result.push(full);
        }
    }
    return result;
}

async function main() {
    console.log('=== DeployBridge: WallPlan → Alibaba Cloud OSS ===\n');

    const client = new OSS({
        region: REGION,
        accessKeyId: ACCESS_KEY_ID,
        accessKeySecret: ACCESS_KEY_SECRET,
    });

    console.log(`1. Creating bucket "${BUCKET_NAME}"...`);
    try {
        await client.putBucket(BUCKET_NAME, { storageClass: 'Standard', acl: 'public-read' });
        console.log('   ✓ Bucket created');
    } catch (e) {
        if (e.code === 'BucketAlreadyExists' || e.status === 409) {
            console.log('   ✓ Bucket already exists');
        } else {
            console.error('   ✗ Error:', e.message);
            throw e;
        }
    }

    client.useBucket(BUCKET_NAME);

    console.log('2. Enabling static website hosting...');
    try {
        await client.putBucketWebsite(BUCKET_NAME, { index: 'index.html', error: 'index.html' });
        console.log('   ✓ Static website hosting enabled');
    } catch (e) {
        console.error('   ✗ Error:', e.message);
    }

    console.log('3. Collecting files...');
    const filesToUpload = [];

    for (const p of INCLUDE_PATHS) {
        const fullPath = path.join(WALLPLAN_DIR, p);
        if (!fs.existsSync(fullPath)) {
            console.log(`   ⚠ Skipping (not found): ${p}`);
            continue;
        }
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            const files = listFiles(fullPath);
            for (const f of files) {
                const rel = path.relative(WALLPLAN_DIR, f).replace(/\\/g, '/');
                filesToUpload.push({ local: f, remote: `wallplan/${rel}` });
            }
        } else {
            const rel = path.relative(WALLPLAN_DIR, fullPath).replace(/\\/g, '/');
            filesToUpload.push({ local: fullPath, remote: `wallplan/${rel}` });
        }
    }

    console.log(`   Found ${filesToUpload.length} files to upload\n`);

    console.log('4. Uploading files...');
    let uploaded = 0;
    let failed = 0;

    for (const file of filesToUpload) {
        try {
            await client.put(file.remote, file.local, {
                headers: { 'Content-Type': getMime(file.local) },
            });
            uploaded++;
            console.log(`   ✓ ${file.remote}`);
        } catch (e) {
            failed++;
            console.error(`   ✗ ${file.remote}: ${e.message}`);
        }
    }

    console.log(`\n5. Done! ${uploaded} uploaded, ${failed} failed.\n`);

    const url = `https://${BUCKET_NAME}.${REGION}.aliyuncs.com/wallplan/@yka_yka/index.html`;
    console.log('=== Your site is live! ===');
    console.log(`URL: ${url}`);
}

main().catch(err => {
    console.error('\nFATAL:', err.message);
    process.exit(1);
});
