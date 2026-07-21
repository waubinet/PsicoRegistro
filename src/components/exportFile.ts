import { invoke } from "@tauri-apps/api/core";

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Grava bytes num caminho escolhido pelo usuário, via backend. */
export async function writeFile(destPath: string, bytes: Uint8Array): Promise<void> {
  await invoke<void>("write_export_file", { destPath, base64Data: toBase64(bytes) });
}
