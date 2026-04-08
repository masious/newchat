import { ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

interface DeepLinkCardProps {
  telegramLink: string | null;
  isExpired: boolean;
  copied: boolean;
  onOpen: () => void;
  onCopy: () => void;
}

export function DeepLinkCard({
  telegramLink,
  isExpired,
  copied,
  onOpen,
  onCopy,
}: DeepLinkCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/50">
      <SectionLabel>Deep link</SectionLabel>
      <p className="mt-1 truncate font-mono text-sm text-slate-900 dark:text-slate-100">
        {telegramLink ?? "Generating link..."}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={onOpen}
          disabled={!telegramLink || isExpired}
          className="flex items-center gap-1.5"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Telegram
        </Button>
        <Button
          variant="secondary"
          onClick={onCopy}
          disabled={!telegramLink}
          className="flex items-center gap-1.5"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
