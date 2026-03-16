import { NextRequest, NextResponse } from 'next/server';
import { detectImporter } from '@/lib/importers';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function POST(request: NextRequest) {
  try {
    await getAuthUserId();
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    console.error('Error detecting format:', error);
    return NextResponse.json({ error: 'Failed to detect format' }, { status: 500 });
  }
}
