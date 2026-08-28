import { buildApp } from '../dist/app.js';
import { connectMongo } from '../dist/db/mongo.js';
import { generateAccessToken } from '../dist/lib/jwt.js';
import { verificationRepository } from '../dist/modules/verification/verification.repository.js';
import { usersRepository } from '../dist/modules/users/users.repository.js';

async function main() {
  await connectMongo();
  const app = await buildApp();
  await app.ready();

  const user = await usersRepository.findUserByEmailNormalized('lokesh.2327cs1097@kiet.edu');
  console.log('User found:', user?._id.toString(), 'Role:', user?.role);

  const pending = await verificationRepository.findPendingQueue(1, 5);
  console.log('Pending count:', pending.totalCount);
  if (pending.items.length > 0) {
    const item = pending.items[0];
    console.log('Item ID:', item._id.toString(), 'hasBase64:', !!item.documentBase64);
    
    // 1. Test GET /admin/verifications
    const token = generateAccessToken({ userId: user?._id.toString() || 'admin_test', role: 'admin' });
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/verifications',
      headers: {
        authorization: 'Bearer ' + token,
      },
    });
    console.log('List status:', listRes.statusCode);
    const listJson = JSON.parse(listRes.payload);
    const firstItem = Array.isArray(listJson.data) ? listJson.data[0] : listJson.data?.items?.[0];
    console.log('First item:', firstItem?.id, 'docUrl:', firstItem?.documentUrl);

    // 2. Test GET document
    const docUrl = firstItem?.documentUrl;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1' + docUrl,
      headers: {
        authorization: 'Bearer ' + token,
      },
    });
    console.log('Doc Status code:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Content-Disposition:', res.headers['content-disposition']);
    console.log('Body length in bytes:', res.rawPayload.length);
  }
  await app.close();
}

main().catch(console.error);
