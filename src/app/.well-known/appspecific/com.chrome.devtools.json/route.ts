import { NextResponse } from 'next/server';

export async function GET() {
  // Return empty JSON response to satisfy Chrome DevTools
  // This prevents the 404 errors in development
  return NextResponse.json({});
} 