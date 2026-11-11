import { AppProvider } from './context/AppContext'
import AppShell from './components/AppShell'
import { useApp } from './context/AppContext'

export default function App() {
  return <AppProvider><DatabaseApp /></AppProvider>
}

function DatabaseApp() {
  const { databaseReady, databaseError } = useApp()

  if (!databaseReady) {
    return (
      <main className="database-startup" role="status">
        <img src="/rmjohns-logo.jpg" alt="RMJohns logo" className="brand-logo" />
        {databaseError ? (
          <>
            <h1>Could not connect to the database</h1>
            <p>{databaseError}</p>
            <div className="startup-steps">
              <p><strong>On this device (phone / live site):</strong> The cloud data may not have been synced yet. Open the system on a PC with XAMPP running, go to Settings → Sync to Firebase, then reload this page.</p>
              <p><strong>On a local PC:</strong> Start MySQL in XAMPP, import <code>database/eateries_db.sql</code> in phpMyAdmin, then run <code>npm run dev</code>.</p>
            </div>
            <button className="button button-dark" onClick={() => window.location.reload()}>
              Try again
            </button>
          </>
        ) : (
          <>
            <h1>Loading RMJohn's…</h1>
            <p>Connecting to the cloud database.</p>
          </>
        )}
      </main>
    )
  }

  return <AppShell />
}
