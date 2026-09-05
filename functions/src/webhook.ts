import { createHmac, timingSafeEqual } from "node:crypto";

export function paystackSignature(rawBody: Buffer, secret: string) {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

export function isValidPaystackSignature(
  rawBody: Buffer,
  receivedSignature: string | undefined,
  secret: string,
) {
  if (!receivedSignature || !/^[a-f0-9]{128}$/i.test(receivedSignature))
    return false;
  const expected = Buffer.from(paystackSignature(rawBody, secret), "hex");
  const received = Buffer.from(receivedSignature, "hex");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
