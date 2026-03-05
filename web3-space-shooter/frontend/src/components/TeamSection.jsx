// src/components/TeamSection.jsx

const teamMembers = [
  {
    name: 'Balamurugan T',
    role: 'Game Director & Lead Developer & Blockchain',
    avatar: '👨‍🚀👩‍💻⛓',
    color: '#00f3ff'
  },
  {
    name: 'Akilan',
    role: 'Art Director',
    avatar: '🎨',
    color: '#ff6b6b'
  },
  {
    name: 'Kiruthikkailash',
    role: 'Developer',
    avatar: '💻',
    color: '#4cc9f0'
  },
  {
    name: 'krishnakumar',
    role: 'Developer',
    avatar: '👾',
    color: '#7209b7'
  }
  
];

export default function TeamSection() {
  return (
    <section className="team-section">
      <div className="section-header centered">
        <span className="section-tag">CREATORS</span>
        <h2 className="section-title">
          THE <span className="gradient">TEAM</span>
        </h2>
      </div>

      <div className="team-grid">
        {teamMembers.map((member, index) => (
          <div 
            key={index} 
            className="team-card"
            style={{ '--member-color': member.color }}
          >
            <div className="card-glow"></div>
            <div className="member-avatar">{member.avatar}</div>
            <h3 className="member-name">{member.name}</h3>
            <p className="member-role">{member.role}</p>
            <div className="social-links">
              <a href="#">𝕏</a>
              <a href="#">in</a>
              <a href="#">gh</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
