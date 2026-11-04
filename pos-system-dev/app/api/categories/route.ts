import {db} from "@/lib/db";
import {categories} from "@/lib/schema";


// GET: Fetch all categories

export async function GET() {
  try {
    const result = await db
      .select()
      .from(categories)
      .orderBy(categories.name);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST: Create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert new category
    const [newCategory] = await db
      .insert(categories)
      .values({ name: body.name })
      .returning();

    return new Response(JSON.stringify(newCategory), {
      headers: { "Content-Type": "application/json" },
      status: 201,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}