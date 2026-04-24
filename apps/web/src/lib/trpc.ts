import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@nextgame/api';

export const trpc = createTRPCReact<AppRouter>();
