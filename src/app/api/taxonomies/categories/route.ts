import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { taxonomyId, name, color } = await request.json();
    if (!taxonomyId || !name) {
      return NextResponse.json({ error: 'taxonomyId and name required' }, { status: 400 });
    }

    const category = await prisma.taxonomyCategory.create({
      data: { taxonomyId, name, color },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.taxonomyCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

/**
 * Assign a security to a category.
 * PUT { categoryId, securityId, weight? }
 */
export async function PUT(request: NextRequest) {
  try {
    const { categoryId, securityId, weight } = await request.json();
    if (!categoryId || !securityId) {
      return NextResponse.json({ error: 'categoryId and securityId required' }, { status: 400 });
    }

    const assignment = await prisma.securityCategory.upsert({
      where: {
        securityId_categoryId: { securityId, categoryId },
      },
      update: { weight: weight ?? 1.0 },
      create: { securityId, categoryId, weight: weight ?? 1.0 },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error assigning security:', error);
    return NextResponse.json({ error: 'Failed to assign security' }, { status: 500 });
  }
}
