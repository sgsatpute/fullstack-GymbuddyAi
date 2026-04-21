import jwt from "jsonwebtoken";

const SECRET = "gymbuddy_secret_key"; // later move to .env

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
