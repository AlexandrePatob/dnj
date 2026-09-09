declare module "*.png" {
  const source: { src: string; height: number; width: number; blurDataURL?: string };
  export default source;
}
