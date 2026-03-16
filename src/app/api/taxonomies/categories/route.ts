import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { taxonomyId, name, color } = await request.json();
    if (!taxonomyId || !name) {
      return NextResponse.json({ error: 'taxonomyId and name required' }, { status: 400 });
    }

    // Verify parent taxonomy belongs to user
    const taxonomy = await prisma.taxonomy.findFirst({ where: { id: taxonomyId, userId } });
    if (!taxonomy) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
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
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify category belongs to user's taxonomy
    const category = await prisma.taxonomyCategory.findFirst({
      where: { id, taxonomy: { userId } },
    });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
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
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { categoryId, securityId, weight } = await request.json();
    if (!categoryId || !securityId) {
      return NextResponse.json({ error: 'categoryId and securityId required' }, { status: 400 });
    }

    // Verify category belongs to user's taxonomy
    const category = await prisma.taxonomyCategory.findFirst({
      where: { id: categoryId, taxonomy: { userId } },
    });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
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
