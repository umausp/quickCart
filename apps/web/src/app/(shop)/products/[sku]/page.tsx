import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ProductOffersResponse } from "@quickcart/contracts";
import { EtaBadge, ExcludedSourceRow, PriceBlock, ProductThumb, SourceCompareRow, formatEta, formatRupees } from "@quickcart/ui";
import { ApiError, apiOptionalAuth } from "../../../../lib/api";
import { AddToCartButton } from "../../add-to-cart-button";

/**
 * The Detail screen — price/MRP/savings + the "Compare N sources" block (Doc 01/05). Real
 * Zepto skus (`ZEPTO-LIVE-*`) only resolve for the connected account, so this must send the
 * session token when one exists — `apiPublic` never does, which meant every real product's
 * detail page 404'd regardless of login state.
 */
export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sku: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { sku } = await params;
  const { mode = "balanced" } = await searchParams;
  let product: ProductOffersResponse;
  try {
    product = await apiOptionalAuth<ProductOffersResponse>(`/products/${encodeURIComponent(sku)}/offers?mode=${mode}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const best = product.offers[0];

  return (
    <Container maxWidth="sm" sx={{ py: 3, pb: 14 }}>
      <Stack spacing={2}>
        <Box sx={{ height: 260, borderRadius: 3, bgcolor: "grey.100", display: "grid", placeItems: "center", fontSize: "3.5rem", overflow: "hidden" }}>
          <ProductThumb image={product.image} alt={product.title} fill />
        </Box>

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {product.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product.packSize} · {product.category}
          </Typography>
        </Box>

        {best && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <PriceBlock pricePaise={best.pricePaise} mrpPaise={best.mrpPaise} />
            <EtaBadge minutes={best.etaMinutes} />
          </Stack>
        )}

        {product.description && (
          <Typography variant="body2" color="text.secondary">
            {product.description}
          </Typography>
        )}

        <Divider />

        <Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Compare {product.sourcesReturned} source{product.sourcesReturned === 1 ? "" : "s"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ranked by value
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            {product.offers.map((offer, i) => (
              <SourceCompareRow key={offer.source} offer={offer} isBest={i === 0} />
            ))}
            {product.excludedOffers.map((offer) => (
              <ExcludedSourceRow key={offer.source} offer={offer} />
            ))}
          </Stack>
        </Box>
      </Stack>

      {best && (
        <Box
          sx={{
            position: "fixed",
            bottom: 56,
            left: 0,
            right: 0,
            bgcolor: "background.paper",
            borderTop: "1px solid #eee",
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Best total
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {formatRupees(best.pricePaise)} · {formatEta(best.etaMinutes)}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 160 }}>
            <AddToCartButton canonicalSku={product.canonicalSku} sourceId={best.source} sourceProductId={best.sourceProductId} label="Add to cart" />
          </Box>
        </Box>
      )}
    </Container>
  );
}
