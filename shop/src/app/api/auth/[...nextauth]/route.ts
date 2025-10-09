import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { dbConnect } from '@/lib/db/mongo';
import { User } from '@/lib/models/User';
import { verifyPassword } from '@/lib/auth/password';
import { writeAudit } from '@/lib/security/audit';

const handler = NextAuth({
  session: { strategy: 'jwt', maxAge: 15 * 60 },
  jwt: { maxAge: 15 * 60 },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const email = String(credentials.email || '').toLowerCase();
        const password = String(credentials.password || '');
        await dbConnect();
        const user: any = await User.findOne({ email }).lean();
        if (!user) return null;
        const ok = await verifyPassword(password, user.hashedPassword);
        if (!ok) return null;
        if (user.status !== 'active') return null;
        return { id: String(user._id), email: user.email, name: user.name, role: user.role } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id;
        (token as any).role = (user as any).role;
        (token as any).name = (user as any).name;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any) = { id: String(token.sub), role: (token as any).role, name: (token as any).name, email: (token as any).email };
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name: `__Host-next-auth.session-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 15 * 60 }
    }
  },
  pages: {
    signIn: '/auth/login'
  }
});

export { handler as GET, handler as POST };
