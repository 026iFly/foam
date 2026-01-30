import { NextRequest, NextResponse } from 'next/server';
import { calculateDistanceToCustomer, COMPANY_ADDRESS } from '@/lib/distance-calculator';

export async function POST(request: NextRequest) {
  try {
    const { customerAddress } = await request.json();

    if (!customerAddress) {
      return NextResponse.json(
        { error: 'Customer address is required' },
        { status: 400 }
      );
    }

    const result = await calculateDistanceToCustomer(customerAddress);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not calculate distance. Please check the address format.' },
        { status: 400 }
      );
    }

    // Add a small delay to respect Nominatim rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Distance calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distance' },
      { status: 500 }
    );
  }
}
