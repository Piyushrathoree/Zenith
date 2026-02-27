import bcrypt from 'bcryptjs';

/**
 * Generates a random 6-digit verification code.
 */
const generateCode = (): number => {
    return Math.floor(100000 + Math.random() * 900000);
};

/**
 * Hashes a plain-text password with bcrypt (12 salt rounds).
 */
const hashPassword = (password: string): Promise<string> => {
    return bcrypt.hash(password, 12);
};

export { generateCode, hashPassword };
