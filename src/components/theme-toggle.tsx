"use client";

import { Moon, Sun } from "@gravity-ui/icons";
import { Button, Tooltip } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "切换到浅色" : "切换到深色";

  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        aria-label={label}
        size="sm"
        variant="ghost"
        onPress={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun /> : <Moon />}
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}
