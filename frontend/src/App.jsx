import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import Projects from './Projects'
import Members from './Members'
import Dividends from './Dividends' // NEW

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/members" element={<Members />} />
        <Route path="/dividends" element={<Dividends />} /> {/* NEW */}
      </Routes>
    </BrowserRouter>
  )
}

export default App