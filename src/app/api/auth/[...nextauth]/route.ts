// NextAuth route handler — serves all /api/auth/* endpoints (sign in, callback, etc.)
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
