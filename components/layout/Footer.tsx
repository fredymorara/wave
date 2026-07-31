import Link from "next/link";
import { Grid } from 'ldrs/react';
import 'ldrs/react/Grid.css';

export function Footer() {
  return (
    <footer className="bg-void-black py-stack-lg border-t border-outline-variant mt-auto z-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop gap-stack-md">
        <div className="flex items-center gap-2 font-headline-lg text-headline-lg text-neon-crimson italic font-black">
          <Grid size="30" speed="1" color="#FF003C" />
          <span><span className="text-on-surface">WAVE</span>ANIME</span>
        </div>
        <div className="flex flex-wrap justify-center gap-stack-md font-label-md text-label-md uppercase">
          <Link className="text-on-surface-variant hover:text-cyber-cyan transition-opacity duration-200" href="/">Home</Link>
          <Link className="text-on-surface-variant hover:text-cyber-cyan transition-opacity duration-200" href="/schedule">Schedule</Link>
          <a className="text-on-surface-variant hover:text-cyber-cyan transition-opacity duration-200" href="https://flicmovies.me" target="_blank" rel="noopener noreferrer">Movies & TV Shows</a>
          <a className="text-on-surface-variant hover:text-cyber-cyan transition-opacity duration-200" href="https://sports.flicmovies.me" target="_blank" rel="noopener noreferrer">Sports</a>
          <a className="text-on-surface-variant hover:text-cyber-cyan transition-opacity duration-200" href="#">Terms & Privacy</a>
        </div>
        <div className="font-body-md text-body-md text-on-surface-variant text-sm">
          &copy; {new Date().getFullYear()} WAVE ANIME
        </div>
      </div>
    </footer>
  );
}
