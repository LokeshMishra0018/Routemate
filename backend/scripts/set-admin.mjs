import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://routemater:Lokeshr@routematecluster.r9jiv2d.mongodb.net/?appName=RouteMateCluster';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('RouteMate');
  const res = await db.collection('users').updateOne(
    { emailNormalized: 'lokesh.2327cs1097@kiet.edu' },
    { $set: { role: 'admin' } }
  );
  console.log('User role updated to admin:', res.modifiedCount);
  const user = await db.collection('users').findOne({ emailNormalized: 'lokesh.2327cs1097@kiet.edu' });
  console.log('User:', user?.email, 'Role:', user?.role);
  await client.close();
}

main().catch(console.error);
