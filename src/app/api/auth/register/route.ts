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

    // Notify admin
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

    // Welcome email to the new user
    await resend.emails.send({
      from: 'Património Financeiro <onboarding@resend.dev>',
      replyTo: ADMIN_EMAIL,
      to: email,
      subject: 'Bem-vindo ao Património Financeiro',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="font-size: 22px; font-weight: 700;">Olá ${name},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #444;">
            Obrigado por te registares no <strong>Património Financeiro</strong>.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #444;">
            A plataforma ainda está em fase inicial e o teu feedback é essencial para a tornar melhor.
            Se encontrares algum erro, tiveres uma sugestão ou simplesmente quiseres partilhar a tua experiência,
            envia um email para:
          </p>
          <p style="font-size: 16px; text-align: center; margin: 24px 0;">
            <a href="mailto:${ADMIN_EMAIL}" style="color: #000; font-weight: 700; text-decoration: underline;">${ADMIN_EMAIL}</a>
          </p>
          <p style="font-size: 13px; line-height: 1.5; color: #999; background: #f9f9f9; padding: 12px 16px; border-radius: 8px;">
            ⚠️ <strong>Nota:</strong> Não respondas diretamente a este email, pois não é monitorizado.
            Envia sempre para <a href="mailto:${ADMIN_EMAIL}" style="color: #666;">${ADMIN_EMAIL}</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 15px; line-height: 1.6; color: #444;"><strong>Para começar:</strong></p>
          <ol style="font-size: 15px; line-height: 1.8; color: #444; padding-left: 20px;">
            <li>Vai a <a href="https://patrimoniofinanceiro.pt/importar" style="color: #000; font-weight: 600;">patrimoniofinanceiro.pt/importar</a></li>
            <li>Faz upload de um screenshot ou CSV da tua corretora</li>
            <li>O teu dashboard fica pronto em segundos</li>
          </ol>
          <p style="font-size: 15px; line-height: 1.6; color: #444; margin-top: 24px;">
            Bons investimentos,<br />
            <strong>Franklin Silva</strong><br />
            <span style="color: #888;">Património Financeiro</span>
          </p>
        </div>
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
