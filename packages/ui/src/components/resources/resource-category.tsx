/** The label and icon the library uses for one storage category. */
import type { LucideIcon } from "lucide-react";
import {
  FileAudioIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  ImageIcon,
} from "lucide-react";
import type { StorageCategory } from "@workspace/api-client";

/** Source strings shared with the translation catalog. */
export const CATEGORY_LABEL_KEYS: Record<StorageCategory, string> = {
  image: "图片",
  video: "视频",
  audio: "音频",
  pdf: "PDF",
  other: "其他",
};

const CATEGORY_ICONS: Record<StorageCategory, LucideIcon> = {
  image: ImageIcon,
  video: FileVideoIcon,
  audio: FileAudioIcon,
  pdf: FileTextIcon,
  other: FileIcon,
};

/** The translator returned by `useI18n()`; declared here to keep helpers pure. */
export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** The translated category name, e.g. 「图片」/ "Image". */
export function categoryLabel(category: StorageCategory, t: Translate): string {
  return t(CATEGORY_LABEL_KEYS[category]);
}

/** The icon for a category, sized by the caller. */
export function CategoryIcon({
  category,
  className,
}: {
  category: StorageCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon aria-hidden="true" className={className} />;
}
