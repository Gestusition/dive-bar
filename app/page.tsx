'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../src/ui/App'), { ssr: false });

export default function Page() {
  return <App />;
}
