import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

/** Real Zepto search is a live external handshake, not a local mock — can take a few seconds,
 * during which navigation would otherwise look like it silently did nothing. */
export default function SearchResultsLoading() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <CircularProgress />
    </Box>
  );
}
