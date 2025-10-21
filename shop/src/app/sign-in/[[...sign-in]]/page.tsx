"use client";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen grid place-items-center" dir="rtl">
      <SignIn appearance={{ elements: { card: 'shadow-lg', formButtonPrimary: 'bg-black hover:bg-gray-900' } }}
              redirectUrl="/" />
    </main>
  );
}
