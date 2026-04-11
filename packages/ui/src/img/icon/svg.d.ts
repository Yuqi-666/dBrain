// src/types/svg.d.ts
declare module '*.svg' {
  const content: {
    readonly src: string;
    readonly width: number;
    readonly height: number;
    readonly blurDataURL?: string;
  };
  export default content;
}
