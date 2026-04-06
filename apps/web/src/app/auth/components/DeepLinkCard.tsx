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
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs uppercase text-slate-500">Deep link</p>
      <p className="truncate text-base font-mono text-slate-900">
        {telegramLink ?? "Generating link..."}
      </p>
      <div className="mt-3 flex gap-3">
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={onOpen}
          disabled={!telegramLink || isExpired}
        >
          Open in Telegram
        </button>
        <button
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          onClick={onCopy}
          disabled={!telegramLink}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
