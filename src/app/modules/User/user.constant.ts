export const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  status: true,
  isEmailVerified: true,
  createdAt: true,
};

export const verifyEmailHTML = (link: string) => {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 20px 0;
        }
        .header h1 {
            color: #333333;
            margin: 0;
        }
        .content {
            padding: 20px;
            text-align: center;
        }
        .content p {
            color: #555555;
            line-height: 1.6;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            margin: 20px 0;
            font-size: 16px;
            color: #ffffff;
            background-color: #007bff;
            text-decoration: none;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #777777;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Let's Ignite Your Child's Love for Learning</h1>
        </div>
        <div class="content">
            <p>Thank you for signing up! To complete your registration, please verify your email address by clicking the button below:</p>
            <a href=${link} class="button">Verify Email Address</a>
            <p>If you did not create an account, no further action is required.</p>
        </div>
        <div class="footer">
            <p>&copy; 2023 Your Company. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

export const successEmailVerificationHTML = () => {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Success</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #4CAF50;
            font-size: 2.5rem;
            margin-bottom: 1rem;
          }
          p {
            color: #333;
            font-size: 1.2rem;
          }
          .icon {
            font-size: 4rem;
            color: #4CAF50;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✔</div>
          <h1>Email Verified</h1>
          <p>Your email has been successfully verified.</p>
        </div>
      </body>
      </html>
    `;
};

export const failedEmailVerificationHTML = (client_server: string) => {
  return `
          <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification Failed</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f9;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          width: 90%;
          max-width: 500px;
        }
        h1 {
          color: #FF5252;
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        p {
          color: #333;
          font-size: 1.2rem;
        }
        .icon {
          font-size: 4rem;
          color: #FF5252;
          margin-bottom: 1rem;
        }
        button {
          background-color: #FF5252;
          color: white;
          padding: 1rem 2rem;
          font-size: 1.2rem;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease;
          margin-top: 1rem;
        }
        button:hover {
          background-color: #e04747;
        }
        a {
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✖</div>
        <h1>Verification Failed</h1>
        <p>Your email verification token is invalid or has expired. <br /> Please request a new verification email to proceed.</p>
        <p>Thank you for using our service.</p>
        <a href="${client_server}">
          <button>Go to Home</button>
        </a>
      </div>
    </body>
    </html>
        `;
};
