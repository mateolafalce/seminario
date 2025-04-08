import './index.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Navbar from './components/Navbar'
import ReservaTabla from './components/ReservaTabla'

function App() {
  return (
    <Router>
      <Navbar />

      <div className="content">
        <Routes>
          <Route path="/" element={
            <>
              <h1>Boulevard 81</h1>
              <ReservaTabla /> {/* iria aca? nose */}
            </>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/sobre-nosotros" element={<div>Sarasa</div>} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
