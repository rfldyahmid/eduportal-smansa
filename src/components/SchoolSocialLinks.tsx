import React from 'react';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { DEFAULT_CONTACT_INFO } from '../utils/contactInfoDefaults';

export const WhatsAppMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L3 20l1.2-4.8a8.2 8.2 0 1 1 16-3.5Z" />
    <path d="M8.5 8.4c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4 0 .6l-.5.6c-.2.2-.2.4-.1.6.4.7 1 1.3 1.7 1.7.2.1.4.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.7.8c.2.1.4.2.4.4 0 .2-.1 1-.7 1.4-.5.4-1.1.6-1.8.4-1-.2-2.2-.8-3.3-1.8-1.1-1-1.8-2.2-2-3.1-.2-.8 0-1.5.3-2Z" />
  </svg>
);

const socialLinks = [
  {
    name: 'Instagram',
    urlKey: 'instagramUrl',
    Icon: Instagram,
    iconStyle: 'bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-400 text-white shadow-fuchsia-900/20'
  },
  {
    name: 'Facebook',
    urlKey: 'facebookUrl',
    Icon: Facebook,
    iconStyle: 'bg-blue-600 text-white shadow-blue-900/20'
  },
  {
    name: 'YouTube',
    urlKey: 'youtubeUrl',
    Icon: Youtube,
    iconStyle: 'bg-red-600 text-white shadow-red-900/20'
  }
] as const;

interface SchoolSocialLinksProps {
  className?: string;
  variant?: 'default' | 'footer';
  links?: {
    instagramUrl: string;
    facebookUrl: string;
    youtubeUrl: string;
  };
}

export const SchoolSocialLinks: React.FC<SchoolSocialLinksProps> = ({
  className = '',
  variant = 'default',
  links = DEFAULT_CONTACT_INFO
}) => (
  <div className={`flex flex-wrap items-center gap-3 ${className}`}>
    {socialLinks.map(({ name, urlKey, Icon, iconStyle }) => (
      <a
        key={name}
        href={links[urlKey]}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Kunjungi akun resmi sekolah di ${name}`}
        className={variant === 'footer'
          ? 'group inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400'
          : 'group inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'}
      >
        {variant === 'footer' ? (
          <Icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${name === 'Instagram' ? 'text-fuchsia-400' : name === 'Facebook' ? 'text-blue-400' : 'text-red-400'}`} aria-hidden="true" />
        ) : (
          <span className={`flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-110 ${iconStyle}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <span>{name}</span>
      </a>
    ))}
  </div>
);
