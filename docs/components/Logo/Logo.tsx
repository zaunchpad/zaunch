import Image from 'next/image';

export function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="ZAUNCHPAD"
      width={40}
      height={40}
      style={{ objectFit: 'contain' }}
    />
  );
}
