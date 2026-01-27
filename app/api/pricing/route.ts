import { NextResponse } from 'next/server';
import { getAllPricing, getAllProjectMultipliers, getBuildingPhysicsVariables } from '@/lib/queries';

export async function GET() {
  try {
    const pricing = getAllPricing();
    const multipliers = getAllProjectMultipliers();
    const buildingPhysics = getBuildingPhysicsVariables();

    return NextResponse.json({
      pricing,
      multipliers,
      buildingPhysics,
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
}
