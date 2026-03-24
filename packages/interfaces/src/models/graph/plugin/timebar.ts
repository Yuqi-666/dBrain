import type {
  BasePluginOptions,
  FilterMode,
  TimebarType,
  ElementType,
  TimeData,
} from "./common";

export interface TimebarOptions extends BasePluginOptions {
  type: "timebar";
  className?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  position?: "bottom" | "top";
  padding?: number | number[];
  data?: TimeData[] | number[];
  timebarType?: TimebarType;
  elementTypes?: ElementType[];
  mode?: FilterMode;
  values?: number | [number, number] | Date | [Date, Date];
  loop?: boolean;
  getTime?: (datum: Record<string, unknown>) => number;
  labelFormatter?: (time: number | Date) => string;
  onChange?: (values: number | [number, number]) => void;
  onReset?: () => void;
  onSpeedChange?: (speed: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onBackward?: () => void;
  onForward?: () => void;
}
