import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth/get-user';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: 'Password atual incorreta' }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'A nova password deve ter pelo menos 8 caracteres' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Erro ao alterar password' }, { status: 500 });
  }
}
