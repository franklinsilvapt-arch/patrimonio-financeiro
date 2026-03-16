import { NextRequest, NextResponse } from 'next/server';
import { detectImporter } from '@/lib/importers';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    const importer = detectImporter(content);
    if (importer) {
      return NextResponse.json({ detected: true, brokerSlug: importer.brokerSlug });
    }
    return NextResponse.json({ detected: false, brokerSlug: null });
  } catch (error) {
    console.error('Error detecting format:', error);
    return NextResponse.json({ error: 'Failed to detect format' }, { status: 500 });
  }
}
