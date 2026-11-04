import { NextRequest, NextResponse } from "next/server";
import cloudinary from "cloudinary";
import { Readable } from "stream";
import { createSuccessResponse, createErrorResponse } from "@/lib/standards/api-responses";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(createErrorResponse("No file uploaded"), { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const upload = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        { folder: "POS" },
        (error, result) => {
          if (error || !result) return reject(error || new Error("Upload failed"));
          resolve(result as { secure_url: string });
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });

    return NextResponse.json(createSuccessResponse({ url: upload.secure_url }));
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(createErrorResponse("Upload failed"), { status: 500 });
  }
}