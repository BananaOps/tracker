import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EventsTimeline from './pages/EventsTimeline'
import EventsCalendar from './pages/EventsCalendar'
import CreateEvent from './pages/CreateEvent'
import CatalogTable from './pages/CatalogTable'
import CreateCatalog from './pages/CreateCatalog'
import DriftsList from './pages/DriftsList'
import RpaUsage from './pages/RpaUsage'
import CreateDrift from './pages/CreateDrift'
import CreateRpaOperation from './pages/CreateRpaOperation'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events/timeline" element={<EventsTimeline />} />
          <Route path="events/calendar" element={<EventsCalendar />} />
          <Route path="events/create" element={<CreateEvent />} />
          <Route path="catalog" element={<CatalogTable />} />
          <Route path="catalog/create" element={<CreateCatalog />} />
          <Route path="drifts" element={<DriftsList />} />
          <Route path="drifts/create" element={<CreateDrift />} />
          <Route path="rpa" element={<RpaUsage />} />
          <Route path="rpa/create" element={<CreateRpaOperation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
