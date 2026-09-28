"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { Button, LinkButton } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

// Shown when a page fails to load, e.g. the database can't be reached.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-status-violation">
          <ServerCrash className="size-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">
          This page couldn’t be loaded. Check your connection and try again. If it keeps happening, tell your system
          administrator{error.digest ? ` and mention code ${error.digest}` : ""}.
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={reset}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
          <LinkButton href="/home" variant="secondary">
            Go to dashboard
          </LinkButton>
        </div>
      </div>
    </Card>
  );
}
