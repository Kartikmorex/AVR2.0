import React, { createContext, useContext, useState } from "react";

export const TransformersContext = createContext(null);

export function TransformersProvider({ children }) {
  const [transformers, setTransformers] = useState([]); // Initial list from backend
  return (
    <TransformersContext.Provider value={{ transformers, setTransformers }}>
      {children}
    </TransformersContext.Provider>
  );
}

export function useTransformersContext() {
  return useContext(TransformersContext);
} 