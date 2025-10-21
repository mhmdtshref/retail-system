"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen grid place-items-center" dir="rtl">
      <SignUp appearance={{ elements: { card: 'shadow-lg', formButtonPrimary: 'bg-black hover:bg-gray-900' } }}
              redirectUrl="/" />
    </main>
  );
}
