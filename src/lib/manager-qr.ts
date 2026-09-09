import QRCode from "qrcode";
import dnjLogo from "../../Logo_DNJ_semsombra.png";

const QR_SIZE = 1920;
const LABEL_HEIGHT = 330;

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
    context.font = '700 163px "Space Grotesk", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label.trim().slice(0, 28), QR_SIZE / 2, QR_SIZE + LABEL_HEIGHT / 2);
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
