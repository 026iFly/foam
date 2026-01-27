import { NextResponse } from 'next/server';
import {
  getAllPricing,
  getAllAdditionalCosts,
  getAllProjectMultipliers,
  updatePricing,
  updateAdditionalCost,
  updateProjectMultiplier,
} from '@/lib/queries';

export async function GET() {
  try {
    const [pricing, additionalCosts, multipliers] = await Promise.all([
      getAllPricing(),
      getAllAdditionalCosts(),
      getAllProjectMultipliers(),
    ]);

    return NextResponse.json({
      pricing: pricing || [],
      additionalCosts: additionalCosts || [],
      multipliers: multipliers || [],
    });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { type, id, value } = body;

    if (type === 'pricing') {
      await updatePricing(id, value);
    } else if (type === 'additional_cost') {
      await updateAdditionalCost(id, value);
    } else if (type === 'multiplier') {
      await updateProjectMultiplier(id, value);
    } else {
      return NextResponse.json(
        { error: 'Invalid update type' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating data:', error);
    return NextResponse.json(
      { error: 'Failed to update data' },
      { status: 500 }
    );
  }
}
