import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSKU } from "@/lib/sku-generator";

// POST: Generate SKU based on product name and category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productName, category } = body;

    if (!productName || productName.trim() === '') {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const sku = await generateSKU({
      businessId: session.user.businessId,
      category: category || 'General',
      productName: productName.trim()
    });

    return NextResponse.json({ sku });
  } catch (error) {
    console.error("Error generating SKU:", error);
    return NextResponse.json({ error: "Failed to generate SKU" }, { status: 500 });
  }
}
