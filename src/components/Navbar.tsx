import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Features',  href: '#features'  },
  { label: 'Projects',  href: '#projects'  },
  { label: 'Team',      href: '#team'      },
  { label: 'About',     href: '#about'     },
];

export default function Navbar() {
  return (
    <nav className="rh-nav">
      <Link href="/" className="nav-logo">
        Research<sup>hub</sup>
      </Link>
      <ul className="nav-links">
        {NAV_LINKS.map(({ label, href }) => (
          <li key={label}><a href={href}>{label}</a></li>
        ))}
      </ul>
      <Link href="/login" className="nav-join">Sign In →</Link>
    </nav>
  );
}
