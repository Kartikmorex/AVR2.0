import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Transformer } from "@/types/transformer";

interface TransformersContextType {
  transformers: Transformer[];
  setTransformers: React.Dispatch<React.SetStateAction<Transformer[]>>;
}

interface TransformersProviderProps {
  children: ReactNode;
}

export const TransformersContext = createContext<TransformersContextType | null>(null);

export function TransformersProvider({ children }: TransformersProviderProps) {
  const [transformers, setTransformers] = useState<Transformer[]>([]); // Initial list from backend
  return (
    <TransformersContext.Provider value={{ transformers, setTransformers }}>
      {children}
    </TransformersContext.Provider>
  );
}

export function useTransformersContext() {
  const context = useContext(TransformersContext);
  if (!context) {
    throw new Error("useTransformersContext must be used within a TransformersProvider");
  }
  return context;
} 