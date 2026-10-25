import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DreamSignsPage } from './pages/DreamSignsPage';
import { FalseAwakeningsPage } from './pages/FalseAwakeningsPage';
import { TimelinePage } from './pages/TimelinePage';
import { Journal } from './pages/Journal';
import { DreamEditorPage } from './pages/DreamEditorPage';
import { CalendarPage } from './pages/CalendarPage';
import { LucidDreamsPage } from './pages/LucidDreamsPage';
import { TechniquesPage } from './pages/TechniquesPage';
import { SettingsPage } from './pages/SettingsPage';
import { CorrelationPage } from './pages/CorrelationPage';
import { FaqPage } from './pages/FaqPage';
import { DreamEntry } from './types/dream';

interface LayoutContextType {
  onOpenNewDream: (date?: string) => void;
  onEditDream: (dream: DreamEntry) => void;
}

const CorrelationRoute: React.FC = () => {
  const { onEditDream } = useOutletContext<LayoutContextType>();
  return <CorrelationPage onOpenDream={onEditDream} />;
};

const DashboardRoute: React.FC = () => {
  const { onOpenNewDream, onEditDream } = useOutletContext<LayoutContextType>();
  return <Dashboard onOpenNewDream={() => onOpenNewDream()} onEditDream={onEditDream} />;
};

const JournalRoute: React.FC = () => {
  const { onOpenNewDream, onEditDream } = useOutletContext<LayoutContextType>();
  return <Journal onOpenNewDream={() => onOpenNewDream()} onEditDream={onEditDream} />;
};

const CalendarRoute: React.FC = () => {
  const { onOpenNewDream, onEditDream } = useOutletContext<LayoutContextType>();
  return <CalendarPage onOpenNewDream={(date) => onOpenNewDream(date)} onEditDream={onEditDream} />;
};

const LucidRoute: React.FC = () => {
  const { onOpenNewDream, onEditDream } = useOutletContext<LayoutContextType>();
  return <LucidDreamsPage onOpenNewDream={() => onOpenNewDream()} onEditDream={onEditDream} />;
};

const DreamSignsRoute: React.FC = () => {
  const { onEditDream } = useOutletContext<LayoutContextType>();
  return <DreamSignsPage onEditDream={onEditDream} />;
};

const FalseAwakeningsRoute: React.FC = () => {
  const { onOpenNewDream, onEditDream } = useOutletContext<LayoutContextType>();
  return <FalseAwakeningsPage onOpenNewDream={() => onOpenNewDream()} onEditDream={onEditDream} />;
};

const TimelineRoute: React.FC = () => {
  const { onOpenNewDream, onEditDream } = useOutletContext<LayoutContextType>();
  return <TimelinePage onOpenNewDream={() => onOpenNewDream()} onEditDream={onEditDream} />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardRoute />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="correlations" element={<CorrelationRoute />} />
          <Route path="journal" element={<JournalRoute />} />
          <Route path="journal/new" element={<DreamEditorPage />} />
          <Route path="journal/edit/:id" element={<DreamEditorPage />} />
          <Route path="signs" element={<DreamSignsRoute />} />
          <Route path="calendar" element={<CalendarRoute />} />
          <Route path="timeline" element={<TimelineRoute />} />
          <Route path="lucid" element={<LucidRoute />} />
          <Route path="false-awakenings" element={<FalseAwakeningsRoute />} />
          <Route path="techniques" element={<TechniquesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
