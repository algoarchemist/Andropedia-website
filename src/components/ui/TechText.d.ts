import type { CSSProperties, ComponentType } from "react";

export interface TechTextProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  color?: string;
  accentColor?: string;
  /** Bottom colour of an optional vertical gradient that starts from `color`. */
  colorEnd?: string;
  reach?: number;
  softness?: number;
  dashLength?: number;
  dashGap?: number;
  strokeWidth?: number;
  lineStyle?: string;
  reveal?: string;
  specks?: number;
  selection?: boolean;
  labels?: boolean;
  draggable?: boolean;
  sweep?: boolean;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}

declare const TechText: ComponentType<TechTextProps>;
export default TechText;
