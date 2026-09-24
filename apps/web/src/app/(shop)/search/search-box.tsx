"use client";

import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

/** A plain GET `<form>` — no Server Action needed for a read-only search navigation, so this
 * works even before JS hydrates (progressive enhancement). */
export function SearchBox({ action, placeholder, defaultValue, light }: { action: string; placeholder: string; defaultValue?: string; light?: boolean }) {
  return (
    <form action={action} method="get">
      <TextField
        name="q"
        placeholder={placeholder}
        defaultValue={defaultValue}
        fullWidth
        size="medium"
        autoFocus={!light}
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
