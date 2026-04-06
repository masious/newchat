import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@base-ui/react";

export function DialogFooter({
  isBusy,
  submitLabel,
}: {
  isBusy: boolean;
  submitLabel: string;
}) {
  return (
    <div className="mt-8 flex justify-end gap-3">
      <Dialog.Close className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-400">
        Cancel
      </Dialog.Close>
      <Button
        type="submit"
        disabled={isBusy}
        className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitLabel}
      </Button>
    </div>
  );
}
