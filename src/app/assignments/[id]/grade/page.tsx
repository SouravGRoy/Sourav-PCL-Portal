import { Suspense } from "react";
import GradingPageClient from "./grading-client";

interface GradingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GradingPage({ params }: GradingPageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <GradingPageClient assignmentId={id} />
    </Suspense>
  );
}
