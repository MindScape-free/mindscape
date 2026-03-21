import { LucideProps, ShieldAlert } from 'lucide-react';
import Image from 'next/image';

/**
 * A collection of custom icon components for the application.
 * This object allows for using images or custom SVGs as icons alongside the lucide-react library.
 * @property {function(Omit<LucideProps, 'ref'>): JSX.Element} logo - The application's logo component.
 */
export const Icons = {
  logo: (props: Omit<LucideProps, 'ref'>) => (
    <Image src="/MindScape-Logo.png" alt="MindScape Logo" width={28} height={28} className={props.className} style={props.style} />
  ),
  shield: (props: Omit<LucideProps, 'ref'>) => (
    <ShieldAlert {...props} />
  ),
  export: (props: Omit<LucideProps, 'ref'>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 17V3" />
      <path d="m6 11 6 6 6-6" />
      <path d="M19 21H5" />
    </svg>
  ),
  google: (props: Omit<LucideProps, 'ref'>) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      {...props}
    >
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.053-3.24 2.08-2.16 2.72-5.333 2.72-8.053 0-.8-.08-1.573-.213-2.293h-10.56z" />
    </svg>
  ),
};
