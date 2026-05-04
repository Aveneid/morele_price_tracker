import nodemailer from "nodemailer";
import { ENV } from "./env";

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter with SMTP settings from environment
 */
export function initializeEmailService() {
  if (!ENV.mailHost || !ENV.mailPort || !ENV.mailUser || !ENV.mailPassword) {
    console.warn("[Email Service] Email configuration incomplete, email notifications disabled");
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: ENV.mailHost,
      port: parseInt(ENV.mailPort, 10),
      secure: ENV.mailUseTls === "true" ? false : true, // true for 465, false for other ports
      auth: {
        user: ENV.mailUser,
        pass: ENV.mailPassword,
      },
    });

    console.log("[Email Service] Initialized successfully");
    return transporter;
  } catch (error) {
    console.error("[Email Service] Failed to initialize:", error);
    return null;
  }
}

/**
 * Send email notification
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    const initialized = initializeEmailService();
    if (!initialized) {
      return { success: false, error: "Email service not configured" };
    }
    transporter = initialized;
  }

  try {
    const result = await transporter.sendMail({
      from: ENV.mailFrom,
      to,
      subject,
      html,
    });

    console.log(`[Email Service] Email sent to ${to}: ${result.messageId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Email Service] Failed to send email to ${to}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send price alert email
 */
export async function sendPriceAlertEmail(
  to: string,
  productName: string,
  currentPrice: number,
  previousPrice: number,
  priceChangePercent: number,
  productUrl: string
): Promise<{ success: boolean; error?: string }> {
  const priceDrop = previousPrice - currentPrice;
  const subject = `🔔 Price Drop Alert: ${productName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Price Drop Alert!</h2>
      <p>Great news! The price of <strong>${productName}</strong> has dropped.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;">
          <strong>Previous Price:</strong> <span style="color: #666;">$${(previousPrice / 100).toFixed(2)}</span>
        </p>
        <p style="margin: 10px 0;">
          <strong>Current Price:</strong> <span style="color: #10b981; font-size: 18px;">$${(currentPrice / 100).toFixed(2)}</span>
        </p>
        <p style="margin: 10px 0;">
          <strong>Price Drop:</strong> <span style="color: #10b981;">$${(priceDrop / 100).toFixed(2)} (${priceChangePercent.toFixed(2)}%)</span>
        </p>
      </div>

      <p>
        <a href="${productUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Product
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      
      <p style="color: #666; font-size: 12px;">
        You received this email because you have a price alert set for this product in Morele Price Tracker.
      </p>
    </div>
  `;

  return sendEmail(to, subject, html);
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(testEmail: string): Promise<{ success: boolean; error?: string }> {
  const subject = "Morele Price Tracker - Email Configuration Test";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Configuration Test</h2>
      <p>This is a test email to verify your email server configuration is working correctly.</p>
      <p>If you received this email, your email notifications are properly configured!</p>
    </div>
  `;

  return sendEmail(testEmail, subject, html);
}
