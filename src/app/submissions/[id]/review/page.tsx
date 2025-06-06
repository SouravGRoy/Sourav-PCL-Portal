// src/app/submissions/[id]/review/page.tsx
"use server";

import ReviewSubmissionClientPage from './review-client';

interface ResolvedParams {
  id: string; // This 'id' is the submissionId from the URL
}

export default async function ReviewSubmissionServerPage({ params: paramsPromise }: { params: Promise<ResolvedParams> }) {
  const params = await paramsPromise;
  const submissionId = params.id;

  // In a real application, you might fetch initial submission data here if it's small
  // and critical for the first paint, or if it's needed for SEO/metadata.
  // For now, all data fetching (or static data usage) is in the client component.

  return <ReviewSubmissionClientPage submissionId={submissionId} />;
}
