import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';

export async function GET() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const taxonomies = await prisma.taxonomy.findMany({
      where: { userId },
      include: {
        categories: {
          include: {
            securities: {
              include: {
                security: {
                  select: { id: true, name: true, ticker: true, isin: true },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(taxonomies);
  } catch (error) {
    console.error('Error fetching taxonomies:', error);
    return NextResponse.json({ error: 'Failed to fetch taxonomies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { name, description, categories } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    const taxonomy = await prisma.taxonomy.create({
      data: {
        userId,
        name,
        description,
        categories: categories
          ? {
              create: (categories as Array<{ name: string; color?: string }>).map((c) => ({
                name: c.name,
                color: c.color,
              })),
            }
          : undefined,
      },
      include: { categories: true },
    });

    return NextResponse.json(taxonomy);
  } catch (error) {
    console.error('Error creating taxonomy:', error);
    return NextResponse.json({ error: 'Failed to create taxonomy' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { id, name, description } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'id and name required' }, { status: 400 });
    }

    // Verify taxonomy belongs to user
    const existing = await prisma.taxonomy.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    const taxonomy = await prisma.taxonomy.update({
      where: { id },
      data: { name, description },
    });

    return NextResponse.json(taxonomy);
  } catch (error) {
    console.error('Error updating taxonomy:', error);
    return NextResponse.json({ error: 'Failed to update taxonomy' }, { status: 500 });
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

    // Verify taxonomy belongs to user
    const existing = await prisma.taxonomy.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 });
    }

    await prisma.taxonomy.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting taxonomy:', error);
    return NextResponse.json({ error: 'Failed to delete taxonomy' }, { status: 500 });
  }
}
