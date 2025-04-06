import './index.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Navbar from './Navbar'


function App() {
  return (
    <Router>
      <Navbar />

      <div className="content">
        <Routes>
          <Route path="/" element={
            <>
              <h1>Boulevard 81</h1>
              <h3>Alcanza tus límites</h3>
            </>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/sobre-nosotros" element={<div>Sobre Nosotros</div>} />
          <Route path="/register" element={<Register />} />
          <Route path="/asociarse" element={<div>Asociarse</div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
