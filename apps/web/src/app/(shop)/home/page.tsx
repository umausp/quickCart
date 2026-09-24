import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DEFAULT_CATEGORIES } from "@quickcart/contracts";
import { hasAnyRealData } from "../../../lib/api";
import { SearchBox } from "../search/search-box";
import { LinkButton } from "../link-components";
import { CategoryLink } from "./category-link";

/**
 * Categories-first home: no live "best deals" fetch here anymore — that was the slowest part
 * of every home-page load (a real search on every visit) for a section that's arguably less
 * useful than just letting the shopper pick where to start. Real product results now only
 * ever come from an explicit search.
 */
export default async function HomePage() {
  const hasRealData = await hasAnyRealData();

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Box
          sx={{
            p: 3,
            borderRadius: 4,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "#fff",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Everything, in minutes ⚡
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
            Real, live results from Zepto &amp; Swiggy Instamart — no demo data.
          </Typography>
          <SearchBox action="/search/results" placeholder="Search milk, eggs, earbuds…" light />
        </Box>

        {!hasRealData && (
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: "#f5f3ff",
              border: "1px solid #ddd6fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Connect a real account
              </Typography>
              <Typography variant="caption" color="text.secondary">
                QuickCart only shows real data, and no shared account is available right now —
                connect your own Zepto or Swiggy account to start browsing.
              </Typography>
            </Box>
            <LinkButton href="/profile" variant="contained">
              Connect an account
            </LinkButton>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Shop by category
          </Typography>
          <Grid container spacing={1.5}>
            {DEFAULT_CATEGORIES.map((category) => (
              <Grid key={category.id} size={{ xs: 4, sm: 3, md: 2 }}>
                <CategoryLink category={category} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Stack>
    </Container>
  );
}
