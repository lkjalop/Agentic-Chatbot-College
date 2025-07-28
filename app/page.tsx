import { EAHeader } from './components/ea-header';
import { EAHero } from './components/ea-hero';
import { EAChatAssistant } from './components/ea-chat-assistant';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <EAHeader />
      <EAHero />
      <EAChatAssistant />
    </div>
  );
}