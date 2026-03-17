import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const ADMIN_EMAIL = 'franklin.silva.pt@gmail.com';

async function notifyNewRegistration(name: string, email: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Património Financeiro <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `Novo registo: ${name}`,
      html: `
        <h2>Novo utilizador registado</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}</p>
      `,
    });
  } catch {
    // Don't block registration if email fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Este email já está registado' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, hashedPassword },
    });

    // Send notification (non-blocking)
    notifyNewRegistration(name, email);

    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
  }
}
