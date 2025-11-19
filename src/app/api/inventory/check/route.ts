import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productInventory, products, settings } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// Get stock management setting
async function getStockManagementSetting() {
  try {
    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'stock_management_enabled'))
      .limit(1);
    
    return setting.length > 0 ? setting[0].value === 'true' : false;
  } catch (error) {
    console.error('Error fetching stock management setting:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { productId, variantId, requestedQuantity } = await req.json();

    if (!productId || !requestedQuantity) {
      return NextResponse.json({ 
        error: 'Product ID and requested quantity are required' 
      }, { status: 400 });
    }

    // Check if stock management is enabled
    const stockManagementEnabled = await getStockManagementSetting();

    if (!stockManagementEnabled) {
      // If stock management is disabled, allow any quantity
      return NextResponse.json({
        success: true,
        available: true,
        stockManagementEnabled: false,
        availableQuantity: 999999,
        requestedQuantity
      });
    }

    // Get product info to check stock management type
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { 
        stockManagementType: true,
        name: true
      }
    });

    if (!product) {
      return NextResponse.json({ 
        error: 'Product not found' 
      }, { status: 404 });
    }

    // Find inventory record
    const whereConditions = variantId 
      ? and(
          eq(productInventory.productId, productId),
          eq(productInventory.variantId, variantId)
        )
      : eq(productInventory.productId, productId);

    const inventory = await db
      .select()
      .from(productInventory)
      .where(whereConditions!)
      .limit(1);

    if (inventory.length === 0) {
      return NextResponse.json({
        success: false,
        available: false,
        stockManagementEnabled: true,
        availableQuantity: 0,
        requestedQuantity,
        message: 'No inventory record found for this product'
      });
    }

    const availableQuantity = inventory[0].availableQuantity || 0;
    const isAvailable = availableQuantity >= requestedQuantity;

    return NextResponse.json({
      success: true,
      available: isAvailable,
      stockManagementEnabled: true,
      availableQuantity,
      requestedQuantity,
      message: isAvailable 
        ? 'Stock available' 
        : `Only ${availableQuantity} units available`
    });

  } catch (error) {
    console.error('Error checking inventory:', error);
    return NextResponse.json({ 
      error: 'Failed to check inventory' 
    }, { status: 500 });
  }
}

