import { IngestionDraft } from '@marginmitra/shared';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useState
} from 'react';

import { fetchDraft } from '../lib/api';

interface IngestionDraftContextValue {
  draft: IngestionDraft | null;
  setDraft: (draft: IngestionDraft | null) => void;
  loadDraft: (draftId: string) => Promise<IngestionDraft>;
  clearDraft: () => void;
}

const IngestionDraftContext = createContext<IngestionDraftContextValue | null>(
  null
);

export function IngestionDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraftState] = useState<IngestionDraft | null>(null);

  async function loadDraft(draftId: string) {
    const loadedDraft = await fetchDraft(draftId);
    setDraftState(loadedDraft);
    return loadedDraft;
  }

  return (
    <IngestionDraftContext.Provider
      value={{
        draft,
        setDraft: setDraftState,
        loadDraft,
        clearDraft: () => setDraftState(null)
      }}
    >
      {children}
    </IngestionDraftContext.Provider>
  );
}

export function useIngestionDraft() {
  const context = useContext(IngestionDraftContext);

  if (!context) {
    throw new Error(
      'useIngestionDraft must be used inside IngestionDraftProvider.'
    );
  }

  return context;
}

