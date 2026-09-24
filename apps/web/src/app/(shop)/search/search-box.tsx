"use client";

import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

/** A plain GET `<form>` — no Server Action needed for a read-only search navigation, so this
 * works even before JS hydrates (progressive enhancement). `autoFocus` defaults to on for the
 * "about to type" landing page, but must be off once there's already a query to look at —
 * every render/revalidation of the results page was otherwise stealing focus back into the
 * input, which could swallow or misdirect the very next click (e.g. the bottom-nav "Home"
 * button) if it landed while focus was being reclaimed. */
export function SearchBox({
  action,
  placeholder,
  defaultValue,
  light,
  autoFocus = true,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  light?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <form action={action} method="get">
      <TextField
        name="q"
        placeholder={placeholder}
        defaultValue={defaultValue}
        fullWidth
        size="medium"
        autoFocus={autoFocus && !light}
        sx={light ? { bgcolor: "#fff", borderRadius: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } } : undefined}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
    </form>
  );
}
