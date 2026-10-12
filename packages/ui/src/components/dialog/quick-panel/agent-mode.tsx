"use client";
import { useI18n } from "@workspace/ui/lib/i18n";

export function AgentMode() {
  const { t } = useI18n();

  return (
    <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
      {t("Agent mode coming soon")}{" "}
    </div>
  );
}
