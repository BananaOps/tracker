import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy } from 'react'
import Layout from './components/Layout'

// Each page is its own chunk, loaded on first visit (Layout shows a spinner
// meanwhile): the dashboard no longer downloads recharts, reactflow or the
// catalog pages.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EventsTimeline = lazy(() => import('./pages/EventsTimeline'))
const EventsStreamline = lazy(() => import('./pages/EventsStreamline'))
const EventsCalendar = lazy(() => import('./pages/EventsCalendar'))
const EventsOverlaps = lazy(() => import('./pages/EventsOverlaps'))
const CreateEvent = lazy(() => import('./pages/CreateEvent'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const Documentation = lazy(() => import('./pages/Documentation'))
const CatalogTable = lazy(() => import('./pages/CatalogTable'))
const CreateCatalog = lazy(() => import('./pages/CreateCatalog'))
const CatalogDetail = lazy(() => import('./pages/CatalogDetail'))
const CatalogDependencies = lazy(() => import('./pages/CatalogDependencies'))
const VersionCompliance = lazy(() => import('./pages/VersionCompliance'))
const DriftsList = lazy(() => import('./pages/DriftsList'))
const RpaUsage = lazy(() => import('./pages/RpaUsage'))
const CreateDrift = lazy(() => import('./pages/CreateDrift'))
const CreateRpaOperation = lazy(() => import('./pages/CreateRpaOperation'))
const Locks = lazy(() => import('./pages/Locks'))
const CreateLock = lazy(() => import('./pages/CreateLock'))
const Insights = lazy(() => import('./pages/Insights'))
const ThemeTest = lazy(() => import('./pages/ThemeTest'))
const Links = lazy(() => import('./pages/Links'))

function App() {
  return (
    <BrowserRouter>
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
          <Route path="documentation" element={<Documentation />} />
          <Route path="catalog" element={<CatalogTable />} />
          <Route path="catalog/create" element={<CreateCatalog />} />
          <Route path="catalog/edit/:name" element={<CreateCatalog />} />
          <Route path="catalog/dependencies" element={<CatalogDependencies />} />
          <Route path="catalog/version-compliance" element={<VersionCompliance />} />
          <Route path="catalog/:serviceName" element={<CatalogDetail />} />
          <Route path="catalog/:serviceName/events" element={<CatalogDetail />} />
          <Route path="drifts" element={<DriftsList />} />
          <Route path="drifts/all" element={<Navigate to="/drifts" replace />} />
          <Route path="drifts/create" element={<CreateDrift />} />
          <Route path="rpa" element={<RpaUsage />} />
          <Route path="rpa/create" element={<CreateRpaOperation />} />
          <Route path="locks" element={<Locks />} />
          <Route path="locks/create" element={<CreateLock />} />
          <Route path="insights" element={<Insights />} />
          <Route path="links" element={<Links />} />
          <Route path="theme-test" element={<ThemeTest />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
