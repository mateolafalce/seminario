import './index.css'
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Login from './pages/Login'
import Register from './pages/Register'
import Navbar from './components/Navbar'
import ReservaTabla from './components/ReservaTabla'
import HomePage from './pages/HomePage'
import { AuthProvider } from './components/AuthContext'

function App() {
  return (
   <AuthProvider>
     <Router>
      <Navbar />
      <div className="content">
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path= "/Turnos" element={<ReservaTabla />}/>
        </Routes>
      </div>
    </Router>
   </AuthProvider>
  )
}

export default App
