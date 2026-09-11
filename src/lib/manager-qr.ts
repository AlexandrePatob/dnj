import QRCode from "qrcode";
import dnjLogo from "../../Logo_DNJ_semsombra.png";

const QR_SIZE = 1920;
const LABEL_HEIGHT = 450;
const LABEL_MAX_WIDTH = QR_SIZE - 120;
const LABEL_FONT_SIZE = 150;

/** Generates the DNJ QR artwork used by operational screens. */
export async function qrImageUrl(payload: string, label?: string) {
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: QR_SIZE - 146,
    color: { dark: "#102523", light: "#ffffff" },
  });

  if (typeof document === "undefined") return qrDataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = QR_SIZE;
  canvas.height = QR_SIZE + LABEL_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) return qrDataUrl;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const qrImage = await loadImage(qrDataUrl);
  const qrOffset = 73;
  context.drawImage(qrImage, qrOffset, qrOffset, QR_SIZE - 146, QR_SIZE - 146);

  const logo = await loadImage(dnjLogo.src);
  const logoHeight = 246;
  const logoWidth = logo.naturalWidth > 0
    ? logoHeight * (logo.naturalWidth / logo.naturalHeight)
    : 448;
  const logoOffsetX = (QR_SIZE - logoWidth) / 2;
  const logoOffsetY = (QR_SIZE - logoHeight) / 2;
  context.drawImage(logo, logoOffsetX, logoOffsetY, logoWidth, logoHeight);

  if (label?.trim()) {
    context.fillStyle = "#102523";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const words = label.trim().split(/\s+/);
    let fontSize = LABEL_FONT_SIZE;
    let lines: string[] = [];
    do {
      context.font = `700 ${fontSize}px "Space Grotesk", sans-serif`;
      lines = [];
      for (const word of words) {
        const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
        if (!lines.length || context.measureText(candidate).width <= LABEL_MAX_WIDTH) {
          lines.length ? (lines[lines.length - 1] = candidate) : lines.push(word);
        } else {
          lines.push(word);
        }
      }
      fontSize -= 8;
    } while (lines.length > 3 && fontSize >= 72);
    const actualFontSize = Math.max(fontSize + 8, 72);
    context.font = `700 ${actualFontSize}px "Space Grotesk", sans-serif`;
    const lineHeight = actualFontSize * 0.9;
    const firstLineY = QR_SIZE + LABEL_HEIGHT / 2 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, index) => context.fillText(line, QR_SIZE / 2, firstLineY + index * lineHeight));
  }

  return canvas.toDataURL("image/png");
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
