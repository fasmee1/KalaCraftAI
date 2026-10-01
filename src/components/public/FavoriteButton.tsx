"use client";

import { useState } from "react";
import { HeartIcon } from "./icons";

export function FavoriteButton({ name }: { name: string }) {
  const [liked, setLiked] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setLiked((v) => !v)}
      aria-pressed={liked}
      aria-label={liked ? `เลิกถูกใจ ${name}` : `ถูกใจ ${name}`}
      className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-surface/90 text-primary transition active:scale-90"
    >
      <HeartIcon size={16} filled={liked} />
    </button>
  );
}
