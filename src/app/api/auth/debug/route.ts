import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

// Temporary debug endpoint — remove after fixing auth
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const checks = {
      dbConnection: false,
      userFound: false,
      hashFormat: '',
      bcryptMatch: false,
      authSecret: !!process.env.AUTH_SECRET,
      authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
      authTrustHost: process.env.AUTH_TRUST_HOST,
      nextauthUrl: process.env.NEXTAUTH_URL ?? 'not set',
    };

    // 1. Test DB connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.dbConnection = true;
    } catch (e) {
      return NextResponse.json({ ...checks, error: `DB connection failed: ${e}` });
    }

    // 2. Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ...checks, error: 'User not found' });
    }
    checks.userFound = true;
    checks.hashFormat = user.hashedPassword.substring(0, 7); // e.g. $2b$12$

    // 3. Test bcrypt
    try {
      checks.bcryptMatch = await bcrypt.compare(password, user.hashedPassword);
    } catch (e) {
      return NextResponse.json({ ...checks, error: `bcrypt.compare failed: ${e}` });
    }

    return NextResponse.json(checks);
  } catch (e) {
    return NextResponse.json({ error: `Unexpected: ${e}` }, { status: 500 });
  }
}
