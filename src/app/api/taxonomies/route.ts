import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const taxonomies = await prisma.taxonomy.findMany({
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
  try {
    const { name, description, categories } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    const taxonomy = await prisma.taxonomy.create({
      data: {
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
  try {
    const { id, name, description } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'id and name required' }, { status: 400 });
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
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.taxonomy.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting taxonomy:', error);
    return NextResponse.json({ error: 'Failed to delete taxonomy' }, { status: 500 });
  }
}
