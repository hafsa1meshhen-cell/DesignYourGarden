import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Toaster, Skeleton } from './components/ui'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import PlantLibrary from './pages/PlantLibrary'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import { Login, Signup } from './pages/Auth'
import { RequireAuth } from './context/AuthContext'

const Designer = lazy(() => import('./pages/Designer'))
const Seasonal = lazy(() => import('./pages/Seasonal'))
const BuildPlan = lazy(() => import('./pages/BuildPlan'))

function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[60vh] w-full rounded-3xl" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Suspense fallback={<div className="p-6"><Loading /></div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/gardens" element={<Dashboard />} />
            <Route path="/designer/:id?" element={<Suspense fallback={<Loading />}><Designer /></Suspense>} />
            <Route path="/plants" element={<PlantLibrary />} />
            <Route path="/seasons/:id?" element={<Suspense fallback={<Loading />}><Seasonal /></Suspense>} />
            <Route path="/plan/:id?" element={<Suspense fallback={<Loading />}><BuildPlan /></Suspense>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Navigate to="/gardens" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </>
  )
}
