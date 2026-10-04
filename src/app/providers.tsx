"use client";

import { I18nProvider, Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale="zh-CN">
        {children}
        <Toast.Provider placement="top" />
      </I18nProvider>
    </ThemeProvider>
  );
}
