import { Button } from "@packages/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { Monitor, Moon, Sun } from "lucide-react";
import { type Theme, useTheme } from "@/lib/admin/theme";

const THEMES = [
  {
    value: "light",
    label: "Light",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    Icon: Moon,
  },
  {
    value: "system",
    label: "System",
    Icon: Monitor,
  },
] as const;

// The panel header's theme switch: light, dark or the OS setting
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Theme: ${current.label}`}
          title="Theme"
        >
          <current.Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => setTheme(v as Theme)}
        >
          {THEMES.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon /> {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
