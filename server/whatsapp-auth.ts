import { makeWASocket, useMultiFileAuthState, DisconnectReason, WASocket } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

let sock: WASocket | null = null;
let currentQRCode: string | null = null;
let isConnected = false;

const authDir = path.join(process.cwd(), "whatsapp_auth");

// Garantir que o diretório de autenticação existe
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

export async function initializeWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["Finance Flow Pro", "Chrome", "1.0.0"],
    });

    // Evento de QR Code
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Gerar QR Code em base64
        try {
          currentQRCode = await QRCode.toDataURL(qr);
          console.log("[WhatsApp] QR Code gerado");
        } catch (err) {
          console.error("[WhatsApp] Erro ao gerar QR Code:", err);
        }
      }

      if (connection === "open") {
        isConnected = true;
        currentQRCode = null;
        console.log("[WhatsApp] Conectado com sucesso!");
      }

      if (connection === "close") {
        isConnected = false;
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log("[WhatsApp] Reconectando...");
          setTimeout(() => initializeWhatsApp(), 3000);
        } else {
          console.log("[WhatsApp] Desconectado pelo usuário");
        }
      }
    });

    // Salvar credenciais
    sock.ev.on("creds.update", saveCreds);

    // Receber mensagens
    sock.ev.on("messages.upsert", async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && msg.message) {
        const senderNumber = msg.key.remoteJid?.replace("@s.whatsapp.net", "") || "";
        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        console.log("[WhatsApp] Mensagem recebida de", senderNumber, ":", messageText);
        
        try {
          const { processMessage, sendReply } = await import("./whatsapp-message-processor-v2");
          const response = await processMessage(senderNumber, messageText);
          await sendReply(senderNumber, response);
        } catch (error) {
          console.error("[WhatsApp] Erro ao processar mensagem:", error);
        }
      }
    });

    return sock;
  } catch (error) {
    console.error("[WhatsApp] Erro ao inicializar:", error);
    throw error;
  }
}

export function getQRCode(): string | null {
  return currentQRCode;
}

export function getConnectionStatus(): boolean {
  return isConnected;
}

export function getSocket(): WASocket | null {
  return sock;
}

export async function sendMessage(number: string, message: string) {
  if (!sock || !isConnected) {
    throw new Error("WhatsApp não está conectado");
  }

  try {
    const jid = number.includes("@") ? number : `${number}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    console.log(`[WhatsApp] Mensagem enviada para ${number}`);
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar mensagem:", error);
    throw error;
  }
}

export async function disconnect() {
  if (sock) {
    await sock.logout();
    sock = null;
    isConnected = false;
    currentQRCode = null;
  }
}
