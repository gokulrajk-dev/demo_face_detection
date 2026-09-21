import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import StudentAttendanceDashboard from './StudentAttendanceDashboard'
import './StudentAttendanceDashboard.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <StudentAttendanceDashboard></StudentAttendanceDashboard>
    </>
  )
}

export default App
