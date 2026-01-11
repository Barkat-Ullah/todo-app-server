import nodemailer from 'nodemailer';

export const generateOtpEmail = (otp: string) => {
  return `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 30px; background: linear-gradient(135deg, #6c63ff, #3f51b5); border-radius: 8px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
            <h2 style="color: #ffffff; font-size: 28px; text-align: center; margin-bottom: 20px;">
                <span style="color: #ffeb3b;">OTP Verification</span>
            </h2>
            <p style="font-size: 16px; color: #333; line-height: 1.5; text-align: center;">
                Your OTP code is below.
            </p>
            <p style="font-size: 32px; font-weight: bold; color: #ff4081; text-align: center; margin: 20px 0;">
                ${otp}
            </p>
            <div style="text-align: center; margin-bottom: 20px;">
                <p style="font-size: 14px; color: #555; margin-bottom: 10px;">
                    This OTP will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.
                </p>
                <p style="font-size: 14px; color: #555; margin-bottom: 10px;">
                    If you need assistance, feel free to contact us.
                </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 12px; color: #999; text-align: center;">
                    Best Regards,<br/>
                    <span style="font-weight: bold; color: #3f51b5;">Developer Team</span><br/>
                </p>
            </div>
        </div>
      </div>`;
};

const emailSender = async (to: string, html: string, subject: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 2525,
      secure: false,
      auth: {
        user: '88803c001@smtp-brevo.com',
        pass: 'OzqM8PBhVxbNYEUt',
      },
    });
    const mailOptions = {
      from: '<akonhasan680@gmail.com>',
      to,
      subject,
      text: html.replace(/<[^>]+>/g, ''),
      html,
    };
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    return info.messageId;
  } catch (error) {
    throw new Error('Failed to send email. Please try again later.');
  }
};
export default emailSender;
