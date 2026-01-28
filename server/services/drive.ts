
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import "dotenv/config";
import { format } from "date-fns";
import { transactions, users, categories, budgets, paymentMethods, transactionTags, tags, userSettings } from "../../drizzle/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DriveService {
    private auth: any;
    private drive: any;

    constructor() {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            console.warn("⚠️ Drive Service: Credentials missing");
        }

        // Auth is handled via Passport session usually, but for background tasks or specific actions
        // we might need a specific client.
        // However, googleapis usually needs an OAuth2 client with credentials.
        // For 'Backup Now' triggered by user, we can use the user's access token from the session.
        // BUT, here we are defining the service.
    }

    async uploadBackup(accessToken: string) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // 1. Generate Backup File (JSON dump of DB)
        const backupData = await this.dumpDatabase();
        const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
        const fileName = `finance_flow_backup_${timestamp}.json`;
        const filePath = path.resolve(__dirname, `../../temp/${fileName}`);

        // Ensure temp dir exists
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

        try {
            // 2. Upload to Drive
            const fileMetadata = {
                name: fileName,
                mimeType: "application/json",
                parents: ["root"], // Saving to root for now, or specific folder if needed
            };

            const media = {
                mimeType: "application/json",
                body: fs.createReadStream(filePath),
            };

            const response = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: "id, name, webViewLink",
            });

            // Cleanup
            fs.unlinkSync(filePath);

            return response.data;
        } catch (error) {
            console.error("❌ Drive Upload Error:", error);
            throw error;
        }
    }

    private async dumpDatabase() {
        const connection = await mysql.createConnection(process.env.DATABASE_URL!);
        const db = drizzle(connection);

        const allTransactions = await db.select().from(transactions);
        const allCategories = await db.select().from(categories);

        await connection.end();

        return {
            timestamp: new Date().toISOString(),
            transactions: allTransactions,
            categories: allCategories,
            // Add other tables if needed
        };
    }
}

export const driveService = new DriveService();
