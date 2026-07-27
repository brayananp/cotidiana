import { resolveAppAccess } from '#/platform/auth/app-access';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({ 
  ssr: false,
  beforeLoad: async () => {
    const access = await resolveAppAccess();
    if (!access.canEnterApp) {
      return redirect({
        to: '/login',
      })
    }
    return redirect({
      to: '/dashboard',
    })
  }
 })


