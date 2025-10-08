import { dbConnect } from '@/lib/db/mongo';
import { Location } from '@/lib/models/Location';

export async function listLocations() {
  await dbConnect();
  const docs = await Location.find({}).sort({ code: 1 }).lean();
  return docs.map((d: any) => ({ ...d, _id: String(d._id) }));
}

export async function upsertLocation(input: any, id?: string) {
  await dbConnect();
  if (id) {
    const updated = await Location.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).lean();
    return { location: updated };
  }
  const created = await Location.create(input);
  return { location: created.toObject() };
}
