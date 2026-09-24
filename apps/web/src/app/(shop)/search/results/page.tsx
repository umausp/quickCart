import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { SearchResponse } from "@quickcart/contracts";
import { EmptyState } from "@quickcart/ui";
import { apiOptionalAuth, hasAnyRealData } from "../../../../lib/api";
import { LinkButton, LinkChip } from "../../link-components";
import { ResultCard } from "../../result-card";
import { SearchBox } from "../search-box";

/** The filter chips from Doc 01's List mockup — each maps to a ranking-weight override on
 * the backend (Doc 05 §5), not a separate query path. */
const MODES = [
  { key: "balanced", label: "⚖️ Balanced" },
  { key: "fastest", label: "⚡ Fastest" },
  { key: "cheapest", label: "💰 Cheapest" },
];

export default async function SearchResultsPage({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string }> }) {
  const { q = "", mode = "balanced" } = await searchParams;
  const [response, hasRealData] = await Promise.all([
    apiOptionalAuth<SearchResponse>(`/search?q=${encodeURIComponent(q)}&mode=${mode}&limit=20`),
    hasAnyRealData(),
  ]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <SearchBox action="/search/results" placeholder="Search milk, eggs, earbuds…" defaultValue={q} autoFocus={false} />

        <Stack direction="row" spacing={1}>
          {MODES.map((m) => (
            <LinkChip
              key={m.key}
              href={`/search/results?q=${encodeURIComponent(q)}&mode=${m.key}`}
              label={m.label}
              color={mode === m.key ? "primary" : "default"}
              variant={mode === m.key ? "filled" : "outlined"}
            />
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {response.results.length} result{response.results.length === 1 ? "" : "s"} · {hasRealData ? "live from Zepto & Swiggy" : "no real data available"}
        </Typography>

        {response.results.length === 0 ? (
          hasRealData ? (
            <EmptyState icon="🔍" title="No results" subtitle={`Nothing matched "${q}" right now.`} />
          ) : (
            <EmptyState
              icon="🔗"
              title="Connect an account to search"
              subtitle="QuickCart only shows real data — connect your Zepto or Swiggy account to start browsing."
              action={
                <LinkButton href="/profile" variant="contained">
                  Connect an account
                </LinkButton>
              }
            />
          )
        ) : (
          <Grid container spacing={2}>
            {response.results.map((card) => (
              <Grid key={card.canonicalSku} size={{ xs: 6, sm: 4, md: 3 }}>
                <ResultCard card={card} />
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
