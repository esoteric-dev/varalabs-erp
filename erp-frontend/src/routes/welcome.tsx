import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import '../LandingPage.css'

export const Route = createFileRoute('/welcome')({
  beforeLoad: ({ context }) => {
    // If authenticated, redirect to dashboard
    if (context.authStatus === 'authenticated') {
      throw redirect({ to: '/_authenticated/' })
    }
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="landing-root">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="logo">◈</div>
          Synapse
        </div>
        <div className="navbar-right">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#resources">Resources</a>
          <Link to="/login" className="login-link">Login</Link>
          <Link className="signup" to="/signup">Get Started</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-text">
            <span className="dots">●</span>
            <h1>
              The Future of<br />
              <span className="highlight">School Management</span>
            </h1>
            <span className="dots2">●</span>
            <p>
              Streamline every aspect of your institution with our all-in-one ERP platform.
              From admissions to graduations, we've got you covered.
            </p>
            <form className="hero-form" onSubmit={e => { e.preventDefault(); window.location.href = '/signup'; }}>
              <input type="email" placeholder="Enter your work email" required />
              <button type="submit">Start Free Trial</button>
            </form>
          </div>
          <div className="cards">
            <div className="card">
              <span className="card-dot" style={{background: '#94a3b8'}}></span>
              <span className="card-label">Student Management</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/women/44.jpg')"}}></span>
              <span className="date">Admissions</span>
              <span className="dot"></span>
            </div>
            <div className="card active-card">
              <span className="card-dot" style={{background: '#14b8a6'}}></span>
              <span className="card-label">Fee Collection</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/men/32.jpg')"}}></span>
              <span className="date">Auto-reminders</span>
              <span className="dot" style={{background: '#94a3b8'}}></span>
            </div>
            <div className="card inactive">
              <span className="card-dot" style={{background: '#5eead4'}}></span>
              <span className="card-label">Attendance</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/women/65.jpg')"}}></span>
              <span className="date">Daily reports</span>
              <span className="dot" style={{background: '#f59e0b'}}></span>
            </div>
            <div className="card inactive">
              <span className="card-dot" style={{background: '#f87171'}}></span>
              <span className="card-label">Staff & Payroll</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/men/12.jpg')"}}></span>
              <span className="date">Auto-payslips</span>
              <span className="dot" style={{background: '#5eead4'}}></span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="/hero-illustration.svg" alt="School ERP dashboard" />
        </div>
      </section>

      <section className="info-section">
        <div className="info-block">
          <div className="info-icon">📚</div>
          <div>
            <h3>Streamline School Operations</h3>
            <p>From admissions to graduations, manage every aspect of your institution in one place. Automate routine tasks and focus on what matters most - education.</p>
          </div>
        </div>
        <div className="info-block">
          <div className="info-icon flower">✨</div>
          <div>
            <h3>Built for Modern Schools</h3>
            <p>Intuitive interface, powerful analytics, and seamless communication. Give your staff the tools they need to succeed in the digital age.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
