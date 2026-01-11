import crypto from 'crypto';
import config from '../../config';
const generateHashedToken = (token: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return hashedToken;
};
const generateEmailVerificationLink = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const emailVerificationLink = `${config.base_url_server}/api/v1/users/verify-email/${token}`;
  const hashedToken = generateHashedToken(token);
  return [emailVerificationLink, hashedToken];
};
const generateEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = generateHashedToken(token);
  return hashedToken
}



export const verification = {
  generateEmailVerificationLink,
  generateHashedToken,
  generateEmailVerificationToken
};
