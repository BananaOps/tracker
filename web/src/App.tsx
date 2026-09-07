import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'
import { RequirePermission } from './components/auth/RequirePermission'
import type { Permission } from './types/auth'
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
import RpaUsage from './pages/RpaUsage'
import CreateDrift from './pages/CreateDrift'
import CreateRpaOperation from './pages/CreateRpaOperation'
import Locks from './pages/Locks'
import CreateLock from './pages/CreateLock'
import Insights from './pages/Insights'
import ThemeTest from './pages/ThemeTest'
import Links from './pages/Links'
import Login from './pages/Login'
import ChangePassword from './pages/account/ChangePassword'
import UsersPage from './pages/admin/UsersPage'
import TeamsPage from './pages/admin/TeamsPage'
import ApiKeysPage from './pages/admin/ApiKeysPage'

/** Shorthand: wraps a page element in a permission guard. */
function guard(perm: Permission, element: ReactNode) {
  return <RequirePermission perm={perm}>{element}</RequirePermission>
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={guard('event:read', <Dashboard />)} />
            <Route path="events/timeline" element={guard('event:read', <EventsTimeline />)} />
            <Route path="events/streamline" element={guard('event:read', <EventsStreamline />)} />
            <Route path="events/calendar" element={guard('event:read', <EventsCalendar />)} />
            <Route path="events/overlaps" element={guard('event:read', <EventsOverlaps />)} />
            <Route path="events/create" element={guard('event:write', <CreateEvent />)} />
            <Route path="events/:eventId" element={guard('event:read', <EventDetail />)} />
            <Route path="docs" element={<Documentation />} />
            <Route path="catalog" element={guard('catalog:read', <CatalogTable />)} />
            <Route path="catalog/create" element={guard('catalog:write', <CreateCatalog />)} />
            <Route path="catalog/edit/:name" element={guard('catalog:write', <CreateCatalog />)} />
            <Route path="catalog/dependencies" element={guard('catalog:read', <CatalogDependencies />)} />
            <Route path="catalog/version-compliance" element={guard('catalog:read', <VersionCompliance />)} />
            <Route path="catalog/:serviceName" element={guard('catalog:read', <CatalogDetail />)} />
            <Route path="catalog/:serviceName/events" element={guard('catalog:read', <CatalogDetail />)} />
            <Route path="drifts" element={guard('event:read', <DriftsList />)} />
            <Route path="drifts/all" element={<Navigate to="/drifts" replace />} />
            <Route path="drifts/create" element={guard('event:write', <CreateDrift />)} />
            <Route path="rpa" element={guard('event:read', <RpaUsage />)} />
            <Route path="rpa/create" element={guard('event:write', <CreateRpaOperation />)} />
            <Route path="locks" element={guard('lock:read', <Locks />)} />
            <Route path="locks/create" element={guard('lock:write', <CreateLock />)} />
            <Route path="insights" element={guard('event:read', <Insights />)} />
            <Route path="links" element={guard('links:read', <Links />)} />
            <Route path="theme-test" element={<ThemeTest />} />
            <Route
              path="account/password"
              element={
                <RequirePermission user>
                  <ChangePassword />
                </RequirePermission>
              }
            />
            <Route path="admin/users" element={guard('access:manage', <UsersPage />)} />
            <Route path="admin/teams" element={guard('access:manage', <TeamsPage />)} />
            <Route path="admin/api-keys" element={guard('access:manage', <ApiKeysPage />)} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
