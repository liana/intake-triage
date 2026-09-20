import Link from 'next/link';

import { NewRequestForm } from '@/components/new-request-form';

export default function NewRequest() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-meta text-muted hover:text-accent">
        Back to all requests
      </Link>

      <header className="mt-4">
        <h1 className="text-page font-semibold tracking-tight">New request</h1>
        <p className="mt-1 text-muted">
          Tell us what you need. We score every request against four constraints — regulatory,
          data readiness, timeline, and budget — before anyone reads it.
        </p>
      </header>

      <section className="mt-8 rounded-sm bg-sheet p-8 ring-1 ring-rule">
        <NewRequestForm />
      </section>
    </main>
  );
}
