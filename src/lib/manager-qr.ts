import QRCode from "qrcode";
export function qrImageUrl(payload: string) { return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 360, color: { dark: "#102523", light: "#ffffff" } }); }
