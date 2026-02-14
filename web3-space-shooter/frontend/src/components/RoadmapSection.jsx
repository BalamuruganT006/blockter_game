// src/components/RoadmapSection.jsx
import { useEffect, useRef, useState } from 'react';

const roadmapItems = [
  {
    phase: 'PHASE 1',
    title: 'LAUNCH',
    status: 'completed',
    items: ['Token Launch', 'Game Beta', 'First NFT Drop']
  },
  {
    phase: 'PHASE 2',
    title: 'EXPANSION',
    status: 'active',
    items: ['Mobile Version', 'Tournaments', 'Staking System']
  },
  {
    phase: 'PHASE 3',
    title: 'MULTIVERSE',
    status: 'upcoming',
    items: ['Cross-chain Bridge', 'VR Support', 'DAO Governance']
  },
  {
    phase: 'PHASE 4',
    title: 'METAVERSE',
    status: 'upcoming',
    items: ['3D World', 'Land Ownership', 'Full Economy']
  }
];

export default function RoadmapSection() {
  const [activePhase, setActivePhase] = useState(1);
  const timelineRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2 }
    );

    const items = timelineRef.current?.querySelectorAll('.roadmap-card');
    items?.forEach((item, index) => {
      item.style.transitionDelay = `${index * 0.1}s`;
      observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="roadmap" className="roadmap-section">
      <div className="section-header centered">
        <span className="section-tag">JOURNEY</span>
        <h2 className="section-title">
          ROAD<span className="gradient">MAP</span>
        </h2>
      </div>

      <div className="roadmap-timeline" ref={timelineRef}>
        <div className="timeline-line">
          <div className="line-progress" style={{ width: `${(activePhase + 1) * 25}%` }}></div>
        </div>

        {roadmapItems.map((item, index) => (
          <div
            key={index}
            className={`roadmap-card ${item.status} ${activePhase === index ? 'active' : ''}`}
            onClick={() => setActivePhase(index)}
          >
            <div className="card-marker"></div>
            <div className="card-content">
              <span className="phase-label">{item.phase}</span>
              <h3 className="phase-title">{item.title}</h3>
              <ul className="phase-list">
                {item.items.map((subItem, i) => (
                  <li key={i} className={item.status === 'completed' ? 'checked' : ''}>
                    {item.status === 'completed' ? '✓' : '○'} {subItem}
                  </li>
                ))}
              </ul>
              <div className={`status-badge ${item.status}`}>
                {item.status === 'completed' ? '✓ DONE' : 
                 item.status === 'active' ? '● IN PROGRESS' : '○ UPCOMING'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
