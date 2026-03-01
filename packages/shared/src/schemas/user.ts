import { z } from "zod";

export const UserSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    displayName: z.string().min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const LoginSchema = z.object({
    email: z.email(),
    password: z.string(),
});
export type Login = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    displayName: z.string().min(1),
});
export type Register = z.infer<typeof RegisterSchema>;