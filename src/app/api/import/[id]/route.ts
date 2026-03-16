import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete holdings associated with this import batch first
    await prisma.holding.deleteMany({ where: { importBatchId: id } });

    // Delete the import batch
    await prisma.importBatch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting import batch:', error);
    return NextResponse.json({ error: 'Failed to delete import batch' }, { status: 500 });
  }
}
