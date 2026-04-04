export function TypingBubble({ name }: { name?: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-md rounded-2xl bg-slate-100 px-4 py-3 text-sm shadow dark:bg-slate-700">
        {name && <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{name}</p>}
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

