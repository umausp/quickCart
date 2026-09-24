import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DEFAULT_CATEGORIES, type SearchResponse } from "@quickcart/contracts";
import { EmptyState } from "@quickcart/ui";
import { apiOptionalAuth } from "../../../lib/api";
import { SearchBox } from "../search/search-box";
import { ResultCard } from "../result-card";
import { CategoryLink } from "./category-link";

export default async function HomePage() {
  const deals = await apiOptionalAuth<SearchResponse>("/search?limit=8");

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
            One search across Blinkit, Zepto, BigBasket, Flipkart &amp; Amazon — we buy you the best.
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
            <EmptyState icon="🔍" title="No deals yet" subtitle="Try searching for a product." />
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
