import { dbConnect } from '@/lib/db/mongo';
import { Shipment } from '@/lib/models/Shipment';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const sh = await Shipment.findById(id).lean();
  if (!sh) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify(sh), { headers: { 'content-type': 'application/json' } });
}

