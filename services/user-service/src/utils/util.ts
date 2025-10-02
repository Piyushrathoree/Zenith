import bcrypt from "bcryptjs";

const hashPassword = (password: string) => {
    return bcrypt.hash(password, 12);
};

const generateCode = () => {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    return randomNumber;
};

export { hashPassword, generateCode };
