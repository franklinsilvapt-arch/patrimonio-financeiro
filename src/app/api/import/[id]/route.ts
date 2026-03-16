import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify batch belongs to user
    const batch = await prisma.importBatch.findFirst({
      where: { id, userId },
    });
    if (!batch) {
      return NextResponse.json({ error: 'Import batch not found' }, { status: 404 });
    }

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
