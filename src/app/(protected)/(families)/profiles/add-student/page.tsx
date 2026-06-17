"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { z } from "zod";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card } from "@/src/components/ui/card";
import { addStudent } from "./actions";
import { useDocumentTitle } from "@/src/hooks/useDocumentTitle";

const inter = Inter({ subsets: ["latin"] });

const schema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  lastName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
});

type FormErrors = Partial<Record<"firstName" | "lastName", string[]>>;

const ErrorMsg = ({ msg }: { msg?: string[] }) =>
  msg?.length ? (
    <p className="text-red-600 text-sm mt-1 ml-1">{msg[0]}</p>
  ) : null;

export default function AddStudentPage() {
  useDocumentTitle("Add Student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = schema.safeParse({ firstName, lastName });

    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as FormErrors);
      return;
    }

    setIsSubmitting(true);
    const response = await addStudent(firstName, lastName);
    setIsSubmitting(false);

    if (response && !response.success) {
      setServerError(response.message ?? "Something went wrong.");
    }
  }

  return (
    <div
      className={`${inter.className} w-full min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
      <Card
        variant="light"
        shadow="md"
        padding="none"
        className="w-full max-w-120 rounded-xl py-12 px-8"
      >
        <div className="w-full flex flex-col gap-[18px]">
          <div className="flex flex-col items-center mb-4">
            <Image
              src="/images/logos/talkmaze-logo-horizontal-color.svg"
              alt="TalkMaze Logo"
              width={150}
              height={120}
              className="h-[120px] w-auto object-contain"
              priority
            />
          </div>

          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-[#1F2E3B]">Add a Student</h1>
            <p className="text-sm text-[#1F2E3B]/60 mt-2">
              Enter the student&apos;s name to continue to payment.
            </p>
          </div>

          <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  error={!!errors.firstName}
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <ErrorMsg msg={errors.firstName} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="relative">
                <Input
                  variant="light"
                  size="lg"
                  error={!!errors.lastName}
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <ErrorMsg msg={errors.lastName} />
            </div>

            {serverError && (
              <p className="text-red-600 text-sm text-center">{serverError}</p>
            )}

            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={isSubmitting}
              className="w-full h-12 mt-2 text-[20px]"
            >
              {isSubmitting ? "Continuing..." : "Continue to Payment"}
            </Button>
          </form>

          <Link
            href="/profiles"
            className="text-center text-sm text-[#1F2E3B]/50 hover:text-[#1F2E3B] transition-colors"
          >
            Back to profiles
          </Link>
        </div>
      </Card>
    </div>
  );
}
