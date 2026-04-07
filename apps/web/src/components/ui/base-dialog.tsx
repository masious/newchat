import { Dialog } from "@base-ui/react/dialog";
import { ScrollArea } from "@base-ui/react";
import { cn } from "@/lib/cn";
import { SectionLabel } from "@/components/ui/section-label";

const sizeClasses = {
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

type BaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: React.ReactNode;
  size?: keyof typeof sizeClasses;
  stacked?: boolean;
  children: React.ReactNode;
};

export function BaseDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  size = "md",
  stacked = false,
  children,
}: BaseDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 bg-black/40",
            stacked ? "z-60" : "z-50",
          )}
        />
        <Dialog.Viewport
          className={cn(
            "fixed inset-0 flex items-center justify-center px-4",
            stacked ? "z-70" : "z-60",
          )}
        >
          <ScrollArea.Root
            style={{ position: undefined }}
            className="box-border h-full overscroll-contain in-data-ending-style:pointer-events-none"
          >
            <ScrollArea.Viewport className="box-border h-full overscroll-contain in-data-ending-style:pointer-events-none">
              <ScrollArea.Content className="flex min-h-full items-center justify-center">
                <Dialog.Popup
                  className={cn(
                    "w-full rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800",
                    sizeClasses[size],
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">
                        {title}
                      </Dialog.Title>
                      {subtitle && (
                        <SectionLabel as={Dialog.Description}>
                          {subtitle}
                        </SectionLabel>
                      )}
                    </div>
                    <Dialog.Close className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                      Close
                    </Dialog.Close>
                  </div>
                  {children}
                </Dialog.Popup>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
