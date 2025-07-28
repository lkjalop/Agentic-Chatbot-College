'use client';

export function EAHero() {
  return (
    <main className="max-w-7xl mx-auto px-6 pt-16 pb-16">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 
          className="text-5xl md:text-6xl font-bold mb-4 leading-tight"
          style={{ color: 'var(--ea-navy)' }}
        >
          We're here to help you<br />
          see the{' '}
          <span 
            className="underline"
            style={{ 
              color: 'var(--ea-orange)',
              textDecorationColor: 'var(--ea-orange)',
              textUnderlineOffset: '4px'
            }}
          >
            bigger picture.
          </span>
        </h1>
        <p 
          className="text-xl max-w-2xl mx-auto"
          style={{ color: 'var(--ea-text-secondary)' }}
        >
          We help students gain confidence, job-ready skills, and experience needed to secure a successful career straight out of university.
        </p>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div 
          className="p-8 rounded-lg"
          style={{ background: 'var(--ea-gray-light)' }}
        >
          <h3 
            className="mb-3 font-semibold flex items-center gap-2"
            style={{ color: 'var(--ea-orange)' }}
          >
            <span className="text-2xl">✓</span> Confidence
          </h3>
          <p style={{ color: 'var(--ea-text-secondary)' }}>
            Build unshakeable confidence through personalized AI coaching and real-world practice scenarios.
          </p>
        </div>
        
        <div 
          className="p-8 rounded-lg"
          style={{ background: 'var(--ea-gray-light)' }}
        >
          <h3 
            className="mb-3 font-semibold flex items-center gap-2"
            style={{ color: 'var(--ea-orange)' }}
          >
            <span className="text-2xl">✓</span> Job-ready skills
          </h3>
          <p style={{ color: 'var(--ea-text-secondary)' }}>
            Master the skills employers actually want with our industry-aligned curriculum and AI guidance.
          </p>
        </div>
        
        <div 
          className="p-8 rounded-lg"
          style={{ background: 'var(--ea-gray-light)' }}
        >
          <h3 
            className="mb-3 font-semibold flex items-center gap-2"
            style={{ color: 'var(--ea-orange)' }}
          >
            <span className="text-2xl">✓</span> Experience
          </h3>
          <p style={{ color: 'var(--ea-text-secondary)' }}>
            Gain practical experience through simulations, projects, and AI-powered interview practice.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        className="text-center p-12 rounded-xl mb-16"
        style={{ 
          background: 'linear-gradient(135deg, var(--ea-navy) 0%, var(--ea-navy-dark) 100%)',
          color: 'white'
        }}
      >
        <h2 className="text-3xl font-bold mb-8">Proven Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div 
              className="text-4xl font-bold mb-2"
              style={{ color: 'var(--ea-orange)' }}
            >
              89%
            </div>
            <p className="text-lg opacity-90">Job placement rate within 6 months</p>
          </div>
          <div>
            <div 
              className="text-4xl font-bold mb-2"
              style={{ color: 'var(--ea-orange)' }}
            >
              2.3x
            </div>
            <p className="text-lg opacity-90">Average salary increase</p>
          </div>
          <div>
            <div 
              className="text-4xl font-bold mb-2"
              style={{ color: 'var(--ea-orange)' }}
            >
              500+
            </div>
            <p className="text-lg opacity-90">Successful career transitions</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center">
        <h2 
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--ea-navy)' }}
        >
          Ready to start your journey?
        </h2>
        <p 
          className="text-lg mb-8 max-w-xl mx-auto"
          style={{ color: 'var(--ea-text-secondary)' }}
        >
          Join thousands of students who have transformed their careers with our AI-powered career coaching platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            className="px-8 py-4 rounded-lg font-semibold text-white transition-all duration-200 border-none cursor-pointer"
            style={{ background: 'var(--ea-orange)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ea-orange-dark)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--ea-shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--ea-orange)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Start Free Trial
          </button>
          <button 
            className="px-8 py-4 rounded-lg font-semibold transition-all duration-200 cursor-pointer border"
            style={{ 
              borderColor: 'var(--ea-navy)', 
              color: 'var(--ea-navy)',
              background: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ea-navy)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--ea-shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--ea-navy)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Book Consultation
          </button>
        </div>
      </section>
    </main>
  );
}