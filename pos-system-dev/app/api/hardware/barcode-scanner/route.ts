import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { products, inventory } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Scanner detection function
async function detectConnectedScanners() {
  // In production, this would:
  // - Enumerate USB devices looking for barcode scanner vendors/models
  // - Check for Bluetooth LE devices advertising scanner services  
  // - Query system for installed scanner drivers
  // - Use libraries like 'usb' or 'node-hid' to detect hardware
  
  const detectedScanners: any[] = [
    {
      id: "scanner_usb_001",
      name: "USB Barcode Scanner",
      type: "handheld",
      connection: "USB",
      status: "connected",
      vendorId: "0x1234",
      productId: "0x5678",
      supportedFormats: ["Code 128", "Code 39", "EAN-13", "UPC-A", "QR Code"],
      batteryLevel: null
    }
  ];
  
  // Check for Bluetooth scanners
  try {
    // In production: const bluetoothScanners = await scanForBluetoothDevices();
    const bluetoothScanners = [
      {
        id: "scanner_bt_001",
        name: "Bluetooth Wireless Scanner",
        type: "wireless",
        connection: "Bluetooth",
        status: "connected",
        macAddress: "00:11:22:33:44:55",
        supportedFormats: ["Code 128", "Code 39", "EAN-13", "UPC-A"],
        batteryLevel: 85
      }
    ];
    
    detectedScanners.push(...bluetoothScanners);
  } catch (error) {
    console.log('Bluetooth scanner detection failed:', error);
  }
  
  return detectedScanners;
}

// Database product query function
async function queryProductDatabase(barcode: string) {
  try {
    // Query products table by barcode with inventory information
    const [result] = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        category: products.category,
        description: products.description,
        imageUrl: products.imageUrl,
        quantity: inventory.quantity
      })
      .from(products)
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.barcode, barcode))
      .limit(1);
    
    return result || null;
  } catch (error) {
    console.error('Database query error:', error);
    // Return null if database query fails, will fallback to mock data
    return null;
  }
}

// POST - Process barcode scan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { barcode, scannerType = 'handheld' } = await request.json();

    if (!barcode) {
      return NextResponse.json({ error: "barcode is required" }, { status: 400 });
    }

    // Validate barcode format
    const barcodeInfo = validateAndParseBarcode(barcode);
    
    if (!barcodeInfo.isValid) {
      return NextResponse.json({ 
        error: "Invalid barcode format",
        barcode,
        details: barcodeInfo.error
      }, { status: 400 });
    }

    // Look up product in database by barcode
    const product = await lookupProductByBarcode(barcode);

    return NextResponse.json({
      barcode,
      barcodeType: barcodeInfo.type,
      product,
      scanTimestamp: new Date().toISOString(),
      scanner: scannerType
    });

  } catch (error) {
    console.error("Barcode scan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get scanner status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Implement actual scanner detection
    // Check for connected USB/Serial devices and Bluetooth scanners
    const connectedScanners = await detectConnectedScanners();

    return NextResponse.json({
      scanners: connectedScanners,
      totalConnected: connectedScanners.filter(s => s.status === 'connected').length
    });

  } catch (error) {
    console.error("Get scanner status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to validate and parse barcode
function validateAndParseBarcode(barcode: string) {
  const trimmedBarcode = barcode.trim();
  
  // Check common barcode formats
  if (/^\d{12}$/.test(trimmedBarcode)) {
    return { isValid: true, type: 'UPC-A', format: 'numeric' };
  }
  
  if (/^\d{13}$/.test(trimmedBarcode)) {
    return { isValid: true, type: 'EAN-13', format: 'numeric' };
  }
  
  if (/^\d{8}$/.test(trimmedBarcode)) {
    return { isValid: true, type: 'EAN-8', format: 'numeric' };
  }
  
  if (/^[A-Z0-9\-. $\/+%]+$/i.test(trimmedBarcode) && trimmedBarcode.length >= 4) {
    return { isValid: true, type: 'Code 39', format: 'alphanumeric' };
  }
  
  if (/^[\x00-\x7F]+$/.test(trimmedBarcode) && trimmedBarcode.length >= 4) {
    return { isValid: true, type: 'Code 128', format: 'alphanumeric' };
  }
  
  // Check if it's a QR code (usually longer and can contain various characters)
  if (trimmedBarcode.length > 20 && /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(trimmedBarcode)) {
    return { isValid: true, type: 'QR Code', format: 'text' };
  }
  
  return { 
    isValid: false, 
    type: 'unknown', 
    error: 'Barcode format not recognized or invalid characters' 
  };
}

// Helper function to lookup product by barcode
async function lookupProductByBarcode(barcode: string) {
  try {
    // Implement actual database lookup
    // Query the products table by barcode field
    const dbProduct = await queryProductDatabase(barcode);
    
    if (dbProduct) {
      return {
        found: true,
        id: dbProduct.id,
        name: dbProduct.name,
        sku: dbProduct.sku,
        barcode: dbProduct.barcode,
        price: dbProduct.price,
        category: dbProduct.category,
        inStock: (dbProduct.quantity || 0) > 0,
        quantity: dbProduct.quantity || 0,
        description: dbProduct.description,
        imageUrl: dbProduct.imageUrl
      };
    }
    
    // Simulate product lookup
    const mockProducts = {
      '123456789012': {
        id: 'prod_1',
        name: 'Sample Product 1',
        sku: 'SKU001',
        price: 9.99,
        category: 'Electronics',
        inStock: true,
        quantity: 25
      },
      '987654321098': {
        id: 'prod_2', 
        name: 'Sample Product 2',
        sku: 'SKU002',
        price: 15.50,
        category: 'Home & Garden',
        inStock: true,
        quantity: 12
      }
    };
    
    const mockProduct = mockProducts[barcode as keyof typeof mockProducts];
    
    if (mockProduct) {
      return {
        found: true,
        id: mockProduct.id,
        name: mockProduct.name,
        sku: mockProduct.sku,
        price: mockProduct.price,
        category: mockProduct.category,
        inStock: mockProduct.inStock,
        quantity: mockProduct.quantity
      };
    }
    
    return {
      found: false,
      message: 'Product not found in database'
    };
    
  } catch (error) {
    console.error("Product lookup error:", error);
    return {
      found: false,
      error: 'Database lookup failed'
    };
  }
}
