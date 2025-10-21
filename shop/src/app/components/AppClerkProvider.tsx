"use client";
import { ClerkProvider as Clerk } from "@clerk/nextjs";

type Props = {
  children: React.ReactNode;
};

export function AppClerkProvider({ children }: Props) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return (
    <Clerk publishableKey={pk} signInUrl="/sign-in" signUpUrl="/sign-up">
      {children}
    </Clerk>
  );
}


