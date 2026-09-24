import { createTheme } from "@mui/material/styles";

/** Design tokens straight from Doc 01 §"Design tokens used". */
export const BRAND_INDIGO = "#4f46e5";
export const BRAND_VIOLET = "#7c3aed";
export const QUICK_GREEN = "#16a34a";
export const INK = "#0b0b0b";
export const MUTED = "#6f6d66";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: BRAND_INDIGO },
    secondary: { main: BRAND_VIOLET },
    success: { main: QUICK_GREEN },
    text: { primary: INK, secondary: MUTED },
    background: { default: "#faf9f7", paper: "#ffffff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Inter, -apple-system, system-ui, sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16 } }, defaultProps: { variant: "outlined" } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: { root: { borderBottom: "1px solid #ececec" } },
    },
  },
});
