"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Badge from "@mui/material/Badge";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PersonIcon from "@mui/icons-material/Person";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: <HomeIcon /> },
  { href: "/search", label: "Search", icon: <SearchIcon /> },
  { href: "/cart", label: "Cart", icon: <ShoppingCartIcon /> },
  { href: "/orders", label: "Orders", icon: <Inventory2Icon /> },
  { href: "/addresses", label: "Profile", icon: <PersonIcon /> },
];

function activeIndexFor(pathname: string): number {
  const index = NAV_ITEMS.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return index === -1 ? 0 : index;
}

const TITLES: Array<[string, string]> = [
  ["/home", "QuickCart"],
  ["/search/results", "Search results"],
  ["/search", "Search"],
  ["/cart", "Your cart"],
  ["/checkout", "Checkout"],
  ["/orders", "Orders"],
  ["/addresses", "Addresses"],
  ["/products", "Product"],
];

function titleFor(pathname: string): string {
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "QuickCart";
}

/** The persistent chrome for every logged-in screen (Doc 01's tab bar: Home / Search / Cart /
 * Orders / Profile). Still SSR'd — "use client" only means it hydrates for the tap handlers. */
export function AppShell({ children, cartItemCount }: { children: ReactNode; cartItemCount: number }) {
  const pathname = usePathname();
  const activeIndex = activeIndexFor(pathname);
  const title = titleFor(pathname);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1 }}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, pb: 9 }}>
        {children}
      </Box>

      <Paper elevation={3} sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}>
        <BottomNavigation showLabels value={activeIndex}>
          {NAV_ITEMS.map((item, i) => (
            <BottomNavigationAction
              key={item.href}
              label={item.label}
              component={Link}
              href={item.href}
              icon={i === 2 ? <Badge badgeContent={cartItemCount} color="secondary">{item.icon}</Badge> : item.icon}
              value={i}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
