import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://routemater:Lokeshr@routematecluster.r9jiv2d.mongodb.net/?appName=RouteMateCluster';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('RouteMate');

  const filePath = path.resolve(process.cwd(), 'uploads/private/doc_221f2bcc-bca9-4b77-b46d-b146358e60bb.png');
  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath);
    console.log('Read buffer size:', buf.length);
    const base64 = buf.toString('base64');
    const updateResult = await db.collection('verificationRequests').updateMany(
      { status: 'pending' },
      { $set: { documentBase64: base64, documentMimeType: 'image/png' } }
    );
    console.log('Updated verification requests:', updateResult.modifiedCount);
  } else {
    console.log('File not found at:', filePath);
  }
  await client.close();
}

main().catch(console.error);
