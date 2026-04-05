import type { Metadata } from "next";
import { TrpcProvider } from "@/lib/providers/trpc-provider";
import { ToastProvider } from "@/lib/providers/toast-provider";
import { AuthProvider } from "@/lib/providers/auth-context";
import { RealtimeProvider } from "@/lib/providers/realtime-provider";
import { AuthGuard } from "@/components/auth-guard";
import { FeatureBoundary } from "@/components/ui/feature-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "NewChat",
  description: "A chat application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var theme = localStorage.getItem('newchat.theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-slate-900">
        <TrpcProvider>
          <ToastProvider>
            <AuthProvider>
              <FeatureBoundary name="RealtimeProvider">
                <RealtimeProvider>
                  <AuthGuard>{children}</AuthGuard>
                </RealtimeProvider>
              </FeatureBoundary>
            </AuthProvider>
          </ToastProvider>
        </TrpcProvider>
      </body>
    </html>
  );
}
