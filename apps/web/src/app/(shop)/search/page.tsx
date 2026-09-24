import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DEFAULT_CATEGORIES } from "@quickcart/contracts";
import { LinkChip } from "../link-components";
import { SearchBox } from "./search-box";

/** No "recent searches" store in this ideation build — trending is a static illustrative
 * list (Doc 01's Search tab, distinct from the results screen). */
const TRENDING = ["butter", "chips", "noodles", "earbuds", "detergent", "toothpaste"];

export default function SearchLandingPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <SearchBox action="/search/results" placeholder="Search milk, eggs, earbuds…" />

        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Trending
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            {TRENDING.map((term) => (
              <LinkChip key={term} href={`/search/results?q=${term}`} label={term} />
            ))}
          </Stack>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Browse categories
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            {DEFAULT_CATEGORIES.map((category) => (
              <LinkChip key={category.id} href={`/search/results?q=${encodeURIComponent(category.id)}`} label={`${category.icon} ${category.name}`} variant="outlined" />
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
