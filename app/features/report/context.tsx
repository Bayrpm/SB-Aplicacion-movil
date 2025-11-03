import React, { createContext, ReactNode, useContext, useState } from 'react';

type ReportModalContextType = {
  isReportFormOpen: boolean;
  setReportFormOpen: (v: boolean) => void;
  reportDetailId: string | null;
  setReportDetailId: (id: string | null) => void;
  openReportDetail: (reportId: string) => void;
};

const ReportModalContext = createContext<ReportModalContextType | undefined>(undefined);

export function ReportModalProvider({ children }: { children: ReactNode }) {
  const [isReportFormOpen, setReportFormOpen] = useState(false);
  const [reportDetailId, setReportDetailId] = useState<string | null>(null);

  const openReportDetail = (reportId: string) => {
    setReportDetailId(reportId);
  };

  return (
    <ReportModalContext.Provider value={{ 
      isReportFormOpen, 
      setReportFormOpen,
      reportDetailId,
      setReportDetailId,
      openReportDetail,
    }}>
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
