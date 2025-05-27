import { useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState<{
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  } | null>(null);

  const showToast = (options: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => {
    setToast(options);
    setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
}

export function toast(options: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) {
  console.log('Toast:', options);
}
