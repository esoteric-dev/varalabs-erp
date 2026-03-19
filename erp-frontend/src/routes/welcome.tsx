import { createFileRoute, Link } from '@tanstack/react-router'
import '../LandingPage.css'

export const Route = createFileRoute('/welcome')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="landing-root">
      <nav className="navbar">
        <div className="navbar-left">
          <span className="logo"></span>
          Synapse
        </div>
        <div className="navbar-right">
          <a href="#">Product</a>
          <a href="#">Download</a>
          <a href="#">Resources</a>
          <a href="#">Enterprise</a>
          <a href="#">Pricing</a>
          <Link to="/login">Login</Link>
          <Link className="signup" to="/signup">Sign up</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-text">
            <span className="dots">●</span>
            <h1>
              All-in-<span className="highlight">one</span>
              <br />workspace
            </h1>
            <span className="dots2">●</span>
            <p>One tool for your whole team. Write, plan, and get organized.</p>
            <form className="hero-form" onSubmit={e => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" required />
              <button type="submit">Get Started</button>
            </form>
          </div>
          <div className="cards">
            <div className="card">
              <span className="card-dot" style={{background: '#94a3b8'}}></span>
              <span className="card-label">Time management</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/women/44.jpg')"}}></span>
              <span className="date">26 Apr</span>
              <span className="dot"></span>
            </div>
            <div className="card active-card">
              <span className="card-dot" style={{background: '#f59e0b'}}></span>
              <span className="card-label">Projects & tasks</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/men/32.jpg')"}}></span>
              <span className="date">27 Apr</span>
              <span className="dot" style={{background: '#94a3b8'}}></span>
            </div>
            <div className="card inactive">
              <span className="card-dot" style={{background: '#6ee7b7'}}></span>
              <span className="card-label">Notes & docs</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/women/65.jpg')"}}></span>
              <span className="date">1 Mar</span>
              <span className="dot" style={{background: '#f59e0b'}}></span>
            </div>
            <div className="card inactive">
              <span className="card-dot" style={{background: '#f87171'}}></span>
              <span className="card-label">Team wiki</span>
              <span className="avatar" style={{backgroundImage: "url('https://randomuser.me/api/portraits/men/12.jpg')"}}></span>
              <span className="date">6 Mar</span>
              <span className="dot" style={{background: '#6ee7b7'}}></span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="/hero-illustration.svg" alt="Workspace illustration" />
        </div>
      </section>

      <section className="info-section">
        <div className="info-block">
          <div className="info-icon">💛</div>
          <div>
            <h3>What you need to be motivated</h3>
            <p>Focusing on a dull task doesn't make it any more attractive. Zooming out and asking yourself why you are bothering in the first place will make it more appealing.</p>
          </div>
        </div>
        <div className="info-block">
          <div className="info-icon flower">🌸</div>
          <div>
            <h3>How Synapse will help you</h3>
            <p>There are many ways you can place small successes earlier on to spur motivation later. Structuring your to-do lists, placing straightforward tasks such as.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
