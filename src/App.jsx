import GlobeComponent from './GlobeComponent'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌍 Interactive World Globe</h1>
        <p>Drag to rotate &bull; Scroll to zoom &bull; Hover a country to highlight it</p>
      </header>
      <div className="globe-wrapper">
        <GlobeComponent />
      </div>
    </div>
  )
}

export default App
