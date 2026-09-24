import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export default function ProductDetailLoading() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <CircularProgress />
    </Box>
  );
}
