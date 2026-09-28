import { Compass } from "lucide-react";
import { LinkButton } from "../components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Compass className="size-6" aria-hidden />
        </div>
        <p className="font-mono text-sm text-ink-500">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Page not found</h1>
        <p className="mt-2 text-sm text-ink-500">
          The page you’re looking for doesn’t exist or was moved. If you followed a bookmark, it may be out of date.
        </p>
        <LinkButton href="/home" className="mt-6">
          Go to dashboard
        </LinkButton>
      </div>
    </main>
  );
}
