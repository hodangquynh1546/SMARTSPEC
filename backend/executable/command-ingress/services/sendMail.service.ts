import nodemailer, { Transporter } from "nodemailer";
import "dotenv/config";
import logger from "../../../lib/logger";
import { resolveMailConfig } from "./mailConfig";

export const mailConfig = resolveMailConfig(process.env);

const transporter: Transporter | null = mailConfig.enabled
  ? nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: { user: mailConfig.user, pass: mailConfig.pass },
      tls: {
        rejectUnauthorized: false,
      },
    })
  : null;

if (!mailConfig.enabled) {
  logger.warn("MAIL_ENABLED=false: emails are written to this log instead of being sent");
}

// The mailService with sendEmail function
interface EmailOptions {
  emailFrom: string;
  emailTo: string;
  emailSubject: string;
  emailText: string;
}

const mailService = {
  /** Sender address to use: EMAIL_FROM / MAIL_FROM, otherwise the SMTP login. */
  from(): string {
    return mailConfig.from;
  },

  async sendEmail({
    emailFrom,
    emailTo,
    emailSubject,
    emailText,
  }: EmailOptions): Promise<boolean | null> {
    if (!transporter) {
      // development: the links in the message (verify / reset) can be read here
      logger.info(`📧 [MAIL_ENABLED=false] to=${emailTo} subject="${emailSubject}"\n${emailText}`);
      return true;
    }
    const mailOptions = {
      from: emailFrom || mailConfig.from,
      to: emailTo,
      subject: emailSubject,
      html: emailText, // key phải là html chứ không phải text để gửi các thẻ html
    };

    await transporter.sendMail(mailOptions);
    return true;
  },

};

export default mailService;
