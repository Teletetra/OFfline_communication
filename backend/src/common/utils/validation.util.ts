export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const isStrongPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);