export async function svgStringToFile(
  svgString: string,
  fileName: string
): Promise<File> {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  return new File([blob], fileName, { type: "image/svg+xml" });
}