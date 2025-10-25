import React, { createContext, ReactNode, useContext, useState } from 'react';

type ReportModalContextType = {
  isReportFormOpen: boolean;
  setReportFormOpen: (v: boolean) => void;
};

const ReportModalContext = createContext<ReportModalContextType | undefined>(undefined);

export function ReportModalProvider({ children }: { children: ReactNode }) {
  const [isReportFormOpen, setReportFormOpen] = useState(false);
  return (
    <ReportModalContext.Provider value={{ isReportFormOpen, setReportFormOpen }}>
      {children}
    </ReportModalContext.Provider>
  );
}

export function useReportModal() {
  const ctx = useContext(ReportModalContext);
  if (!ctx) throw new Error('useReportModal must be used within ReportModalProvider');
  return ctx;
}

export default ReportModalProvider;
