import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EventsTimeline from './pages/EventsTimeline'
import EventsStreamline from './pages/EventsStreamline'
import EventsCalendar from './pages/EventsCalendar'
import EventsOverlaps from './pages/EventsOverlaps'
import CreateEvent from './pages/CreateEvent'
import EventDetail from './pages/EventDetail'
import Documentation from './pages/Documentation'
import CatalogTable from './pages/CatalogTable'
import CreateCatalog from './pages/CreateCatalog'
import CatalogDetail from './pages/CatalogDetail'
import CatalogDependencies from './pages/CatalogDependencies'
import VersionCompliance from './pages/VersionCompliance'
import DriftsList from './pages/DriftsList'
import AllDriftsList from './pages/AllDriftsList'
import RpaUsage from './pages/RpaUsage'
import CreateDrift from './pages/CreateDrift'
import CreateRpaOperation from './pages/CreateRpaOperation'
import Locks from './pages/Locks'
import CreateLock from './pages/CreateLock'
import Insights from './pages/Insights'
import ThemeTest from './pages/ThemeTest'

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events/timeline" element={<EventsTimeline />} />
          <Route path="events/streamline" element={<EventsStreamline />} />
          <Route path="events/calendar" element={<EventsCalendar />} />
          <Route path="events/overlaps" element={<EventsOverlaps />} />
          <Route path="events/create" element={<CreateEvent />} />
          <Route path="events/:eventId" element={<EventDetail />} />
          <Route path="docs" element={<Documentation />} />
          <Route path="catalog" element={<CatalogTable />} />
          <Route path="catalog/create" element={<CreateCatalog />} />
          <Route path="catalog/edit/:name" element={<CreateCatalog />} />
          <Route path="catalog/dependencies" element={<CatalogDependencies />} />
          <Route path="catalog/version-compliance" element={<VersionCompliance />} />
          <Route path="catalog/:serviceName" element={<CatalogDetail />} />
          <Route path="catalog/:serviceName/events" element={<CatalogDetail />} />
          <Route path="drifts" element={<DriftsList />} />
          <Route path="drifts/all" element={<AllDriftsList />} />
          <Route path="drifts/create" element={<CreateDrift />} />
          <Route path="rpa" element={<RpaUsage />} />
          <Route path="rpa/create" element={<CreateRpaOperation />} />
          <Route path="locks" element={<Locks />} />
          <Route path="locks/create" element={<CreateLock />} />
          <Route path="insights" element={<Insights />} />
          <Route path="theme-test" element={<ThemeTest />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
