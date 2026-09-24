import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

/** Real Zepto calls (a live external handshake, not a local mock) can take a few seconds —
 * without this, clicking "Home" while that's in flight looked like the click did nothing. */
export default function HomeLoading() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <CircularProgress />
    </Box>
  );
}
