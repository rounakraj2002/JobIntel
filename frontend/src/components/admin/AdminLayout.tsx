import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      {/* Mobile drawer trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="w-full max-w-xs p-0">
            {/* Reuse sidebar navigation for mobile: render all nav items */}
            <div className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JI</span>
                </div>
                <span className="font-bold text-foreground">Admin</span>
              </div>
              <nav className="flex flex-col gap-2">
                <a href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Dashboard</a>
                <a href="/admin/jobs" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Jobs</a>
                <a href="/admin/users" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Users</a>
                <a href="/admin/notifications" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Notifications</a>
                <a href="/admin/referrals" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Referrals</a>
                <a href="/admin/crawlers" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Crawlers</a>
                <a href="/admin/analytics" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Analytics</a>
                <a href="/admin/revenue" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Revenue</a>
                <a href="/admin/settings" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Settings</a>
                <a href="/admin/profile-fields" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Profile Fields</a>
                <a href="/admin/skills" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">Skills</a>
              </nav>
              <div className="mt-4 border-t pt-4">
                <a href="/" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted block">Exit Admin</a>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <main className="ml-0 lg:ml-64 transition-all duration-300">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
