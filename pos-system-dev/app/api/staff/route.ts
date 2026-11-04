import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { hash } from 'bcryptjs';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const role = searchParams.get('role'); // <-- support role filter

  if (!locationId) {
    return new Response(JSON.stringify({ error: 'locationId is required' }), { status: 400 });
  }

  let query = db.select().from(users).where(eq(users.locationId, locationId));

  // If role is provided, filter by role as well
  if (role) {
    // Cast role to the allowed type
    const allowedRoles = ['ADMIN', 'MANAGER', 'CASHIER'] as const;
    type Role = typeof allowedRoles[number];
    if (allowedRoles.includes(role as Role)) {
      query = db.select().from(users).where(
        and(eq(users.locationId, locationId), eq(users.role, role as Role))
      );
    } else {
      return new Response(JSON.stringify({ error: 'Invalid role value' }), { status: 400 });
    }
  }

  const staffs = await query.orderBy(users.name).limit(100);

  if (!staffs || staffs.length === 0) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }
  return new Response(JSON.stringify(staffs), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
}

// POST: Create a new staff
export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password, role, locationId, status = "active" } = body;

  if (!name || !email || !password || !role || !locationId) {
    return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400 });
  }

  const existingStaff = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingStaff.length > 0) {
    return new Response(JSON.stringify({ error: 'Staff with this email already exists' }), { status: 400 });
  }

  const hashedPassword = await hash(password, 10);
  const [createdStaff] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashedPassword,
      role,
      locationId,
      isActive: status === "active"
    })
    .returning();

  if (!createdStaff) {
    return new Response(JSON.stringify({ error: 'Failed to create staff' }), { status: 500 });
  }

  return new Response(JSON.stringify(createdStaff), {
    headers: { 'Content-Type': 'application/json' },
    status: 201,
  });
}