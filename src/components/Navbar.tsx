import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Notification } from '@/lib/db';
import { useCallback } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

export function Navbar() {
  const { isMobile, state } = useSidebar();
  // Only show unread notifications in the dropdown (Dexie boolean index isn't strongly typed here -> filter in JS)
  const allNotifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().toArray(), []);
  const notifications = allNotifications ? allNotifications.filter(n => !n.read) : [];
  const unreadCount = notifications.length;
  const clearReadNotifications = useCallback(async () => {
  // delete all read notifications from DB
  const all = await db.notifications.toArray();
  const readItems = all.filter(n => n.read);
  await Promise.all(readItems.map(r => db.notifications.delete(r.id)));
  }, []);


  const markAsRead = useCallback(async (id: string) => {
    await db.notifications.update(id, { read: true });
  }, []);

  // Compute left offset so the navbar aligns with the main content area.
  // - On mobile we pin to left:0
  // - When the sidebar is collapsed, use the icon-width variable
  // - Otherwise use the full sidebar width
  const leftOffset = isMobile ? 0 : state === 'collapsed' ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)';

  return (
  <header style={{ left: leftOffset }} className="fixed top-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <SidebarTrigger className="-ml-1" />

        {/* Small brand: icon + subtitle only */}
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="logo" className="h-7 w-7 rounded-md" />
          <div className="hidden sm:block text-sm font-medium">HR Management Suite</div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <button
                  className="text-xs text-muted-foreground underline"
                  onClick={(e) => {
                    e.preventDefault();
                    clearReadNotifications();
                  }}
                >
                  Clear read
                </button>
              </DropdownMenuLabel>
              <div className="max-w-sm">
                {notifications && notifications.length > 0 ? (
                  notifications.map((n: Notification) => (
                    <div
                      key={n.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        // Right-click marks as read
                        markAsRead(n.id);
                      }}
                    >
                      <DropdownMenuItem>
                        <div className="flex flex-col">
                          <span className="font-medium">{n.title}</span>
                          {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                        </div>
                      </DropdownMenuItem>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No notifications</div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
