// src/components/FeaturesSection.jsx
import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: '⛓',
    title: 'Blockchain Gaming',
    description: 'Every score verified on Shardeum. True ownership of your achievements.',
    color: '#00f3ff'
  },
  {
    icon: '🎮',
    title: 'Play to Earn',
    description: 'Earn $SPACE tokens for every alien destroyed. Skills pay the bills.',
    color: '#ff0055'
  },
  {
    icon: '🚀',
    title: 'NFT Ships',
    description: 'Collect, upgrade and trade unique spacecraft with real stats.',
    color: '#ffd700'
  },
  {
    icon: '🏆',
    title: 'Live Leaderboard',
    description: 'Compete globally. Top pilots win exclusive rewards weekly.',
    color: '#9d4edd'
  }
];

export default function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = sectionRef.current?.querySelectorAll('.feature-card');
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="features-section" ref={sectionRef}>
      <div className="section-header">
        <span className="section-tag">WHY CHOOSE US</span>
        <h2 className="section-title">
          NEXT GEN <span className="gradient">GAMING</span>
        </h2>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`feature-card ${activeIndex === index ? 'active' : ''}`}
            onMouseEnter={() => setActiveIndex(index)}
            style={{ '--feature-color': feature.color }}
          >
            <div className="card-glow"></div>
            <div className="card-content">
              <span className="feature-icon">{feature.icon}</span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
              <div className="card-number">0{index + 1}</div>
            </div>
            <div className="card-border"></div>
          </div>
        ))}
      </div>

      <div className="features-marquee">
        <div className="marquee-content">
          <span>PLAY</span>
          <span>•</span>
          <span>EARN</span>
          <span>•</span>
          <span>TRADE</span>
          <span>•</span>
          <span>COLLECT</span>
          <span>•</span>
          <span>PLAY</span>
          <span>•</span>
          <span>EARN</span>
          <span>•</span>
          <span>TRADE</span>
          <span>•</span>
          <span>COLLECT</span>
          <span>•</span>
        </div>
      </div>
    </section>
  );
}
