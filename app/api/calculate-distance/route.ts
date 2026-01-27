import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ADDRESS = 'Elektrikergatan 3, 80291 Gävle';

// Geocode an address to coordinates using Nominatim (OSM)
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'Intellifoam-Calculator/1.0', // Required by Nominatim
        },
      }
    );

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Calculate route distance using OSRM
async function calculateRouteDistance(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`
    );

    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // Distance is in meters, convert to km
      return Math.round(data.routes[0].distance / 1000);
    }
    return null;
  } catch (error) {
    console.error('OSRM error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { customerAddress } = await request.json();

    if (!customerAddress) {
      return NextResponse.json(
        { error: 'Customer address is required' },
        { status: 400 }
      );
    }

    // Geocode both addresses
    const [companyCoords, customerCoords] = await Promise.all([
      geocodeAddress(COMPANY_ADDRESS),
      geocodeAddress(customerAddress),
    ]);

    if (!companyCoords || !customerCoords) {
      return NextResponse.json(
        { error: 'Could not find one or both addresses. Please check the address format.' },
        { status: 400 }
      );
    }

    // Calculate route distance
    const distanceKm = await calculateRouteDistance(
      companyCoords.lat,
      companyCoords.lon,
      customerCoords.lat,
      customerCoords.lon
    );

    if (distanceKm === null) {
      return NextResponse.json(
        { error: 'Could not calculate route distance' },
        { status: 500 }
      );
    }

    // Add a small delay to respect Nominatim rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      distance_km: distanceKm,
      from: COMPANY_ADDRESS,
      to: customerAddress,
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distance' },
      { status: 500 }
    );
  }
}
