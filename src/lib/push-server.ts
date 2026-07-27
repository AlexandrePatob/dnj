import webpush from "web-push";

export function pushClient() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) throw new Error("VAPID não configurado.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return webpush;
}
