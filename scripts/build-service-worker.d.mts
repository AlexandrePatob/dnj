export interface BuildServiceWorkerOptions {
  root?: string;
  entryPath?: string;
  outputPath?: string;
  env?: Record<string, string | undefined>;
}

export interface BuildServiceWorkerResult {
  revision: string;
  outputPath: string;
  contents: string;
}

export function resolveRevision(env: Record<string, string | undefined>, inputs: string[]): string;
export function writeFileAtomic(outputPath: string, contents: string): Promise<void>;
export function buildServiceWorker(options?: BuildServiceWorkerOptions): Promise<BuildServiceWorkerResult>;
