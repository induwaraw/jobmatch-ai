import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.jsx'

// Only one route for now, the landing page.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  )
}
