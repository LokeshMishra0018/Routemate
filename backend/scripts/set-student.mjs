import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://routemater:Lokeshr@routematecluster.r9jiv2d.mongodb.net/?appName=RouteMateCluster';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('RouteMate');
  
  // Set role back to student
  const res = await db.collection('users').updateOne(
    { emailNormalized: 'lokesh.2327cs1097@kiet.edu' },
    { $set: { role: 'student' } }
  );
  console.log('User role updated to student:', res.modifiedCount);

  const user = await db.collection('users').findOne({ emailNormalized: 'lokesh.2327cs1097@kiet.edu' });
  const profile = await db.collection('profiles').findOne({ userId: user._id.toHexString() });
  console.log('User:', user?.email, 'Role:', user?.role);
  console.log('Profile Verification Status:', profile?.verificationStatus);

  await client.close();
}

main().catch(console.error);
