import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DEFAULT_CATEGORIES, type SearchResponse } from "@quickcart/contracts";
import { EmptyState } from "@quickcart/ui";
import { apiOptionalAuth, isZeptoConnected } from "../../../lib/api";
import { SearchBox } from "../search/search-box";
import { ResultCard } from "../result-card";
import { LinkButton } from "../link-components";
import { CategoryLink } from "./category-link";

export default async function HomePage() {
  const [deals, connected] = await Promise.all([apiOptionalAuth<SearchResponse>("/search?limit=8"), isZeptoConnected()]);

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
            Real, live results from your connected Zepto account — no demo data.
          </Typography>
          <SearchBox action="/search/results" placeholder="Search milk, eggs, earbuds…" light />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Categories
          </Typography>
          <Grid container spacing={1.5}>
            {DEFAULT_CATEGORIES.map((category) => (
              <Grid key={category.id} size={{ xs: 3, sm: 2 }}>
                <CategoryLink category={category} />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Best deals near you
          </Typography>
          {deals.results.length === 0 ? (
            connected ? (
              <EmptyState icon="🔍" title="No deals right now" subtitle="Try searching for a product instead." />
            ) : (
              <EmptyState
                icon="🔗"
                title="Connect Zepto to see real deals"
                subtitle="QuickCart only shows real data — connect your account to start browsing."
                action={
                  <LinkButton href="/profile" variant="contained">
                    Connect Zepto
                  </LinkButton>
                }
              />
            )
          ) : (
            <Grid container spacing={2}>
              {deals.results.map((card) => (
                <Grid key={card.canonicalSku} size={{ xs: 6, sm: 4, md: 3 }}>
                  <ResultCard card={card} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
