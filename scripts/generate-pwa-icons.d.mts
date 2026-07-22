export type GeneratePwaIconsOptions = {
  root?: string;
  sourcePath?: string;
};

export function generatePwaIcons(options?: GeneratePwaIconsOptions): Promise<string[]>;
