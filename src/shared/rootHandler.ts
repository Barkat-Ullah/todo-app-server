import { Request, Response, NextFunction } from 'express';
import os from 'os';
import httpStatus from 'http-status';
import config from '../config';

export const rootHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const currentDateTime = new Date().toISOString();
  const rawClientIp =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const serverPlatform = os.platform();
  const serverUptime = os.uptime();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);
  const cpuLoad = os.loadavg()[0].toFixed(2);

  const isDev = process.env.NODE_ENV === 'development';

  // Development: show full info, Production: mask sensitive info
  const nodeVersion = isDev ? process.version : 'hidden';
  const serverHostname = isDev ? os.hostname() : 'hidden';
  const clientIp = isDev ? rawClientIp : 'xxx.xxx.xxx.xxx';
  const memoryUsage = isDev
    ? `${(usedMemory / 1024 / 1024).toFixed(2)} MB / ${(
        totalMemory /
        1024 /
        1024
      ).toFixed(2)} MB (${memoryUsagePercent}%)`
    : `${memoryUsagePercent}%`;

    //fun facts
  const data = {
    message: `🚀 Welcome to this project. Server is running on port ${config.port}`,
    version: '1.0.0',
    clientDetails: {
      ipAddress: clientIp,
      accessedAt: isDev ? currentDateTime : 'unknown',
    },
    serverDetails: {
      hostname: serverHostname,
      platform: serverPlatform,
      uptime: `${Math.floor(serverUptime / 60 / 60)} hours ${Math.floor(
        (serverUptime / 60) % 60,
      )} minutes`,
      nodeVersion,
      memoryUsage,
      cpuLoad,
      currentDateTime,
    },
    developerContact: {
      email: 'barkatullah585464@gmail.com',
      website: 'https://barkat-rakib.vercel.app',
    },
  };

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Project Info</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #a1c4fd, #c2e9fb);
        margin: 0;
        padding: 50px 20px;
      }
      .circle {
        position: absolute;
        border-radius: 50%;
        opacity: 0.2;
      }
      .circle1 { width: 120px; height: 120px; background: #ff6b6b; top: 40px; left: 30px; }
      .circle2 { width: 80px; height: 80px; background: #1dd1a1; top: 150px; right: 50px; }
      .circle3 { width: 100px; height: 100px; background: #ff9f43; bottom: 50px; left: 40%; }

      .container {
        max-width: 750px;
        margin: auto;
        background: #fff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        position: relative;
        z-index: 1;
      }
      .header {
        text-align: center;
        background: #3f51b5;
        color: #fff;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 25px;
      }
      h1 { margin: 0; font-size: 24px; }
      .section { margin-bottom: 25px; }
      .section h3 {
        margin-bottom: 10px;
        color: #3f51b5;
        display: flex;
        align-items: center;
        font-size: 18px;
      }
      .section h3 span { margin-right: 8px; }
      ul { list-style: none; padding: 0; margin: 0; }
      li { padding: 6px 0; font-size: 14px; border-bottom: 1px solid #eee; }
      li:last-child { border-bottom: none; }
      a { color: #3f51b5; text-decoration: none; }
      .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
    </style>
  </head>
  <body>
    <div class="circle circle1"></div>
    <div class="circle circle2"></div>
    <div class="circle circle3"></div>

    <div class="container">
      <div class="header">
        <h1>${data.message}</h1>
        <p>Version: <b>${data.version}</b></p>
      </div>

      <div class="section">
        <h3><span>📌</span> Client Details</h3>
        <ul>
          <li><b>IP Address:</b> ${data.clientDetails.ipAddress}</li>
          <li><b>Accessed At:</b> ${data.clientDetails.accessedAt}</li>
        </ul>
      </div>

      <div class="section">
        <h3><span>🖥️</span> Server Details</h3>
        <ul>
          <li><b>Hostname:</b> ${data.serverDetails.hostname}</li>
          <li><b>Platform:</b> ${data.serverDetails.platform}</li>
          <li><b>Uptime:</b> ${data.serverDetails.uptime}</li>
          <li><b>Node.js Version:</b> ${data.serverDetails.nodeVersion}</li>
          <li><b>Memory Usage:</b> ${data.serverDetails.memoryUsage}</li>
          <li><b>CPU Load:</b> ${data.serverDetails.cpuLoad}</li>
          <li><b>Server Date-Time:</b> ${data.serverDetails.currentDateTime}</li>
        </ul>
      </div>

      <div class="section">
        <h3><span>📞</span> Developer Contact</h3>
        <ul>
          <li><b>Email:</b> <a href="mailto:${data.developerContact.email}">${data.developerContact.email}</a></li>
          <li><b>Website:</b> <a href="${data.developerContact.website}" target="_blank">${data.developerContact.website}</a></li>
        </ul>
      </div>

      <div class="footer">
        <p>Best Regards,<br><b>Developer Team</b></p>
      </div>
    </div>
  </body>
  </html>
  `;

  res.status(httpStatus.OK).send(html);
};
