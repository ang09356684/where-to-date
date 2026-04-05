"use client";

import { useState, useEffect, useCallback } from "react";
import type { Place } from "@/types";

const STORAGE_KEY = "noidea-favorites";

function readFavorites(): Place[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: Place[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Place[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggle = useCallback(
    (place: Place) => {
      const exists = favorites.some((f) => f.id === place.id);
      const next = exists
        ? favorites.filter((f) => f.id !== place.id)
        : [...favorites, place];
      setFavorites(next);
      writeFavorites(next);
    },
    [favorites]
  );

  const remove = useCallback(
    (id: string) => {
      const next = favorites.filter((f) => f.id !== id);
      setFavorites(next);
      writeFavorites(next);
    },
    [favorites]
  );

  const clear = useCallback(() => {
    setFavorites([]);
    writeFavorites([]);
  }, []);

  return { favorites, isFavorite, toggle, remove, clear };
}
