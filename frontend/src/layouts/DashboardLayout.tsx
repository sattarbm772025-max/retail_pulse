import {
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useState, type ReactNode } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { notificationApi } from "../api/notificationApi";
const links = [
  {
    label: "Dashboard",
    path: "/dashboard",
  },

  {
    label: "Sales",
    path: "/sales",
  },
  {
    label: "Analytics",
    path: "/analytics",
  },
  {
    label: "Forecast",
    path: "/forecast",
  },
  {
    label: "Customers",
    path: "/customers",
  },

  {
    label: "Categories",
    path: "/catalog?tab=categories",
  },

  {
    label: "Products",
    path: "/catalog?tab=products",
  },

  {
    label: "Inventory",
    path: "/inventory",
  },

  {
    label: "Reports",
    path: "/dashboard",
  },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [notificationAnchor, setNotificationAnchor] =
    useState<HTMLElement | null>(null);
  const canViewNotifications = ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(
    profile?.role ?? "",
  );
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.list().then((response) => response.data),
    enabled: canViewNotifications,
    refetchInterval: 60_000,
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  const sidebar = (
    <Box
      sx={{
        height: "100%",
        bgcolor: "#061a3a",
        color: "white",
        p: 2,
      }}
    >
      <Stack spacing={0.5} mb={4}>
        <Typography fontWeight={800} fontSize={20}>
          RetailPulse
        </Typography>

        <Typography
          variant="caption"
          sx={{
            opacity: 0.7,
          }}
        >
          Analytics
        </Typography>
      </Stack>

      <List disablePadding>
        {links.map((link) => (
          <ListItemButton
            key={link.label}
            selected={
              location.pathname === link.path &&
              !(link.label === "Categories" && !location.search)
            }

            onClick={() => {
              navigate(link.path);
              setMobileOpen(false);
            }}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              minHeight: 44,
              "&.Mui-selected": {
                bgcolor: "rgba(255,255,255,.13)",
              },
              "&:hover": {
                bgcolor: "rgba(255,255,255,.09)",
              },
            }}
          >
            <ListItemText
              primary={link.label}
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: 600,
              }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box mt="auto" pt={4}>
        <Typography
          variant="caption"
          sx={{
            opacity: 0.7,
          }}
        >
          Legend
        </Typography>
        <Stack direction="row" spacing={1} mt={1} alignItems="center">
          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              bgcolor: "#4ade80",
            }}
          />
          <Typography variant="caption">Active</Typography>

          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              bgcolor: "#fbbf24",
              ml: 1,
            }}
          />
          <Typography variant="caption">Low stock</Typography>
        </Stack>
      </Box>
    </Box>
  );

  const title =
    location.pathname === "/sales"
      ? "Sales Management"
      : location.pathname === "/inventory"
        ? "Inventory Management"
        : location.pathname === "/catalog"
          ? "Product & Category Management"
          : "Dashboard";
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
      }}
    >
      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: {
            xs: "none",
            md: "block",
          },
          width: 240,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 240,
            border: 0,
          },
        }}
      >
        {sidebar}
      </Drawer>
      {/* Mobile Sidebar */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: {
            xs: "block",
            md: "none",
          },
          "& .MuiDrawer-paper": {
            width: 260,
            border: 0,
          },
        }}
      >
        {sidebar}
      </Drawer>
      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <Toolbar
          sx={{
            minHeight: {
              xs: 60,
              md: 72,
            },

            px: {
              xs: 1,
              sm: 3,
            },
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              sx={{
                display: {
                  xs: "inline-flex",
                  md: "none",
                },
                minWidth: 44,
              }}
              onClick={() => setMobileOpen(true)}
            >
              Menu
            </Button>

            <Typography fontWeight={700} noWrap>
              {title}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Button
              onClick={(event) => setAnchor(event.currentTarget)}

              sx={{
                textTransform: "none",
                color: "text.primary",
                gap: 1,
                minWidth: 44,
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "primary.main",
                }}
              >
                {profile?.name.charAt(0)}
              </Avatar>

              <Box
                textAlign="left"
                sx={{
                  display: "none",
                }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {profile?.name}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {profile?.role.replace("_", " ")}
                </Typography>
              </Box>
            </Button>

            {canViewNotifications && (
              <>
                <IconButton
                  aria-label="Open notifications"
                  onClick={(event) => {
                    event.currentTarget.blur();
                    setNotificationAnchor(event.currentTarget);
                  }}
                >
                  <Badge
                    badgeContent={notifications.data?.length ?? 0}
                    color="error"
                    max={99}
                  >
                    <NotificationsNoneIcon />
                  </Badge>
                </IconButton>
                <Menu
                  anchorEl={notificationAnchor}
                  open={Boolean(notificationAnchor)}
                  onClose={() => setNotificationAnchor(null)}
                >
                  <Box px={2} py={1} minWidth={300}>
                    <Typography fontWeight={700}>Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Inventory alerts for your company
                    </Typography>
                  </Box>
                  {notifications.data?.length ? (
                    notifications.data.map((notification) => (
                      <MenuItem
                        key={notification.id}
                        sx={{ whiteSpace: "normal", maxWidth: 360 }}
                      >
                    <Box>
                          <Typography variant="body2">
                            {notification.message}
                          </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                      {!notification.is_read && (
                        <Button
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            notificationApi
                              .markAsRead(notification.id)
                              .then(() =>
                                queryClient.invalidateQueries({
                                  queryKey: ["notifications"],
                                }),
                              );
                          }}
                        >
                          Mark as read
                        </Button>
                      )}
                    </Box>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No new inventory notifications</MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Stack>

          <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}

            onClose={() => setAnchor(null)}
          >
            <Box px={2} py={1}>
              <Typography fontWeight={700}>{profile?.name}</Typography>

              <Typography variant="body2" color="text.secondary">
                {profile?.email}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {profile?.company.name}
              </Typography>
            </Box>

            <MenuItem
              onClick={() => {
                setAnchor(null);
                navigate("/profile");
              }}
            >
              Profile details
            </MenuItem>

            <MenuItem onClick={logout}>Sign out</MenuItem>
          </Menu>
        </Toolbar>

        <Box
          sx={{
            p: {
              xs: 1.5,
              sm: 2.5,
              md: 4,
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
